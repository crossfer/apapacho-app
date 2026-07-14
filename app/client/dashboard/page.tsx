import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/status-badge'

export const revalidate = 0

export default async function ClientDashboardPage() {
  const t = await getTranslations('client')
  const tServiceTypes = await getTranslations('serviceTypes')
  const tStatus = await getTranslations('serviceStatus')
  const locale = await getLocale()
  const supabase = createClient()

  // RLS ("orders: read") already scopes this to the current client's own
  // orders via property_id -> properties.client_id = auth.uid() — no manual
  // client_id filter needed here.
  const { data: orders, error } = await supabase
    .from('service_orders')
    .select('id, property_id, service_type, status, scheduled_at')
    .in('status', ['scheduled', 'in_progress'])
    .order('scheduled_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const propertyIds = Array.from(
    new Set((orders ?? []).map((o) => o.property_id).filter((id): id is string => !!id)),
  )
  const { data: properties } = propertyIds.length
    ? await supabase.from('properties').select('id, name').in('id', propertyIds)
    : { data: [] }
  const propertyById = new Map((properties ?? []).map((p) => [p.id, p]))

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-[#6B4A34]">
        {t('activeServices')}
      </h1>

      {!orders || orders.length === 0 ? (
        <p className="text-sm text-[#6B4A34]/60">{t('empty')}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => {
            const property = order.property_id
              ? propertyById.get(order.property_id)
              : undefined
            return (
              <Link
                key={order.id}
                href={`/client/ordenes/${order.id}`}
                className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-base font-semibold text-[#6B4A34]">
                    {tServiceTypes(order.service_type)}
                  </h2>
                  <StatusBadge status={order.status} label={tStatus(order.status)} />
                </div>
                <p className="text-sm text-[#6B4A34]/70">{property?.name ?? '—'}</p>
                <p className="text-xs text-[#6B4A34]/50">
                  {order.scheduled_at
                    ? dateFormatter.format(new Date(order.scheduled_at))
                    : '—'}
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
