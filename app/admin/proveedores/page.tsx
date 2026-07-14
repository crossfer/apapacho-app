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
import { NewProviderDialog } from './new-provider-dialog'

export const revalidate = 0

export default async function ProvidersPage() {
  const t = await getTranslations('admin.providers')
  const tServiceTypes = await getTranslations('serviceTypes')
  const supabase = createClient()

  const { data: providers, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, created_at')
    .eq('role', 'staff')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const providerIds = (providers ?? []).map((p) => p.id)

  const { data: vendors } = providerIds.length
    ? await supabase
        .from('vendors')
        .select('profile_id, specialties')
        .in('profile_id', providerIds)
    : { data: [] }
  const vendorByProfile = new Map((vendors ?? []).map((v) => [v.profile_id, v]))

  const { data: orders } = providerIds.length
    ? await supabase
        .from('service_orders')
        .select('staff_id, status')
        .in('staff_id', providerIds)
        .in('status', ['scheduled', 'in_progress'])
    : { data: [] }

  const activeCountByStaff = new Map<string, number>()
  for (const o of orders ?? []) {
    if (!o.staff_id) continue
    activeCountByStaff.set(o.staff_id, (activeCountByStaff.get(o.staff_id) ?? 0) + 1)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#6B4A34]">{t('title')}</h1>
        <NewProviderDialog />
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {!providers || providers.length === 0 ? (
          <p className="p-6 text-sm text-[#6B4A34]/60">{t('empty')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('columns.name')}</TableHead>
                <TableHead>{t('columns.email')}</TableHead>
                <TableHead>{t('columns.phone')}</TableHead>
                <TableHead>{t('columns.specialty')}</TableHead>
                <TableHead>{t('columns.activeOrders')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map((provider) => {
                const vendor = vendorByProfile.get(provider.id)
                const specialty = vendor?.specialties?.[0]
                return (
                  <TableRow key={provider.id}>
                    <TableCell>
                      <Link
                        href={`/admin/proveedores/${provider.id}`}
                        className="font-medium hover:text-[#B83E7A]"
                      >
                        {provider.full_name ?? '—'}
                      </Link>
                    </TableCell>
                    <TableCell>{provider.email ?? '—'}</TableCell>
                    <TableCell>{provider.phone ?? '—'}</TableCell>
                    <TableCell>
                      {specialty ? tServiceTypes(specialty) : '—'}
                    </TableCell>
                    <TableCell>{activeCountByStaff.get(provider.id) ?? 0}</TableCell>
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
