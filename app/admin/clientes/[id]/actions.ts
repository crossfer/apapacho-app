'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/require-admin'

const schema = z.object({
  clientId: z.string().uuid(),
  name: z.string().trim().min(1),
  address: z.string().trim().optional(),
  city: z.enum(['San Diego', 'Los Angeles']),
})

export async function createPropertyAction(input: z.infer<typeof schema>) {
  await requireAdmin()

  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Datos inválidos.' }
  }
  const { clientId, name, address, city } = parsed.data

  const supabase = createClient()
  const { error } = await supabase.from('properties').insert({
    client_id: clientId,
    name,
    address: address || null,
    city,
  })

  if (error) {
    return { error: 'No se pudo crear la propiedad.' }
  }

  revalidatePath(`/admin/clientes/${clientId}`)
  return {}
}

const updateSchema = z.object({
  propertyId: z.string().uuid(),
  clientId: z.string().uuid(),
  name: z.string().trim().min(1),
  address: z.string().trim().optional(),
  city: z.enum(['San Diego', 'Los Angeles']),
})

export async function updatePropertyAction(input: z.infer<typeof updateSchema>) {
  await requireAdmin()

  const parsed = updateSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Datos inválidos.' }
  }
  const { propertyId, clientId, name, address, city } = parsed.data

  const supabase = createClient()
  const { error } = await supabase
    .from('properties')
    .update({ name, address: address || null, city })
    .eq('id', propertyId)

  if (error) {
    return { error: 'No se pudo actualizar la propiedad.' }
  }

  revalidatePath(`/admin/clientes/${clientId}`)
  return {}
}
