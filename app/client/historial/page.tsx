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
import { StatusBadge } from '@/components/status-badge'

export const revalidate = 0

export default async function ClientHistorialPage() {
  const t = await getTranslations('client')
  const tServiceTypes = await getTranslations('serviceTypes')
  const tStatus = await getTranslations('serviceStatus')
  const locale = await getLocale()
  const supabase = createClient()

  const { data: orders, error } = await supabase
    .from('service_orders')
    .select('id, property_id, service_type, status, scheduled_at, completed_at')
    .in('status', ['completed', 'cancelled'])
    .order('created_at', { ascending: false })

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
      <h1 className="text-2xl font-semibold text-[#6B4A34]">{t('history')}</h1>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {!orders || orders.length === 0 ? (
          <p className="p-6 text-sm text-[#6B4A34]/60">{t('historyEmpty')}</p>
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
              {orders.map((order) => {
                const property = order.property_id
                  ? propertyById.get(order.property_id)
                  : undefined
                const date = order.completed_at ?? order.scheduled_at
                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        href={`/client/ordenes/${order.id}`}
                        className="font-medium hover:text-[#B83E7A]"
                      >
                        {tServiceTypes(order.service_type)}
                      </Link>
                    </TableCell>
                    <TableCell>{property?.name ?? '—'}</TableCell>
                    <TableCell>
                      {date ? dateFormatter.format(new Date(date)) : '—'}
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
