import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { SearchInput } from '../clientes/search-input'

export const revalidate = 0

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const t = await getTranslations('admin.properties')
  const tCities = await getTranslations('cities')
  const q = searchParams.q?.trim()
  const supabase = createClient()

  let query = supabase
    .from('properties')
    .select('id, name, address, city, client_id, created_at')
    .order('created_at', { ascending: false })

  if (q) {
    query = query.or(`name.ilike.%${q}%,address.ilike.%${q}%`)
  }

  const { data: properties, error } = await query
  if (error) {
    throw new Error(error.message)
  }

  const clientIds = Array.from(
    new Set((properties ?? []).map((p) => p.client_id).filter((id): id is string => !!id)),
  )
  const { data: clients } = clientIds.length
    ? await supabase.from('profiles').select('id, full_name, email').in('id', clientIds)
    : { data: [] }
  const clientById = new Map((clients ?? []).map((c) => [c.id, c]))

  const propertyIds = (properties ?? []).map((p) => p.id)
  const { data: orders } = propertyIds.length
    ? await supabase
        .from('service_orders')
        .select('property_id, status')
        .in('property_id', propertyIds)
        .in('status', ['scheduled', 'in_progress'])
    : { data: [] }
  const activeCountByProperty = new Map<string, number>()
  for (const o of orders ?? []) {
    if (!o.property_id) continue
    activeCountByProperty.set(o.property_id, (activeCountByProperty.get(o.property_id) ?? 0) + 1)
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-[#6B4A34]">{t('title')}</h1>

      <SearchInput placeholder={t('searchPlaceholder')} />

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {!properties || properties.length === 0 ? (
          <p className="p-6 text-sm text-[#6B4A34]/60">
            {q ? t('noResults') : t('empty')}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('columns.name')}</TableHead>
                <TableHead>{t('columns.address')}</TableHead>
                <TableHead>{t('columns.city')}</TableHead>
                <TableHead>{t('columns.client')}</TableHead>
                <TableHead>{t('columns.activeOrders')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((property) => {
                const client = property.client_id
                  ? clientById.get(property.client_id)
                  : undefined
                return (
                  <TableRow key={property.id}>
                    <TableCell>
                      <Link
                        href={`/admin/propiedades/${property.id}`}
                        className="font-medium hover:text-[#B83E7A]"
                      >
                        {property.name ?? '—'}
                      </Link>
                    </TableCell>
                    <TableCell>{property.address ?? '—'}</TableCell>
                    <TableCell>
                      {property.city ? tCities(property.city) : '—'}
                    </TableCell>
                    <TableCell>{client?.full_name ?? client?.email ?? '—'}</TableCell>
                    <TableCell>{activeCountByProperty.get(property.id) ?? 0}</TableCell>
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
