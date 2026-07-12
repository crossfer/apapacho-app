// -----------------------------------------------------------------------------
// Apapacho Homes — Shared constants
// -----------------------------------------------------------------------------

import type {
  City,
  Language,
  ServiceStatus,
  ServiceType,
  StaffType,
  UserRole,
} from '@/types/database.types'

/** Brand palette (see CLAUDE.md). Also mirrored in tailwind.config.ts. */
export const BRAND_COLORS = {
  agave: '#4F6D5A', // verde agave — principal oscuro, fondos, nav
  terracota: '#C56A3D', // acento cálido, íconos
  arena: '#E9D8B4', // fondo claro, cards
  nogal: '#6B4A34', // texto oscuro, headers
  bugambilia: '#B83E7A', // CTAs, acciones primarias, badges
  dorado: '#B68A4C', // logo, detalles decorativos
} as const

export const APP_NAME = 'Apapacho Homes'

export const LOCALE_COOKIE = 'NEXT_LOCALE'
export const SUPPORTED_LOCALES = ['es', 'en'] as const
export const DEFAULT_LOCALE = 'es'

export const LANGUAGES: Language[] = ['es', 'en', 'auto']

export const USER_ROLES: UserRole[] = ['admin', 'staff', 'client']

/** Landing route per role after login (role-prefixed URL segments). */
export const ROLE_HOME: Record<UserRole, string> = {
  admin: '/admin/dashboard',
  staff: '/staff/dashboard',
  client: '/client/dashboard',
}

export const CITIES: City[] = ['San Diego', 'Los Angeles']

export const STAFF_TYPES: StaffType[] = ['internal', 'external']

export const SERVICE_TYPES: ServiceType[] = [
  'cleaning',
  'organization',
  'decoration',
  'smart_home',
  'mobility',
]

/** Sub-services grouped by service type (service_sub column). */
export const SERVICE_SUBTYPES: Record<ServiceType, string[]> = {
  cleaning: ['general', 'pool', 'garden', 'post_event'],
  organization: ['closet', 'kitchen', 'garage'],
  decoration: ['christmas', 'halloween', 'easter', 'fourth_of_july'],
  smart_home: ['install', 'maintenance', 'security'],
  mobility: ['bike', 'escooter', 'skates', 'emoto', 'board'],
}

/** Standard service lifecycle. */
export const SERVICE_STATUSES: ServiceStatus[] = [
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
]

/** Granular repair lifecycle (e.g. bikes). */
export const REPAIR_STATUSES: ServiceStatus[] = [
  'received',
  'diagnosing',
  'in_repair',
  'ready',
  'delivered',
]

/** Status → brand color (used for calendar events & badges). */
export const STATUS_COLOR: Record<ServiceStatus, string> = {
  scheduled: BRAND_COLORS.dorado,
  in_progress: BRAND_COLORS.terracota,
  completed: BRAND_COLORS.agave,
  cancelled: BRAND_COLORS.nogal,
  received: BRAND_COLORS.dorado,
  diagnosing: BRAND_COLORS.terracota,
  in_repair: BRAND_COLORS.terracota,
  ready: BRAND_COLORS.bugambilia,
  delivered: BRAND_COLORS.agave,
}

/** Supabase Storage bucket for service photos. */
export const PHOTOS_BUCKET = 'service-photos'
