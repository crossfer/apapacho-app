'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Select } from '@/components/ui/select'
import { SERVICE_STATUSES } from '@/lib/constants'
import { updateOrderStatusAction } from '../actions'
import type { ServiceStatus } from '@/types/database.types'

export function StatusSelect({
  orderId,
  initialStatus,
}: {
  orderId: string
  initialStatus: ServiceStatus
}) {
  const tStatus = useTranslations('serviceStatus')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const status = e.target.value as ServiceStatus
    setError(null)
    startTransition(async () => {
      const result = await updateOrderStatusAction({ orderId, status })
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-1">
      <Select
        defaultValue={initialStatus}
        onChange={onChange}
        disabled={isPending}
        className="max-w-xs bg-white"
      >
        {SERVICE_STATUSES.map((status) => (
          <option key={status} value={status}>
            {tStatus(status)}
          </option>
        ))}
      </Select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
