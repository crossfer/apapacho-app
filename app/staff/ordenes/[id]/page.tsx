import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/status-badge'
import { PHOTOS_BUCKET } from '@/lib/constants'
import { UpdateStatusDialog } from './update-status-dialog'

export const revalidate = 0

export default async function StaffOrderDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const t = await getTranslations('staff')
  const tServiceTypes = await getTranslations('serviceTypes')
  const tStatus = await getTranslations('serviceStatus')
  const locale = await getLocale()
  const supabase = createClient()

  // RLS ("orders: read") scopes this to staff_id = auth.uid() — an order
  // that isn't theirs simply won't come back, not an access error.
  const { data: order } = await supabase
    .from('service_orders')
    .select('id, property_id, service_type, status, scheduled_at, notes')
    .eq('id', params.id)
    .single()

  if (!order) notFound()

  // properties: "Staff can view assigned properties" (0005) covers this.
  const { data: property } = order.property_id
    ? await supabase
        .from('properties')
        .select('id, name, address, client_id')
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

  // "Jul 13, 2026 · 10:34 AM" — built from separate date/time formatters
  // (rather than dateStyle+timeStyle's built-in comma) so the middle-dot
  // separator is exact, while staying locale-aware per-part.
  const updateDateFormatter = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const updateTimeFormatter = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  function formatUpdateTimestamp(date: Date) {
    return `${updateDateFormatter.format(date)} · ${updateTimeFormatter.format(date)}`
  }

  function formatCoordinate(value: number, positive: string, negative: string) {
    return `${Math.abs(value).toFixed(4)}° ${value >= 0 ? positive : negative}`
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/staff/dashboard"
          className="text-sm text-[#6B4A34]/60 hover:text-[#B83E7A]"
        >
          ← {t('detail.back')}
        </Link>
        <div className="mt-2 flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-[#6B4A34]">
            {tServiceTypes(order.service_type)}
          </h1>
          <StatusBadge status={order.status} label={tStatus(order.status)} />
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm">
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
          <div>
            <p className="text-xs uppercase tracking-wide text-[#6B4A34]/50">
              {t('detail.notes')}
            </p>
            <p className="text-sm text-[#6B4A34]">{order.notes}</p>
          </div>
        )}
      </div>

      <UpdateStatusDialog orderId={order.id} />

      <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-[#6B4A34]">{t('detail.updates')}</h2>
        {!updates || updates.length === 0 ? (
          <p className="text-sm text-[#6B4A34]/60">{t('detail.noUpdates')}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {updates.map((update) => {
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
                      {formatUpdateTimestamp(
                        new Date(update.timestamp_device ?? update.created_at),
                      )}
                    </span>
                  </div>
                  {update.note && (
                    <p className="mt-1 text-sm text-[#6B4A34]">{update.note}</p>
                  )}
                  <p className="mt-1 text-xs text-[#6B4A34]/50">
                    {hasLocation ? (
                      <a
                        href={`https://maps.google.com/?q=${update.latitude},${update.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-[#B83E7A] hover:underline"
                      >
                        📍 {formatCoordinate(update.latitude!, 'N', 'S')},{' '}
                        {formatCoordinate(update.longitude!, 'E', 'W')}
                      </a>
                    ) : (
                      <span>📍 {t('detail.locationUnavailable')}</span>
                    )}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-[#6B4A34]">{t('detail.photos')}</h2>
        {signedPhotos.length === 0 ? (
          <p className="text-sm text-[#6B4A34]/60">{t('detail.noPhotos')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {signedPhotos.map((photo) =>
              photo.url ? (
                <a
                  key={photo.id}
                  href={photo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="relative block aspect-square overflow-hidden rounded-lg bg-[#E9D8B4]/30"
                >
                  <Image
                    src={photo.url}
                    alt={photo.caption ?? ''}
                    fill
                    sizes="(max-width: 480px) 50vw, 33vw"
                    className="object-cover"
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
