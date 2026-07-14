'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(['in_progress', 'completed']),
  notes: z.string().trim().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  locationAccuracy: z.number().optional(),
  locationDenied: z.boolean(),
  photoStoragePaths: z.array(z.string()).default([]),
})

/**
 * Inserts the service_updates row, links any already-uploaded photos to it,
 * and moves service_orders.status to match. GPS capture and the Storage
 * upload itself happen client-side (see update-status-dialog.tsx) — this
 * only persists what's already been captured/uploaded.
 *
 * No app-level admin-style guard here: RLS already enforces the boundary —
 * "updates: staff/admin insert" requires is_order_staff(order_id), and
 * "orders: staff update assigned" requires staff_id = auth.uid() — so a
 * staff member calling this for an order that isn't theirs simply gets an
 * RLS-violation error back, not silent success.
 */
export async function createUpdateAction(input: z.infer<typeof schema>) {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Datos inválidos.' }
  }
  const {
    orderId,
    status,
    notes,
    latitude,
    longitude,
    locationAccuracy,
    locationDenied,
    photoStoragePaths,
  } = parsed.data

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado.' }
  }

  const { data: update, error: updateInsertError } = await supabase
    .from('service_updates')
    .insert({
      order_id: orderId,
      staff_id: user.id,
      status,
      note: notes || null,
      timestamp_device: new Date().toISOString(),
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      location_accuracy: locationAccuracy ?? null,
      location_denied: locationDenied,
    })
    .select('id')
    .single()

  if (updateInsertError || !update) {
    return { error: 'No se pudo guardar la actualización.' }
  }

  if (photoStoragePaths.length > 0) {
    const { error: photosError } = await supabase.from('service_photos').insert(
      photoStoragePaths.map((path) => ({
        order_id: orderId,
        update_id: update.id,
        storage_path: path,
      })),
    )

    if (photosError) {
      return { error: 'Actualización guardada, pero no se pudieron vincular las fotos.' }
    }
  }

  const { error: statusError } = await supabase
    .from('service_orders')
    .update({ status })
    .eq('id', orderId)

  if (statusError) {
    return { error: 'Actualización guardada, pero no se pudo cambiar el estatus de la orden.' }
  }

  revalidatePath(`/staff/ordenes/${orderId}`)
  revalidatePath('/staff/dashboard')
  return {}
}
