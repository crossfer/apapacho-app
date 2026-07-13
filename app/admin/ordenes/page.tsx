import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { StatusFilter } from './status-filter'
import { NewOrderDialog } from './new-order-dialog'
import { SERVICE_STATUSES } from '@/lib/constants'
import type { ServiceStatus } from '@/types/database.types'

export const revalidate = 0

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const t = await getTranslations('admin.orders')
  const tServiceTypes = await getTranslations('serviceTypes')
  const tStatus = await getTranslations('serviceStatus')
  const locale = await getLocale()
  const rawStatus = searchParams.status?.trim()
  const status = SERVICE_STATUSES.find((s) => s === rawStatus) as
    | ServiceStatus
    | undefined

  const supabase = createClient()

  let query = supabase
    .from('service_orders')
    .select('id, property_id, staff_id, service_type, status, scheduled_at, created_at')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data: orders, error } = await query
  if (error) {
    throw new Error(error.message)
  }

  const propertyIds = Array.from(
    new Set((orders ?? []).map((o) => o.property_id).filter((id): id is string => !!id)),
  )
  const staffIdsFromOrders = Array.from(
    new Set((orders ?? []).map((o) => o.staff_id).filter((id): id is string => !!id)),
  )

  const { data: properties } = propertyIds.length
    ? await supabase.from('properties').select('id, name, client_id').in('id', propertyIds)
    : { data: [] }

  const clientIds = Array.from(
    new Set((properties ?? []).map((p) => p.client_id).filter((id): id is string => !!id)),
  )

  const { data: clientProfiles } = clientIds.length
    ? await supabase.from('profiles').select('id, full_name, email').in('id', clientIds)
    : { data: [] }

  const { data: staffProfiles } = staffIdsFromOrders.length
    ? await supabase.from('profiles').select('id, full_name').in('id', staffIdsFromOrders)
    : { data: [] }

  const propertyById = new Map((properties ?? []).map((p) => [p.id, p]))
  const clientById = new Map((clientProfiles ?? []).map((c) => [c.id, c]))
  const staffById = new Map((staffProfiles ?? []).map((s) => [s.id, s]))

  // Full lists for the New Order dialog — independent of the current filter/results.
  const { data: allClients } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'client')
    .order('full_name', { ascending: true })

  const { data: allProperties } = await supabase
    .from('properties')
    .select('id, name, client_id')
    .order('name', { ascending: true })

  const { data: allStaff } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'staff')
    .order('full_name', { ascending: true })

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#6B4A34]">{t('title')}</h1>
        <NewOrderDialog
          clients={allClients ?? []}
          properties={allProperties ?? []}
          staff={allStaff ?? []}
        />
      </div>

      <StatusFilter />

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {!orders || orders.length === 0 ? (
          <p className="p-6 text-sm text-[#6B4A34]/60">
            {status ? t('noResults') : t('empty')}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('columns.client')}</TableHead>
                <TableHead>{t('columns.property')}</TableHead>
                <TableHead>{t('columns.serviceType')}</TableHead>
                <TableHead>{t('columns.status')}</TableHead>
                <TableHead>{t('columns.scheduledDate')}</TableHead>
                <TableHead>{t('columns.assignedStaff')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const property = order.property_id
                  ? propertyById.get(order.property_id)
                  : undefined
                const client = property?.client_id
                  ? clientById.get(property.client_id)
                  : undefined
                const staffMember = order.staff_id
                  ? staffById.get(order.staff_id)
                  : undefined
                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        href={`/admin/ordenes/${order.id}`}
                        className="font-medium hover:text-[#B83E7A]"
                      >
                        {client?.full_name ?? client?.email ?? '—'}
                      </Link>
                    </TableCell>
                    <TableCell>{property?.name ?? '—'}</TableCell>
                    <TableCell>{tServiceTypes(order.service_type)}</TableCell>
                    <TableCell>{tStatus(order.status)}</TableCell>
                    <TableCell>
                      {order.scheduled_at
                        ? dateFormatter.format(new Date(order.scheduled_at))
                        : '—'}
                    </TableCell>
                    <TableCell>{staffMember?.full_name ?? '—'}</TableCell>
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
