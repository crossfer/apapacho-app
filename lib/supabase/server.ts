// -----------------------------------------------------------------------------
// Supabase server client (cookie-based).
// Use in Server Components, Server Actions and Route Handlers.
// -----------------------------------------------------------------------------

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if middleware refreshes user sessions.
          }
        },
      },
    },
  )
}

/**
 * Privileged client using the service-role key. Bypasses RLS.
 * Use ONLY in trusted server-side code (e.g. admin actions, webhooks).
 */
export function createServiceRoleClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // no-op: service-role client is stateless
        },
      },
    },
  )
}
