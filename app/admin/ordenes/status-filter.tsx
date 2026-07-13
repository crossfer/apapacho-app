'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Select } from '@/components/ui/select'
import { SERVICE_STATUSES } from '@/lib/constants'

export function StatusFilter() {
  const t = useTranslations('admin.orders')
  const tStatus = useTranslations('serviceStatus')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set('status', value)
    else params.delete('status')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Select
      defaultValue={searchParams.get('status') ?? ''}
      onChange={onChange}
      className="max-w-xs bg-white"
    >
      <option value="">{t('filterAll')}</option>
      {SERVICE_STATUSES.map((status) => (
        <option key={status} value={status}>
          {tStatus(status)}
        </option>
      ))}
    </Select>
  )
}
