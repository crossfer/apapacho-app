import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROLE_HOME } from '@/lib/constants'
import type { UserRole } from '@/types/database.types'

// Root entry: route the visitor to their role home, or to login.
export default async function RootPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as UserRole | undefined
  redirect(role ? ROLE_HOME[role] : '/login')
}
