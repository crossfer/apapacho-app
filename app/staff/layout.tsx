import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { APP_NAME } from '@/lib/constants'
import { SignOutButton } from '@/components/sign-out-button'

// Staff work from their phones in the field: mobile-first, single-column,
// large touch targets.
export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tCommon = await getTranslations('common')

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-[#E9D8B4]/30">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-[#4F6D5A] px-4 py-3 text-white">
        <span className="font-semibold text-[#B68A4C]">{APP_NAME}</span>
        <SignOutButton
          aria-label={tCommon('signOut')}
          className="rounded-md p-2 text-white/70 transition hover:bg-white/10"
        >
          <LogOut size={18} />
        </SignOutButton>
      </header>
      <main className="min-w-0 flex-1 p-4">{children}</main>
    </div>
  )
}
