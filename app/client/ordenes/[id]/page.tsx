import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/status-badge'
import { PHOTOS_BUCKET } from '@/lib/constants'
import { formatUSD } from '@/lib/utils'

export const revalidate = 0

export default async function ClientOrderDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const t = await getTranslations('client')
  const tServiceTypes = await getTranslations('serviceTypes')
  const tStatus = await getTranslations('serviceStatus')
  const tCities = await getTranslations('cities')
  const locale = await getLocale()
  const supabase = createClient()

  // RLS ("orders: read") scopes this to the client's own orders — a row
  // that isn't theirs simply won't come back, not an access error.
  // Only the two client-facing cost columns are selected — staff_payment and
  // actual_materials_cost are never sent to the client, not just hidden in
  // the UI.
  const { data: order } = await supabase
    .from('service_orders')
    .select(
      'id, property_id, service_type, status, scheduled_at, notes, client_materials_cost, client_service_cost',
    )
    .eq('id', params.id)
    .single()

  if (!order) notFound()

  const { data: property } = order.property_id
    ? await supabase
        .from('properties')
        .select('id, name, address, city')
        .eq('id', order.property_id)
        .single()
    : { data: null }

  const { data: updates } = await supabase
    .from('service_updates')
    .select(
      'id, staff_id, status, note, timestamp_device, latitude, longitude, location_denied, created_at',
    )
    .eq('order_id', order.id)
    .order('created_at', { ascending: false })

  // profiles RLS scopes reads to your own row or admin — a client session
  // can't look up another user's profile directly. The updates themselves
  // are already authorized via can_access_order(), so resolving staff_id ->
  // full_name here (read-only, display-only) doesn't expose anything the
  // client isn't already allowed to see.
  const updateStaffIds = Array.from(
    new Set((updates ?? []).map((u) => u.staff_id).filter((id): id is string => !!id)),
  )
  let staffById = new Map<string, { id: string; full_name: string | null }>()
  if (updateStaffIds.length > 0) {
    const admin = createServiceRoleClient()
    const { data: staffProfiles } = await admin
      .from('profiles')
      .select('id, full_name')
      .in('id', updateStaffIds)
    staffById = new Map((staffProfiles ?? []).map((s) => [s.id, s]))
  }

  const { data: photos } = await supabase
    .from('service_photos')
    .select('id, storage_path, caption, created_at')
    .eq('order_id', order.id)
    .order('created_at', { ascending: false })

  let signedPhotos: { id: string; url: string | null; caption: string | null }[] = []
  if (photos && photos.length > 0) {
    const paths = photos.map((p) => p.storage_path)
    const { data: signed } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .createSignedUrls(paths, 60 * 60)

    signedPhotos = photos.map((photo, index) => ({
      id: photo.id,
      url: signed?.[index]?.signedUrl ?? null,
      caption: photo.caption,
    }))
  }

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  const cityLabel = property?.city ? `${tCities(property.city)}, CA` : null

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/client/dashboard"
          className="text-sm text-[#6B4A34]/60 hover:text-[#B83E7A]"
        >
          ← {t('detail.back')}
        </Link>
        <div className="mt-2 flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold text-[#6B4A34]">
            {tServiceTypes(order.service_type)}
          </h1>
          <StatusBadge status={order.status} label={tStatus(order.status)} />
        </div>
      </div>

      <div className="grid gap-6 rounded-2xl bg-white p-6 shadow-sm sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-[#6B4A34]/50">
            {t('detail.property')}
          </p>
          <p className="text-sm text-[#6B4A34]">{property?.name ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[#6B4A34]/50">
            {t('detail.address')}
          </p>
          <p className="text-sm text-[#6B4A34]">{property?.address ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[#6B4A34]/50">
            {t('detail.scheduledDate')}
          </p>
          <p className="text-sm text-[#6B4A34]">
            {order.scheduled_at
              ? dateFormatter.format(new Date(order.scheduled_at))
              : '—'}
          </p>
        </div>
        {order.notes && (
          <div className="sm:col-span-2">
            <p className="text-xs uppercase tracking-wide text-[#6B4A34]/50">
              {t('detail.notes')}
            </p>
            <p className="text-sm text-[#6B4A34]">{order.notes}</p>
          </div>
        )}
      </div>

      {(order.client_materials_cost > 0 || order.client_service_cost > 0) && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[#6B4A34]">
            {t('detail.serviceSummary')}
          </h2>
          <div className="flex flex-col gap-2 text-sm text-[#6B4A34]">
            <div className="flex items-center justify-between">
              <span className="text-[#6B4A34]/70">{t('detail.materials')}</span>
              <span>{formatUSD(order.client_materials_cost)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#6B4A34]/70">{t('detail.service')}</span>
              <span>{formatUSD(order.client_service_cost)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-[#B68A4C]/10 pt-2 font-semibold">
              <span>{t('detail.total')}</span>
              <span>
                {formatUSD(order.client_materials_cost + order.client_service_cost)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#6B4A34]">
          {t('detail.updates')}
        </h2>
        {!updates || updates.length === 0 ? (
          <p className="text-sm text-[#6B4A34]/60">{t('detail.noUpdates')}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {updates.map((update) => {
              const staffMember = update.staff_id
                ? staffById.get(update.staff_id)
                : undefined
              const hasLocation =
                !update.location_denied &&
                update.latitude != null &&
                update.longitude != null
              return (
                <li
                  key={update.id}
                  className="border-b border-[#B68A4C]/10 pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[#6B4A34]">
                      {tStatus(update.status)}
                    </span>
                    <span className="text-xs text-[#6B4A34]/50">
                      {dateFormatter.format(
                        new Date(update.timestamp_device ?? update.created_at),
                      )}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#6B4A34]/60">
                    {t('performedBy')} {staffMember?.full_name ?? '—'}
                  </p>
                  {update.note && (
                    <p className="mt-1 text-sm text-[#6B4A34]">{update.note}</p>
                  )}
                  <p className="mt-1 text-xs text-[#6B4A34]/50">
                    {hasLocation
                      ? `${cityLabel ? `${cityLabel} · ` : ''}${update.latitude!.toFixed(5)}, ${update.longitude!.toFixed(5)}`
                      : t('detail.locationUnavailable')}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#6B4A34]">
          {t('detail.photos')}
        </h2>
        {signedPhotos.length === 0 ? (
          <p className="text-sm text-[#6B4A34]/60">{t('detail.noPhotos')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {signedPhotos.map((photo) =>
              photo.url ? (
                <a
                  key={photo.id}
                  href={photo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative block aspect-square overflow-hidden rounded-lg bg-[#E9D8B4]/30"
                >
                  <Image
                    src={photo.url}
                    alt={photo.caption ?? ''}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                </a>
              ) : null,
            )}
          </div>
        )}
      </div>
    </div>
  )
}
