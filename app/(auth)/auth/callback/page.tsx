import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROLE_HOME } from '@/lib/constants'
import type { UserRole } from '@/types/database.types'
import { RecoveryHashHandler } from './recovery-hash-handler'

// Next.js won't allow a route.ts and a page.tsx in the same segment (build
// error: "two parallel pages that resolve to the same path"), so both auth
// redirect flows live here instead of split across two files:
//   - PKCE flow (invite emails, etc.): Supabase redirects here with `code`
//     (and `type`) as query params, visible server-side — handled directly
//     in this Server Component, exactly like the route handler this replaced.
//   - Implicit flow (password recovery emails): tokens arrive in the URL
//     hash, which never reaches the server. When there's no `code`, we fall
//     through to a Client Component that reads window.location.hash instead.
export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: { code?: string; type?: string }
}) {
  const { code, type } = searchParams

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      redirect('/login?error=auth')
    }

    if (type === 'recovery') {
      redirect('/update-password')
    }

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

  return <RecoveryHashHandler />
}
