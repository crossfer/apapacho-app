'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export function SignOutButton({
  className,
  children,
  'aria-label': ariaLabel,
}: {
  className?: string
  children?: React.ReactNode
  'aria-label'?: string
}) {
  const router = useRouter()
  const t = useTranslations('common')

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={cn(className)}
      aria-label={ariaLabel}
    >
      {children ?? t('signOut')}
    </button>
  )
}
