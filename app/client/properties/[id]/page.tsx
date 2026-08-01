import Link from 'next/link'
import { notFound } from 'next/navigation'
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

export default async function ClientPropertyDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const t = await getTranslations('client.properties')
  const tServiceTypes = await getTranslations('serviceTypes')
  const tStatus = await getTranslations('serviceStatus')
  const tCities = await getTranslations('cities')
  const locale = await getLocale()
  const supabase = createClient()

  // RLS ("properties: read") scopes this to the client's own properties —
  // a property that isn't theirs simply won't come back, not an access error.
  const { data: property } = await supabase
    .from('properties')
    .select('id, name, address, city')
    .eq('id', params.id)
    .single()

  if (!property) notFound()

  const { data: orders } = await supabase
    .from('service_orders')
    .select('id, service_type, status, scheduled_at')
    .eq('property_id', property.id)
    .order('scheduled_at', { ascending: false })

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/client/properties"
          className="text-sm text-[#6B4A34]/60 hover:text-[#B83E7A]"
        >
          ← {t('detail.back')}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[#6B4A34]">
          {property.name ?? t('detail.untitled')}
        </h1>
        <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-sm text-[#6B4A34]/70">
          {property.address && <span>{property.address}</span>}
          {property.city && <span>{tCities(property.city)}</span>}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#6B4A34]">{t('detail.orders')}</h2>
        {!orders || orders.length === 0 ? (
          <p className="text-sm text-[#6B4A34]/60">{t('detail.noOrders')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('detail.columns.serviceType')}</TableHead>
                <TableHead>{t('detail.columns.status')}</TableHead>
                <TableHead>{t('detail.columns.scheduledDate')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link
                      href={`/client/orders/${order.id}`}
                      className="font-medium hover:text-[#B83E7A]"
                    >
                      {tServiceTypes(order.service_type)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} label={tStatus(order.status)} />
                  </TableCell>
                  <TableCell>
                    {order.scheduled_at
                      ? dateFormatter.format(new Date(order.scheduled_at))
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
