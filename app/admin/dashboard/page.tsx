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
import { formatUSD } from '@/lib/utils'
import { getTodayRange, getMonthRange } from '@/lib/timezone'

export const revalidate = 0

export default async function AdminDashboardPage() {
  const t = await getTranslations('admin.dashboard')
  const tServiceTypes = await getTranslations('serviceTypes')
  const tStatus = await getTranslations('serviceStatus')
  const locale = await getLocale()
  const supabase = createClient()

  const { start: todayStart, end: todayEnd } = getTodayRange()
  const { start: monthStart, end: monthEnd } = getMonthRange()

  const [
    { count: activeOrdersTodayCount },
    { count: completedThisMonthCount },
    { count: totalClientsCount },
    { data: completedThisMonthOrders },
    { data: todaysOrders },
    { data: recentUpdates },
  ] = await Promise.all([
    supabase
      .from('service_orders')
      .select('id', { count: 'exact', head: true })
      .gte('scheduled_at', todayStart.toISOString())
      .lt('scheduled_at', todayEnd.toISOString())
      .in('status', ['scheduled', 'in_progress']),
    supabase
      .from('service_orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('completed_at', monthStart.toISOString())
      .lt('completed_at', monthEnd.toISOString()),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'client'),
    // Same query covers both the "Revenue this month" top stat and the
    // Financials section — "completed" is used as the realization event for
    // both revenue and expenses, scoped by completed_at rather than
    // scheduled_at, since a rescheduled order shouldn't count in the wrong month.
    supabase
      .from('service_orders')
      .select('client_materials_cost, client_service_cost, staff_payment, actual_materials_cost')
      .eq('status', 'completed')
      .gte('completed_at', monthStart.toISOString())
      .lt('completed_at', monthEnd.toISOString()),
    supabase
      .from('service_orders')
      .select('id, service_type, status, scheduled_at, property_id, staff_id')
      .gte('scheduled_at', todayStart.toISOString())
      .lt('scheduled_at', todayEnd.toISOString())
      .order('scheduled_at', { ascending: true }),
    supabase
      .from('service_updates')
      .select('id, order_id, staff_id, status, created_at, timestamp_device')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const revenueThisMonth = (completedThisMonthOrders ?? []).reduce(
    (sum, o) => sum + o.client_materials_cost + o.client_service_cost,
    0,
  )
  const expensesThisMonth = (completedThisMonthOrders ?? []).reduce(
    (sum, o) => sum + o.staff_payment + o.actual_materials_cost,
    0,
  )
  const netProfitThisMonth = revenueThisMonth - expensesThisMonth

  // Today's schedule: batch-fetch property + staff names.
  const schedulePropertyIds = Array.from(
    new Set((todaysOrders ?? []).map((o) => o.property_id).filter((id): id is string => !!id)),
  )
  const scheduleStaffIds = Array.from(
    new Set((todaysOrders ?? []).map((o) => o.staff_id).filter((id): id is string => !!id)),
  )
  const { data: scheduleProperties } = schedulePropertyIds.length
    ? await supabase.from('properties').select('id, name').in('id', schedulePropertyIds)
    : { data: [] }
  const { data: scheduleStaff } = scheduleStaffIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', scheduleStaffIds)
    : { data: [] }
  const schedulePropertyById = new Map((scheduleProperties ?? []).map((p) => [p.id, p]))
  const scheduleStaffById = new Map((scheduleStaff ?? []).map((s) => [s.id, s]))

  // Recent activity: each update -> its order -> the order's property, plus
  // the staff who made the update.
  const activityOrderIds = Array.from(
    new Set((recentUpdates ?? []).map((u) => u.order_id).filter((id): id is string => !!id)),
  )
  const { data: activityOrders } = activityOrderIds.length
    ? await supabase.from('service_orders').select('id, property_id').in('id', activityOrderIds)
    : { data: [] }
  const activityOrderById = new Map((activityOrders ?? []).map((o) => [o.id, o]))

  const activityPropertyIds = Array.from(
    new Set((activityOrders ?? []).map((o) => o.property_id).filter((id): id is string => !!id)),
  )
  const { data: activityProperties } = activityPropertyIds.length
    ? await supabase.from('properties').select('id, name').in('id', activityPropertyIds)
    : { data: [] }
  const activityPropertyById = new Map((activityProperties ?? []).map((p) => [p.id, p]))

  const activityStaffIds = Array.from(
    new Set((recentUpdates ?? []).map((u) => u.staff_id).filter((id): id is string => !!id)),
  )
  const { data: activityStaff } = activityStaffIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', activityStaffIds)
    : { data: [] }
  const activityStaffById = new Map((activityStaff ?? []).map((s) => [s.id, s]))

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  const timeFormatter = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold text-[#6B4A34]">{t('title')}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('activeOrdersToday')} value={String(activeOrdersTodayCount ?? 0)} />
        <StatCard
          label={t('completedThisMonth')}
          value={String(completedThisMonthCount ?? 0)}
        />
        <StatCard label={t('totalClients')} value={String(totalClientsCount ?? 0)} />
        <StatCard label={t('revenueThisMonth')} value={formatUSD(revenueThisMonth)} />
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#6B4A34]">{t('todaysSchedule')}</h2>
        {!todaysOrders || todaysOrders.length === 0 ? (
          <p className="text-sm text-[#6B4A34]/60">{t('noOrdersToday')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('scheduleColumns.time')}</TableHead>
                <TableHead>{t('scheduleColumns.property')}</TableHead>
                <TableHead>{t('scheduleColumns.serviceType')}</TableHead>
                <TableHead>{t('scheduleColumns.staff')}</TableHead>
                <TableHead>{t('scheduleColumns.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {todaysOrders.map((order) => {
                const property = order.property_id
                  ? schedulePropertyById.get(order.property_id)
                  : undefined
                const staffMember = order.staff_id
                  ? scheduleStaffById.get(order.staff_id)
                  : undefined
                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      {order.scheduled_at
                        ? timeFormatter.format(new Date(order.scheduled_at))
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/ordenes/${order.id}`}
                        className="font-medium hover:text-[#B83E7A]"
                      >
                        {property?.name ?? '—'}
                      </Link>
                    </TableCell>
                    <TableCell>{tServiceTypes(order.service_type)}</TableCell>
                    <TableCell>{staffMember?.full_name ?? t('unassigned')}</TableCell>
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

      <div>
        <h2 className="mb-4 text-lg font-semibold text-[#6B4A34]">
          {t('financialsThisMonth')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label={t('revenue')} value={formatUSD(revenueThisMonth)} tone="positive" />
          <StatCard label={t('expenses')} value={formatUSD(expensesThisMonth)} tone="negative" />
          <StatCard
            label={t('netProfit')}
            value={formatUSD(netProfitThisMonth)}
            tone={netProfitThisMonth >= 0 ? 'positive' : 'negative'}
          />
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#6B4A34]">{t('recentActivity')}</h2>
        {!recentUpdates || recentUpdates.length === 0 ? (
          <p className="text-sm text-[#6B4A34]/60">{t('noActivity')}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {recentUpdates.map((update) => {
              const staffMember = update.staff_id
                ? activityStaffById.get(update.staff_id)
                : undefined
              const order = update.order_id ? activityOrderById.get(update.order_id) : undefined
              const property = order?.property_id
                ? activityPropertyById.get(order.property_id)
                : undefined
              return (
                <li
                  key={update.id}
                  className="flex items-center justify-between gap-4 border-b border-[#B68A4C]/10 pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium text-[#6B4A34]">
                      {staffMember?.full_name ?? '—'}
                      <span className="font-normal text-[#6B4A34]/60">
                        {' '}
                        · {property?.name ?? '—'}
                      </span>
                    </p>
                    <p className="text-xs text-[#6B4A34]/50">
                      {dateFormatter.format(
                        new Date(update.timestamp_device ?? update.created_at),
                      )}
                    </p>
                  </div>
                  <StatusBadge status={update.status} label={tStatus(update.status)} />
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
