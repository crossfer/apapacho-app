import Link from 'next/link'
import { notFound } from 'next/navigation'
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
import { AddPropertyDialog } from './add-property-dialog'
import { EditPropertyDialog } from './edit-property-dialog'

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const t = await getTranslations('admin.clients.detail')
  const tCities = await getTranslations('cities')
  const supabase = createClient()

  const { data: client } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, created_at')
    .eq('id', params.id)
    .eq('role', 'client')
    .single()

  if (!client) notFound()

  const { data: properties } = await supabase
    .from('properties')
    .select('id, name, address, city')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/admin/clientes"
          className="text-sm text-[#6B4A34]/60 hover:text-[#B83E7A]"
        >
          ← {t('back')}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[#6B4A34]">
          {client.full_name ?? client.email}
        </h1>
        <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-sm text-[#6B4A34]/70">
          {client.email && <span>{client.email}</span>}
          {client.phone && <span>{client.phone}</span>}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#6B4A34]">
            {t('properties')}
          </h2>
          <AddPropertyDialog clientId={client.id} />
        </div>

        {!properties || properties.length === 0 ? (
          <p className="text-sm text-[#6B4A34]/60">{t('noProperties')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('columns.name')}</TableHead>
                <TableHead>{t('columns.address')}</TableHead>
                <TableHead>{t('columns.city')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((property) => (
                <TableRow key={property.id}>
                  <TableCell>{property.name ?? '—'}</TableCell>
                  <TableCell>{property.address ?? '—'}</TableCell>
                  <TableCell>
                    {property.city ? tCities(property.city) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <EditPropertyDialog
                      clientId={client.id}
                      propertyId={property.id}
                      initialName={property.name}
                      initialAddress={property.address}
                      initialCity={property.city}
                    />
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
