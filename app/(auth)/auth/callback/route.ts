import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ROLE_HOME } from '@/lib/constants'
import type { UserRole } from '@/types/database.types'

// Exchanges the auth `code` for a session cookie, then branches by `type`:
// password recovery links go to /update-password to set a new one; every
// other type (signup confirmation, invite, magic link) falls through to the
// user's role dashboard. Note: this only sees query params, not a URL hash —
// Supabase's PKCE flow (what this app's clients use) puts `code`/`type` in
// the query string, but an implicit-flow link (#access_token=...&type=...)
// would never reach the server at all and needs a client-side handler
// instead.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  const supabase = createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/update-password`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as UserRole | undefined
  return NextResponse.redirect(`${origin}${role ? ROLE_HOME[role] : '/login'}`)
}
