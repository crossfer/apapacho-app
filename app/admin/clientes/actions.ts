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

const updateSchema = schema.extend({
  clientId: z.string().uuid(),
  propertyId: z.string().uuid().nullable().optional(),
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

export async function updateClientAction(input: z.infer<typeof updateSchema>) {
  await requireAdmin()

  const parsed = updateSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Datos inválidos.' }
  }
  const { clientId, propertyId, fullName, email, phone, city } = parsed.data

  const admin = createServiceRoleClient()

  const { error: authError } = await admin.auth.admin.updateUserById(clientId, {
    email,
    user_metadata: { role: 'client', full_name: fullName },
  })

  if (authError) {
    return { error: authError.message }
  }

  const { error: profileError } = await admin
    .from('profiles')
    .update({
      full_name: fullName,
      email,
      phone: phone || null,
    })
    .eq('id', clientId)
    .eq('role', 'client')

  if (profileError) {
    return { error: 'No se pudo actualizar el cliente.' }
  }

  if (propertyId) {
    const { error: propertyError } = await admin
      .from('properties')
      .update({ city })
      .eq('id', propertyId)
      .eq('client_id', clientId)

    if (propertyError) {
      return { error: 'Cliente actualizado, pero no se pudo actualizar la ciudad.' }
    }
  } else {
    const { error: propertyError } = await admin
      .from('properties')
      .insert({ client_id: clientId, city })

    if (propertyError) {
      return { error: 'Cliente actualizado, pero no se pudo crear la propiedad inicial.' }
    }
  }

  revalidatePath('/admin/clientes')
  revalidatePath(`/admin/clientes/${clientId}`)
  return {}
}
