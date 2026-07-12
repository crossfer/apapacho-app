'use client'

import { useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'

export function SearchInput({ placeholder }: { placeholder: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const timer = useRef<ReturnType<typeof setTimeout>>()

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set('q', value)
      else params.delete('q')
      router.push(`${pathname}?${params.toString()}`)
    }, 300)
  }

  return (
    <Input
      type="search"
      defaultValue={searchParams.get('q') ?? ''}
      onChange={onChange}
      placeholder={placeholder}
      className="max-w-sm bg-white"
    />
  )
}
