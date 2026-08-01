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

export const revalidate = 0

export default async function ClientPropertiesPage() {
  const t = await getTranslations('client.properties')
  const tCities = await getTranslations('cities')
  const supabase = createClient()

  // RLS ("properties: read") already scopes this to the current client's
  // own properties via client_id = auth.uid().
  const { data: properties, error } = await supabase
    .from('properties')
    .select('id, name, address, city')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

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

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {!properties || properties.length === 0 ? (
          <p className="p-6 text-sm text-[#6B4A34]/60">{t('empty')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('columns.name')}</TableHead>
                <TableHead>{t('columns.address')}</TableHead>
                <TableHead>{t('columns.city')}</TableHead>
                <TableHead>{t('columns.activeOrders')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((property) => (
                <TableRow key={property.id}>
                  <TableCell>
                    <Link
                      href={`/client/properties/${property.id}`}
                      className="font-medium hover:text-[#B83E7A]"
                    >
                      {property.name ?? '—'}
                    </Link>
                  </TableCell>
                  <TableCell>{property.address ?? '—'}</TableCell>
                  <TableCell>{property.city ? tCities(property.city) : '—'}</TableCell>
                  <TableCell>{activeCountByProperty.get(property.id) ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
