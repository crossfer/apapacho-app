import { createClient } from '@/lib/supabase/server'

/**
 * Defense-in-depth guard for Server Actions that perform privileged writes
 * (e.g. inviting users, bypassing RLS via the service-role client). The
 * middleware already keeps non-admins out of /admin/*, but a Server Action
 * is its own endpoint and should not trust that alone.
 */
export async function requireAdmin() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado.')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('No autorizado.')

  return user
}
