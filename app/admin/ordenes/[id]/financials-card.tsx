'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatUSD } from '@/lib/utils'
import { updateOrderPricingAction } from '../actions'

export function FinancialsCard({
  orderId,
  initialClientMaterialsCost,
  initialClientServiceCost,
  initialStaffPayment,
  initialActualMaterialsCost,
}: {
  orderId: string
  initialClientMaterialsCost: number
  initialClientServiceCost: number
  initialStaffPayment: number
  initialActualMaterialsCost: number
}) {
  const t = useTranslations('admin.orders.detail.financials')
  const router = useRouter()
  const [clientMaterialsCost, setClientMaterialsCost] = useState(
    String(initialClientMaterialsCost),
  )
  const [clientServiceCost, setClientServiceCost] = useState(String(initialClientServiceCost))
  const [staffPayment, setStaffPayment] = useState(String(initialStaffPayment))
  const [actualMaterialsCost, setActualMaterialsCost] = useState(
    String(initialActualMaterialsCost),
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const totalCharged = (Number(clientMaterialsCost) || 0) + (Number(clientServiceCost) || 0)
  const totalExpenses = (Number(staffPayment) || 0) + (Number(actualMaterialsCost) || 0)
  const netProfit = totalCharged - totalExpenses

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    setIsSubmitting(true)

    const result = await updateOrderPricingAction({
      orderId,
      clientMaterialsCost: Number(clientMaterialsCost) || 0,
      clientServiceCost: Number(clientServiceCost) || 0,
      staffPayment: Number(staffPayment) || 0,
      actualMaterialsCost: Number(actualMaterialsCost) || 0,
    })

    setIsSubmitting(false)
    if (result?.error) {
      setError(result.error)
      return
    }
    setSaved(true)
    router.refresh()
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-[#6B4A34]">{t('title')}</h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#6B4A34]">
              {t('clientMaterialsCost')}
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={clientMaterialsCost}
              onChange={(e) => setClientMaterialsCost(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#6B4A34]">
              {t('clientServiceCost')}
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={clientServiceCost}
              onChange={(e) => setClientServiceCost(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#6B4A34]">
              {t('staffPayment')}
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={staffPayment}
              onChange={(e) => setStaffPayment(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#6B4A34]">
              {t('actualMaterialsCost')}
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={actualMaterialsCost}
              onChange={(e) => setActualMaterialsCost(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-3 rounded-xl bg-[#E9D8B4]/20 p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#6B4A34]/50">
              {t('totalCharged')}
            </p>
            <p className="text-sm font-semibold text-[#6B4A34]">
              {formatUSD(totalCharged)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[#6B4A34]/50">
              {t('totalExpenses')}
            </p>
            <p className="text-sm font-semibold text-[#6B4A34]">
              {formatUSD(totalExpenses)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[#6B4A34]/50">
              {t('netProfit')}
            </p>
            <p
              className={`text-sm font-semibold ${netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}
            >
              {formatUSD(netProfit)}
            </p>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && !error && (
          <p className="text-sm text-[#4F6D5A]">{t('saved')}</p>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#B83E7A] text-white hover:bg-[#B83E7A]/90"
          >
            {isSubmitting ? t('saving') : t('save')}
          </Button>
        </div>
      </form>
    </div>
  )
}
