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
import { NewOrderDialog } from '../../ordenes/new-order-dialog'

export const revalidate = 0

export default async function PropertyDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const t = await getTranslations('admin.properties')
  const tServiceTypes = await getTranslations('serviceTypes')
  const tStatus = await getTranslations('serviceStatus')
  const tCities = await getTranslations('cities')
  const locale = await getLocale()
  const supabase = createClient()

  const { data: property } = await supabase
    .from('properties')
    .select('id, name, address, city, client_id')
    .eq('id', params.id)
    .single()

  if (!property) notFound()

  const { data: client } = property.client_id
    ? await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', property.client_id)
        .single()
    : { data: null }

  const { data: orders } = await supabase
    .from('service_orders')
    .select('id, service_type, status, scheduled_at, staff_id')
    .eq('property_id', property.id)
    .order('scheduled_at', { ascending: false })

  const staffIds = Array.from(
    new Set((orders ?? []).map((o) => o.staff_id).filter((id): id is string => !!id)),
  )
  const { data: staffProfiles } = staffIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', staffIds)
    : { data: [] }
  const staffById = new Map((staffProfiles ?? []).map((s) => [s.id, s]))

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
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/admin/propiedades"
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
          {client && <span>{client.full_name ?? client.email}</span>}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#6B4A34]">{t('detail.orders')}</h2>
          <NewOrderDialog
            clients={
              client
                ? [{ id: client.id, full_name: client.full_name, email: client.email }]
                : []
            }
            properties={[
              { id: property.id, name: property.name, client_id: property.client_id },
            ]}
            staff={allStaff ?? []}
            defaultClientId={property.client_id ?? undefined}
            defaultPropertyId={property.id}
          />
        </div>

        {!orders || orders.length === 0 ? (
          <p className="text-sm text-[#6B4A34]/60">{t('detail.noOrders')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('detail.columns.serviceType')}</TableHead>
                <TableHead>{t('detail.columns.status')}</TableHead>
                <TableHead>{t('detail.columns.scheduledDate')}</TableHead>
                <TableHead>{t('detail.columns.assignedStaff')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
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
