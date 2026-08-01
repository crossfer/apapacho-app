import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/stat-card'
import { StatusBadge } from '@/components/status-badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { formatCompactDate } from '@/lib/utils'

export const revalidate = 0

export default async function ClientDashboardPage() {
  const t = await getTranslations('client.dashboard')
  const tServiceTypes = await getTranslations('serviceTypes')
  const tStatus = await getTranslations('serviceStatus')
  const locale = await getLocale()
  const supabase = createClient()

  // RLS ("orders: read" / "properties: read") already scopes every query
  // below to the current client's own rows — no manual client_id filter
  // needed here.
  const [activeOrdersResult, completedOrdersResult, propertiesResult, upcomingResult] =
    await Promise.all([
      supabase
        .from('service_orders')
        .select('id', { count: 'exact', head: true })
        .in('status', ['scheduled', 'in_progress']),
      supabase
        .from('service_orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed'),
      supabase.from('properties').select('id', { count: 'exact', head: true }),
      supabase
        .from('service_orders')
        .select('id, property_id, service_type, status, scheduled_at')
        .in('status', ['scheduled', 'in_progress'])
        .order('scheduled_at', { ascending: true })
        .limit(3),
    ])

  for (const result of [
    activeOrdersResult,
    completedOrdersResult,
    propertiesResult,
    upcomingResult,
  ]) {
    if (result.error) {
      throw new Error(result.error.message)
    }
  }

  const { count: activeOrdersCount } = activeOrdersResult
  const { count: completedOrdersCount } = completedOrdersResult
  const { count: propertiesCount } = propertiesResult
  const { data: upcomingOrders } = upcomingResult

  const propertyIds = Array.from(
    new Set((upcomingOrders ?? []).map((o) => o.property_id).filter((id): id is string => !!id)),
  )
  const { data: properties } = propertyIds.length
    ? await supabase.from('properties').select('id, name').in('id', propertyIds)
    : { data: [] }
  const propertyById = new Map((properties ?? []).map((p) => [p.id, p]))

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold text-[#6B4A34]">{t('title')}</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t('activeOrders')} value={String(activeOrdersCount ?? 0)} />
        <StatCard label={t('completedOrders')} value={String(completedOrdersCount ?? 0)} />
        <StatCard label={t('propertiesRegistered')} value={String(propertiesCount ?? 0)} />
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#6B4A34]">{t('upcomingServices')}</h2>
        {!upcomingOrders || upcomingOrders.length === 0 ? (
          <p className="text-sm text-[#6B4A34]/60">{t('noUpcoming')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('columns.serviceType')}</TableHead>
                <TableHead>{t('columns.property')}</TableHead>
                <TableHead>{t('columns.date')}</TableHead>
                <TableHead>{t('columns.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingOrders.map((order) => {
                const property = order.property_id
                  ? propertyById.get(order.property_id)
                  : undefined
                return (
                  <TableRow key={order.id}>
                    <TableCell className="max-w-[120px] truncate">
                      <Link
                        href={`/client/orders/${order.id}`}
                        className="font-medium hover:text-[#B83E7A]"
                      >
                        {tServiceTypes(order.service_type)}
                      </Link>
                    </TableCell>
                    <TableCell>{property?.name ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {order.scheduled_at
                        ? formatCompactDate(order.scheduled_at, locale)
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} label={tStatus(order.status)} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
