// -----------------------------------------------------------------------------
// Apapacho Homes — Database types
//
// This file is a hand-written baseline that mirrors the schema in
// supabase/migrations/0001_init.sql. Once the project is linked to Supabase,
// regenerate it with:
//
//   npx supabase gen types typescript --project-id TU_PROJECT_ID > types/database.types.ts
//
// -----------------------------------------------------------------------------

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'staff' | 'client'
export type Language = 'es' | 'en' | 'auto'
export type City = 'San Diego' | 'Los Angeles'

export type ServiceType =
  | 'cleaning'
  | 'organization'
  | 'decoration'
  | 'smart_home'
  | 'mobility'

export type ServiceStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  // granular repair flow (e.g. bikes)
  | 'received'
  | 'diagnosing'
  | 'in_repair'
  | 'ready'
  | 'delivered'

export type StaffType = 'internal' | 'external'

export type NotificationType =
  | 'service_completed'
  | 'service_started'
  | 'new_order'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: UserRole
          full_name: string | null
          email: string | null
          phone: string | null
          avatar_url: string | null
          language: Language
          created_at: string
        }
        Insert: {
          id: string
          role: UserRole
          full_name?: string | null
          email?: string | null
          phone?: string | null
          avatar_url?: string | null
          language?: Language
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      properties: {
        Row: {
          id: string
          client_id: string | null
          name: string | null
          address: string | null
          city: City | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id?: string | null
          name?: string | null
          address?: string | null
          city?: City | null
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['properties']['Insert']>
        Relationships: []
      }
      service_orders: {
        Row: {
          id: string
          property_id: string | null
          staff_id: string | null
          service_type: ServiceType
          service_sub: string | null
          status: ServiceStatus
          scheduled_at: string | null
          completed_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          property_id?: string | null
          staff_id?: string | null
          service_type: ServiceType
          service_sub?: string | null
          status?: ServiceStatus
          scheduled_at?: string | null
          completed_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['service_orders']['Insert']>
        Relationships: []
      }
      service_updates: {
        Row: {
          id: string
          order_id: string | null
          staff_id: string | null
          status: ServiceStatus
          note: string | null
          timestamp_device: string | null
          latitude: number | null
          longitude: number | null
          location_accuracy: number | null
          location_denied: boolean
          created_at: string
        }
        Insert: {
          id?: string
          order_id?: string | null
          staff_id?: string | null
          status: ServiceStatus
          note?: string | null
          timestamp_device?: string | null
          latitude?: number | null
          longitude?: number | null
          location_accuracy?: number | null
          location_denied?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['service_updates']['Insert']>
        Relationships: []
      }
      service_photos: {
        Row: {
          id: string
          order_id: string | null
          update_id: string | null
          storage_path: string
          caption: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id?: string | null
          update_id?: string | null
          storage_path: string
          caption?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['service_photos']['Insert']>
        Relationships: []
      }
      vendors: {
        Row: {
          id: string
          profile_id: string | null
          company_name: string | null
          tax_id: string | null
          specialties: ServiceType[] | null
          cities: City[] | null
          staff_type: StaffType
          payment_info: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          profile_id?: string | null
          company_name?: string | null
          tax_id?: string | null
          specialties?: ServiceType[] | null
          cities?: City[] | null
          staff_type?: StaffType
          payment_info?: string | null
          active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['vendors']['Insert']>
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string | null
          order_id: string | null
          type: NotificationType
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          order_id?: string | null
          type: NotificationType
          read?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
