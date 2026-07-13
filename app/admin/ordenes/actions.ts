'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/require-admin'
import { SERVICE_STATUSES, SERVICE_TYPES } from '@/lib/constants'
import type { ServiceStatus, ServiceType } from '@/types/database.types'

const createSchema = z.object({
  propertyId: z.string().uuid(),
  serviceType: z.enum(SERVICE_TYPES as [ServiceType, ...ServiceType[]]),
  scheduledAt: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  staffId: z.string().uuid().optional(),
})

export async function createOrderAction(input: z.infer<typeof createSchema>) {
  await requireAdmin()

  const parsed = createSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Datos inválidos.' }
  }
  const { propertyId, serviceType, scheduledAt, notes, staffId } = parsed.data

  const supabase = createClient()
  const { error } = await supabase.from('service_orders').insert({
    property_id: propertyId,
    service_type: serviceType,
    scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
    notes: notes || null,
    staff_id: staffId || null,
  })

  if (error) {
    return { error: 'No se pudo crear la orden.' }
  }

  revalidatePath('/admin/ordenes')
  return {}
}

const updateStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(SERVICE_STATUSES as [ServiceStatus, ...ServiceStatus[]]),
})

export async function updateOrderStatusAction(
  input: z.infer<typeof updateStatusSchema>,
) {
  await requireAdmin()

  const parsed = updateStatusSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Datos inválidos.' }
  }
  const { orderId, status } = parsed.data

  const supabase = createClient()
  const { error } = await supabase
    .from('service_orders')
    .update({ status })
    .eq('id', orderId)

  if (error) {
    return { error: 'No se pudo actualizar el estatus.' }
  }

  revalidatePath(`/admin/ordenes/${orderId}`)
  revalidatePath('/admin/ordenes')
  return {}
}
