'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/require-admin'

const schema = z.object({
  fullName: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().optional(),
  city: z.enum(['San Diego', 'Los Angeles']),
})

export async function createClientAction(input: z.infer<typeof schema>) {
  await requireAdmin()

  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Datos inválidos.' }
  }
  const { fullName, email, phone, city } = parsed.data

  const admin = createServiceRoleClient()

  // Creates the auth.users row (handle_new_user trigger inserts the matching
  // profiles row with role='client') and sends Supabase's invite email so the
  // client can set their own password.
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role: 'client', full_name: fullName },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback?next=/client/dashboard`,
  })

  if (error || !data.user) {
    return { error: error?.message ?? 'No se pudo invitar al cliente.' }
  }

  const userId = data.user.id

  if (phone) {
    await admin.from('profiles').update({ phone }).eq('id', userId)
  }

  // Every client needs at least one property to attach service orders to;
  // seed one in the city they were registered under. Name/address are left
  // for the admin to fill in from the client detail page.
  const { error: propertyError } = await admin
    .from('properties')
    .insert({ client_id: userId, city })

  if (propertyError) {
    return {
      error: 'Cliente creado, pero no se pudo crear la propiedad inicial.',
    }
  }

  revalidatePath('/admin/clientes')
  return {}
}
