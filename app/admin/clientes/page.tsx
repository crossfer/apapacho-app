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
import { SearchInput } from './search-input'
import { NewClientDialog } from './new-client-dialog'
import type { City } from '@/types/database.types'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const t = await getTranslations('admin.clients')
  const tCities = await getTranslations('cities')
  const q = searchParams.q?.trim()

  const supabase = createClient()

  let query = supabase
    .from('profiles')
    .select('id, full_name, email, phone, created_at')
    .eq('role', 'client')
    .order('created_at', { ascending: false })

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
  }

  const { data: clients } = await query

  const clientIds = (clients ?? []).map((c) => c.id)
  const propertiesByClient = new Map<string, City[]>()

  if (clientIds.length > 0) {
    const { data: properties } = await supabase
      .from('properties')
      .select('client_id, city')
      .in('client_id', clientIds)

    for (const p of properties ?? []) {
      if (!p.client_id) continue
      const list = propertiesByClient.get(p.client_id) ?? []
      if (p.city) list.push(p.city)
      propertiesByClient.set(p.client_id, list)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#6B4A34]">{t('title')}</h1>
        <NewClientDialog />
      </div>

      <SearchInput placeholder={t('searchPlaceholder')} />

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {!clients || clients.length === 0 ? (
          <p className="p-6 text-sm text-[#6B4A34]/60">
            {q ? t('noResults') : t('empty')}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('columns.name')}</TableHead>
                <TableHead>{t('columns.email')}</TableHead>
                <TableHead>{t('columns.phone')}</TableHead>
                <TableHead>{t('columns.city')}</TableHead>
                <TableHead>{t('columns.properties')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => {
                const cities = Array.from(
                  new Set(propertiesByClient.get(client.id) ?? []),
                )
                return (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Link
                        href={`/admin/clientes/${client.id}`}
                        className="font-medium hover:text-[#B83E7A]"
                      >
                        {client.full_name ?? '—'}
                      </Link>
                    </TableCell>
                    <TableCell>{client.email ?? '—'}</TableCell>
                    <TableCell>{client.phone ?? '—'}</TableCell>
                    <TableCell>
                      {cities.length > 0
                        ? cities.map((c) => tCities(c)).join(', ')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {propertiesByClient.get(client.id)?.length ?? 0}
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
