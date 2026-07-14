import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/status-badge'

export const revalidate = 0

export default async function StaffDashboardPage() {
  const t = await getTranslations('staff')
  const tServiceTypes = await getTranslations('serviceTypes')
  const tStatus = await getTranslations('serviceStatus')
  const locale = await getLocale()
  const supabase = createClient()

  // RLS ("orders: read") already scopes this to staff_id = auth.uid() — no
  // manual filter needed here.
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
    ? await supabase.from('properties').select('id, address, client_id').in('id', propertyIds)
    : { data: [] }
  const propertyById = new Map((properties ?? []).map((p) => [p.id, p]))

  // profiles RLS scopes reads to your own row or admin — staff can't read a
  // client's profile row directly. Read-only, display-only name lookup for
  // properties staff are already authorized to see via their assigned order.
  const clientIds = Array.from(
    new Set((properties ?? []).map((p) => p.client_id).filter((id): id is string => !!id)),
  )
  let clientById = new Map<string, { id: string; full_name: string | null }>()
  if (clientIds.length > 0) {
    const admin = createServiceRoleClient()
    const { data: clientProfiles } = await admin
      .from('profiles')
      .select('id, full_name')
      .in('id', clientIds)
    clientById = new Map((clientProfiles ?? []).map((c) => [c.id, c]))
  }

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-[#6B4A34]">{t('myOrdersToday')}</h1>

      {!orders || orders.length === 0 ? (
        <p className="text-sm text-[#6B4A34]/60">{t('empty')}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => {
            const property = order.property_id
              ? propertyById.get(order.property_id)
              : undefined
            const client = property?.client_id
              ? clientById.get(property.client_id)
              : undefined
            return (
              <Link
                key={order.id}
                href={`/staff/ordenes/${order.id}`}
                className="flex flex-col gap-2 rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-base font-semibold text-[#6B4A34]">
                    {tServiceTypes(order.service_type)}
                  </h2>
                  <StatusBadge status={order.status} label={tStatus(order.status)} />
                </div>
                <p className="text-sm text-[#6B4A34]/70">{property?.address ?? '—'}</p>
                <p className="text-sm text-[#6B4A34]/70">{client?.full_name ?? '—'}</p>
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
