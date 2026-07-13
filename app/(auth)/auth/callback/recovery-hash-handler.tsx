'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { ROLE_HOME } from '@/lib/constants'
import type { UserRole } from '@/types/database.types'

/**
 * Implicit-flow fallback: password recovery links carry
 * #access_token=...&refresh_token=...&type=recovery in the URL hash, which
 * never reaches the server (the browser strips it before the HTTP request is
 * sent). This runs client-side to read it and establish the session.
 */
export function RecoveryHashHandler() {
  const t = useTranslations('common')
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function handle() {
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash
      const params = new URLSearchParams(hash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const type = params.get('type')

      if (!accessToken || !refreshToken) {
        router.replace('/login?error=auth')
        return
      }

      const supabase = createClient()
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (sessionError) {
        setError(sessionError.message)
        return
      }

      if (type === 'recovery') {
        router.replace('/update-password')
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const role = profile?.role as UserRole | undefined
      router.replace(role ? ROLE_HOME[role] : '/login')
    }

    handle()
  }, [router])

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-[#E9D8B4] border-t-[#B83E7A]"
        role="status"
        aria-label={t('loading')}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
