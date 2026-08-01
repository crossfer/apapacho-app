import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { LayoutDashboard, CalendarDays, Users, Wrench, ClipboardList, Home } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { APP_NAME } from '@/lib/constants'
import { SignOutButton } from '@/components/sign-out-button'
import { MobileTabBar } from '@/components/mobile-tab-bar'

const NAV = [
  { href: '/admin/dashboard', key: 'dashboard', icon: <LayoutDashboard size={24} /> },
  { href: '/admin/calendario', key: 'calendar', icon: <CalendarDays size={24} /> },
  { href: '/admin/clientes', key: 'clients', icon: <Users size={24} /> },
  { href: '/admin/proveedores', key: 'providers', icon: <Wrench size={24} /> },
  { href: '/admin/ordenes', key: 'orders', icon: <ClipboardList size={24} /> },
  { href: '/admin/propiedades', key: 'properties', icon: <Home size={24} /> },
] as const

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Defense-in-depth: middleware already gates this, but never render admin
  // chrome without a verified admin session.
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const t = await getTranslations('admin.nav')

  return (
    <div className="flex min-h-screen bg-[#E9D8B4]/30">
      <aside className="hidden w-64 shrink-0 flex-col bg-[#4F6D5A] p-4 text-white lg:flex">
        <div className="mb-8 px-2 text-lg font-semibold text-[#B68A4C]">
          {APP_NAME}
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>
        <SignOutButton className="mt-4 rounded-md px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10" />
      </aside>
      <main className="flex-1 p-6 pb-24 lg:pb-6">{children}</main>
      <MobileTabBar
        items={NAV.map((item) => ({ href: item.href, label: t(item.key), icon: item.icon }))}
      />
    </div>
  )
}
