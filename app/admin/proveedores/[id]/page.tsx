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
import { formatCompactDate } from '@/lib/utils'

export const revalidate = 0

export default async function ProviderDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const t = await getTranslations('admin.providers')
  const tServiceTypes = await getTranslations('serviceTypes')
  const tStatus = await getTranslations('serviceStatus')
  const locale = await getLocale()
  const supabase = createClient()

  const { data: provider } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone')
    .eq('id', params.id)
    .eq('role', 'staff')
    .single()

  if (!provider) notFound()

  const { data: vendor } = await supabase
    .from('vendors')
    .select('specialties')
    .eq('profile_id', provider.id)
    .single()

  const { data: orders } = await supabase
    .from('service_orders')
    .select('id, service_type, status, scheduled_at')
    .eq('staff_id', provider.id)
    .order('scheduled_at', { ascending: false })

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/admin/proveedores"
          className="text-sm text-[#6B4A34]/60 hover:text-[#B83E7A]"
        >
          ← {t('detail.back')}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[#6B4A34]">
          {provider.full_name ?? provider.email}
        </h1>
        <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-sm text-[#6B4A34]/70">
          {provider.email && <span>{provider.email}</span>}
          {provider.phone && <span>{provider.phone}</span>}
          {vendor?.specialties?.[0] && (
            <span>{tServiceTypes(vendor.specialties[0])}</span>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#6B4A34]">
          {t('detail.orders')}
        </h2>
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
                  <TableCell className="max-w-[120px] truncate">
                    <Link
                      href={`/admin/ordenes/${order.id}`}
                      className="font-medium hover:text-[#B83E7A]"
                    >
                      {tServiceTypes(order.service_type)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} label={tStatus(order.status)} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {order.scheduled_at
                      ? formatCompactDate(order.scheduled_at, locale)
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
