'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'
import type { EventClickArg } from '@fullcalendar/core'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import type { ServiceStatus, ServiceType } from '@/types/database.types'
import './calendar.css'

// Same palette as the admin calendar (app/admin/calendario/calendar-view.tsx)
// — kept in sync manually since each view fetches/colors its own events.
const CALENDAR_STATUS_COLOR: Record<ServiceStatus, string> = {
  scheduled: '#4F6D5A', // Verde Agave
  in_progress: '#B68A4C', // Dorado
  completed: '#6B4A34', // Nogal
  cancelled: '#9CA3AF', // gray
  received: '#4F6D5A',
  diagnosing: '#B68A4C',
  in_repair: '#B68A4C',
  ready: '#B83E7A',
  delivered: '#6B4A34',
}

export interface CalendarOrder {
  id: string
  service_type: ServiceType
  status: ServiceStatus
  scheduled_at: string
  property_name: string | null
}

export function CalendarView({ orders }: { orders: CalendarOrder[] }) {
  const router = useRouter()
  const locale = useLocale()
  const tServiceTypes = useTranslations('serviceTypes')

  const events = orders.map((order) => ({
    id: order.id,
    title: `${tServiceTypes(order.service_type)} · ${order.property_name ?? '—'}`,
    start: order.scheduled_at,
    backgroundColor: CALENDAR_STATUS_COLOR[order.status],
    borderColor: CALENDAR_STATUS_COLOR[order.status],
  }))

  return (
    <div className="apapacho-calendar rounded-2xl bg-white p-4 shadow-sm">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        locale={locale === 'es' ? esLocale : undefined}
        height="auto"
        events={events}
        eventClick={(info: EventClickArg) => {
          info.jsEvent.preventDefault()
          router.push(`/client/orders/${info.event.id}`)
        }}
      />
    </div>
  )
}
