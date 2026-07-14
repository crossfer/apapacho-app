import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { APP_NAME } from '@/lib/constants'
import { SignOutButton } from '@/components/sign-out-button'

// Premium, clean client experience. No back-office elements.
export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const t = await getTranslations('client')

  return (
    <div className="min-h-screen bg-[#E9D8B4]/20">
      <header className="border-b border-[#B68A4C]/20 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/client/dashboard"
            className="text-lg font-semibold tracking-tight text-[#6B4A34]"
          >
            {APP_NAME}
          </Link>
          <nav className="flex items-center gap-6 text-sm text-[#6B4A34]">
            <Link href="/client/dashboard" className="hover:text-[#B83E7A]">
              {t('activeServices')}
            </Link>
            <Link href="/client/historial" className="hover:text-[#B83E7A]">
              {t('history')}
            </Link>
            <SignOutButton className="text-[#6B4A34]/70 hover:text-[#B83E7A]" />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  )
}
