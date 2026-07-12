// -----------------------------------------------------------------------------
// Supabase session refresh + role-based route protection.
//
// Called from the root middleware.ts. It:
//   1. Refreshes the auth session cookie on every request.
//   2. Redirects unauthenticated users to /login.
//   3. Enforces role boundaries: /admin → admin, /staff → staff, /client → client.
// -----------------------------------------------------------------------------

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database, UserRole } from '@/types/database.types'
import { ROLE_HOME } from '@/lib/constants'

/** Route prefix → role allowed to access it. */
const PROTECTED_PREFIXES: Record<string, UserRole> = {
  '/admin': 'admin',
  '/staff': 'staff',
  '/client': 'client',
}

const AUTH_ROUTES = ['/login', '/forgot-password']

function requiredRoleFor(pathname: string): UserRole | null {
  for (const [prefix, role] of Object.entries(PROTECTED_PREFIXES)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return role
    }
  }
  return null
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANT: do not run code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const requiredRole = requiredRoleFor(pathname)
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r))

  // Unauthenticated: block protected areas, allow auth + public routes.
  if (!user) {
    if (requiredRole) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirectedFrom', pathname)
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Authenticated: resolve their role from the profiles table.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as UserRole | undefined

  // Signed-in users shouldn't sit on auth pages — send them to their home.
  if (isAuthRoute && role) {
    const url = request.nextUrl.clone()
    url.pathname = ROLE_HOME[role]
    return NextResponse.redirect(url)
  }

  // Enforce role boundaries on protected areas.
  if (requiredRole && role !== requiredRole) {
    const url = request.nextUrl.clone()
    // Send them to their own area (or login if role is unknown).
    url.pathname = role ? ROLE_HOME[role] : '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
