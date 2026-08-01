'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface MobileTabBarItem {
  href: string
  label: string
  icon: ReactNode
}

// Replaces the desktop sidebar below `lg`. Bar background mirrors the
// sidebar's Verde Agave chrome; the active tab inverts to a white chip so its
// icon reads in Verde Agave, inactive tabs stay plain white.
export function MobileTabBar({ items }: { items: MobileTabBarItem[] }) {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex h-16 min-h-16 border-t border-black/10 bg-[#4F6D5A] pb-[env(safe-area-inset-bottom)] lg:hidden">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2"
          >
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full transition',
                active ? 'bg-white text-[#4F6D5A]' : 'text-white/80',
              )}
            >
              {item.icon}
            </span>
            <span
              className={cn(
                'w-full truncate px-0.5 text-center text-xs font-medium leading-none',
                active ? 'text-white' : 'text-white/70',
              )}
            >
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
