'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/require-admin'
import { SERVICE_TYPES } from '@/lib/constants'
import type { ServiceType } from '@/types/database.types'

const schema = z.object({
  fullName: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().optional(),
  specialty: z.enum(SERVICE_TYPES as [ServiceType, ...ServiceType[]]),
})

export async function createProviderAction(input: z.infer<typeof schema>) {
  await requireAdmin()

  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Datos inválidos.' }
  }
  const { fullName, email, phone, specialty } = parsed.data

  const admin = createServiceRoleClient()

  // Same invite pattern as createClientAction: role/full_name go through
  // user_metadata, which handle_new_user picks up when it creates the
  // profiles row — no separate "update role" step needed.
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role: 'staff', full_name: fullName },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback?next=/staff/dashboard`,
  })

  if (error || !data.user) {
    return { error: error?.message ?? 'No se pudo invitar al proveedor.' }
  }

  const userId = data.user.id

  if (phone) {
    await admin.from('profiles').update({ phone }).eq('id', userId)
  }

  const { error: vendorError } = await admin.from('vendors').insert({
    profile_id: userId,
    specialties: [specialty],
    staff_type: 'internal',
  })

  if (vendorError) {
    return {
      error: 'Proveedor creado, pero no se pudo guardar la especialidad.',
    }
  }

  revalidatePath('/admin/proveedores')
  return {}
}
