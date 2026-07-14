import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { CalendarView, type CalendarOrder } from './calendar-view'

export const revalidate = 0

export default async function CalendarioPage() {
  const t = await getTranslations('admin.nav')
  const supabase = createClient()

  const { data: orders, error } = await supabase
    .from('service_orders')
    .select('id, service_type, status, scheduled_at, property_id')
    .not('scheduled_at', 'is', null)

  if (error) {
    throw new Error(error.message)
  }

  const propertyIds = Array.from(
    new Set((orders ?? []).map((o) => o.property_id).filter((id): id is string => !!id)),
  )
  const { data: properties } = propertyIds.length
    ? await supabase.from('properties').select('id, name').in('id', propertyIds)
    : { data: [] }
  const propertyById = new Map((properties ?? []).map((p) => [p.id, p]))

  const calendarOrders: CalendarOrder[] = (orders ?? [])
    .filter((o): o is typeof o & { scheduled_at: string } => !!o.scheduled_at)
    .map((o) => ({
      id: o.id,
      service_type: o.service_type,
      status: o.status,
      scheduled_at: o.scheduled_at,
      property_name: o.property_id ? propertyById.get(o.property_id)?.name ?? null : null,
    }))

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-[#6B4A34]">{t('calendar')}</h1>
      <CalendarView orders={calendarOrders} />
    </div>
  )
}
