import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { StatusSelect } from './status-select'
import { PHOTOS_BUCKET } from '@/lib/constants'

export const revalidate = 0

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const t = await getTranslations('admin.orders.detail')
  const tServiceTypes = await getTranslations('serviceTypes')
  const tStatus = await getTranslations('serviceStatus')
  const locale = await getLocale()
  const supabase = createClient()

  const { data: order } = await supabase
    .from('service_orders')
    .select(
      'id, property_id, staff_id, service_type, status, scheduled_at, notes, created_at',
    )
    .eq('id', params.id)
    .single()

  if (!order) notFound()

  const { data: property } = order.property_id
    ? await supabase
        .from('properties')
        .select('id, name, address, city, client_id')
        .eq('id', order.property_id)
        .single()
    : { data: null }

  const { data: client } = property?.client_id
    ? await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .eq('id', property.client_id)
        .single()
    : { data: null }

  const { data: assignedStaff } = order.staff_id
    ? await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', order.staff_id)
        .single()
    : { data: null }

  const { data: updates } = await supabase
    .from('service_updates')
    .select(
      'id, staff_id, status, note, timestamp_device, latitude, longitude, location_denied, created_at',
    )
    .eq('order_id', order.id)
    .order('created_at', { ascending: false })

  const updateStaffIds = Array.from(
    new Set((updates ?? []).map((u) => u.staff_id).filter((id): id is string => !!id)),
  )
  const { data: updateStaffProfiles } = updateStaffIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', updateStaffIds)
    : { data: [] }
  const updateStaffById = new Map((updateStaffProfiles ?? []).map((s) => [s.id, s]))

  const { data: photos } = await supabase
    .from('service_photos')
    .select('id, storage_path, caption, created_at')
    .eq('order_id', order.id)
    .order('created_at', { ascending: false })

  let signedPhotos: {
    id: string
    url: string | null
    caption: string | null
  }[] = []

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

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/admin/ordenes"
          className="text-sm text-[#6B4A34]/60 hover:text-[#B83E7A]"
        >
          ← {t('back')}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[#6B4A34]">
          {tServiceTypes(order.service_type)}
        </h1>
      </div>

      <div className="grid gap-6 rounded-2xl bg-white p-6 shadow-sm sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-[#6B4A34]/50">
            {t('client')}
          </p>
          <p className="text-sm text-[#6B4A34]">
            {client?.full_name ?? client?.email ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[#6B4A34]/50">
            {t('property')}
          </p>
          <p className="text-sm text-[#6B4A34]">
            {property?.name ?? '—'}
            {property?.address ? ` · ${property.address}` : ''}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[#6B4A34]/50">
            {t('serviceType')}
          </p>
          <p className="text-sm text-[#6B4A34]">{tServiceTypes(order.service_type)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[#6B4A34]/50">
            {t('scheduledDate')}
          </p>
          <p className="text-sm text-[#6B4A34]">
            {order.scheduled_at
              ? dateFormatter.format(new Date(order.scheduled_at))
              : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[#6B4A34]/50">
            {t('assignedStaff')}
          </p>
          <p className="text-sm text-[#6B4A34]">{assignedStaff?.full_name ?? '—'}</p>
        </div>
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-[#6B4A34]/50">
            {t('status')}
          </p>
          <StatusSelect orderId={order.id} initialStatus={order.status} />
        </div>
        {order.notes && (
          <div className="sm:col-span-2">
            <p className="text-xs uppercase tracking-wide text-[#6B4A34]/50">
              {t('notes')}
            </p>
            <p className="text-sm text-[#6B4A34]">{order.notes}</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#6B4A34]">{t('updates')}</h2>
        {!updates || updates.length === 0 ? (
          <p className="text-sm text-[#6B4A34]/60">{t('noUpdates')}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {updates.map((update) => {
              const staffMember = update.staff_id
                ? updateStaffById.get(update.staff_id)
                : undefined
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
                    {staffMember?.full_name ?? '—'}
                  </p>
                  {update.note && (
                    <p className="mt-1 text-sm text-[#6B4A34]">{update.note}</p>
                  )}
                  <p className="mt-1 text-xs text-[#6B4A34]/50">
                    {update.location_denied ||
                    update.latitude == null ||
                    update.longitude == null
                      ? t('locationDenied')
                      : `${update.latitude.toFixed(5)}, ${update.longitude.toFixed(5)}`}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#6B4A34]">{t('photos')}</h2>
        {signedPhotos.length === 0 ? (
          <p className="text-sm text-[#6B4A34]/60">{t('noPhotos')}</p>
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
