// Mat Tracker Database Types
// Generated for mat_tracker schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// GPS Point type for tracking sessions
export interface GpsPoint {
  lat: number
  lng: number
  timestamp: string
}

export type Database = {
  mat_tracker: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          phone: string | null
          role: 'prodajalec' | 'inventar' | 'admin'
          secondary_role: 'prodajalec' | 'inventar' | 'admin' | null
          code_prefix: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name: string
          last_name: string
          phone?: string | null
          role: 'prodajalec' | 'inventar' | 'admin'
          secondary_role?: 'prodajalec' | 'inventar' | 'admin' | null
          code_prefix?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          phone?: string | null
          role?: 'prodajalec' | 'inventar' | 'admin'
          secondary_role?: 'prodajalec' | 'inventar' | 'admin' | null
          code_prefix?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      mat_types: {
        Row: {
          id: string
          code: string | null
          name: string
          width_cm: number
          height_cm: number
          category: 'standard' | 'ergo' | 'design'
          price_1_week: number | null
          price_2_weeks: number | null
          price_3_weeks: number | null
          price_4_weeks: number | null
          price_purchase: number | null
          price_penalty: number | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          code?: string | null
          name: string
          width_cm: number
          height_cm: number
          category: 'standard' | 'ergo' | 'design'
          price_1_week?: number | null
          price_2_weeks?: number | null
          price_3_weeks?: number | null
          price_4_weeks?: number | null
          price_purchase?: number | null
          price_penalty?: number | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          code?: string | null
          name?: string
          width_cm?: number
          height_cm?: number
          category?: 'standard' | 'ergo' | 'design'
          price_1_week?: number | null
          price_2_weeks?: number | null
          price_3_weeks?: number | null
          price_4_weeks?: number | null
          price_purchase?: number | null
          price_penalty?: number | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          id: string
          name: string
          tax_number: string | null
          registration_number: string | null
          address_street: string | null
          address_city: string | null
          address_postal: string | null
          address_country: string
          delivery_address: string | null
          delivery_postal: string | null
          delivery_city: string | null
          billing_address: string | null
          billing_postal: string | null
          billing_city: string | null
          working_hours: string | null
          delivery_instructions: string | null
          customer_number: string | null
          latitude: number | null
          longitude: number | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          pipeline_status: string | null
          contract_sent_at: string | null
          contract_called_at: string | null
          offer_sent_at: string | null
          offer_called_at: string | null
          parent_company_id: string | null
          is_in_d365: boolean
        }
        Insert: {
          id?: string
          name: string
          tax_number?: string | null
          registration_number?: string | null
          address_street?: string | null
          address_city?: string | null
          address_postal?: string | null
          address_country?: string
          delivery_address?: string | null
          delivery_postal?: string | null
          delivery_city?: string | null
          billing_address?: string | null
          billing_postal?: string | null
          billing_city?: string | null
          working_hours?: string | null
          delivery_instructions?: string | null
          customer_number?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          pipeline_status?: string | null
          contract_sent_at?: string | null
          contract_called_at?: string | null
          offer_sent_at?: string | null
          offer_called_at?: string | null
          parent_company_id?: string | null
          is_in_d365?: boolean
        }
        Update: {
          id?: string
          name?: string
          tax_number?: string | null
          registration_number?: string | null
          address_street?: string | null
          address_city?: string | null
          address_postal?: string | null
          address_country?: string
          delivery_address?: string | null
          delivery_postal?: string | null
          delivery_city?: string | null
          billing_address?: string | null
          billing_postal?: string | null
          billing_city?: string | null
          working_hours?: string | null
          delivery_instructions?: string | null
          customer_number?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          pipeline_status?: string | null
          contract_sent_at?: string | null
          contract_called_at?: string | null
          offer_sent_at?: string | null
          offer_called_at?: string | null
          parent_company_id?: string | null
          is_in_d365?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "companies_parent_company_id_fkey"
            columns: ["parent_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      company_notes: {
        Row: {
          id: string
          company_id: string
          note_date: string
          content: string
          created_by: string | null
          created_at: string
          updated_at: string
          activity_category: string | null
          activity_subcategory: string | null
          appointment_type: string | null
          start_time: string | null
          end_time: string | null
          exported_to_d365_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          note_date?: string
          content: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
          activity_category?: string | null
          activity_subcategory?: string | null
          appointment_type?: string | null
          start_time?: string | null
          end_time?: string | null
          exported_to_d365_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          note_date?: string
          content?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
          activity_category?: string | null
          activity_subcategory?: string | null
          appointment_type?: string | null
          start_time?: string | null
          end_time?: string | null
          exported_to_d365_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_notes_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      contacts: {
        Row: {
          id: string
          company_id: string
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          role: string | null
          is_decision_maker: boolean
          is_primary: boolean
          is_billing_contact: boolean
          is_service_contact: boolean
          notes: string | null
          contact_since: string | null
          location_address: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          role?: string | null
          is_decision_maker?: boolean
          is_primary?: boolean
          is_billing_contact?: boolean
          is_service_contact?: boolean
          notes?: string | null
          contact_since?: string | null
          location_address?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string | null
          role?: string | null
          is_decision_maker?: boolean
          is_primary?: boolean
          is_billing_contact?: boolean
          is_service_contact?: boolean
          notes?: string | null
          contact_since?: string | null
          location_address?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      qr_codes: {
        Row: {
          id: string
          code: string
          owner_id: string | null
          status: 'pending' | 'available' | 'active'
          ordered_at: string | null
          received_at: string | null
          last_reset_at: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          code: string
          owner_id?: string | null
          status?: 'pending' | 'available' | 'active'
          ordered_at?: string | null
          received_at?: string | null
          last_reset_at?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          code?: string
          owner_id?: string | null
          status?: 'pending' | 'available' | 'active'
          ordered_at?: string | null
          received_at?: string | null
          last_reset_at?: string | null
          created_at?: string
          created_by?: string | null
        }
        Relationships: []
      }
      cycles: {
        Row: {
          id: string
          qr_code_id: string
          salesperson_id: string
          mat_type_id: string
          status: 'clean' | 'on_test' | 'dirty' | 'waiting_driver' | 'completed'
          company_id: string | null
          contact_id: string | null
          test_start_date: string | null
          test_end_date: string | null
          extensions_count: number
          location_lat: number | null
          location_lng: number | null
          location_address: string | null
          contract_signed: boolean
          contract_frequency: string | null
          contract_signed_at: string | null
          pickup_requested_at: string | null
          driver_pickup_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          qr_code_id: string
          salesperson_id: string
          mat_type_id: string
          status?: 'clean' | 'on_test' | 'dirty' | 'waiting_driver' | 'completed'
          company_id?: string | null
          contact_id?: string | null
          test_start_date?: string | null
          test_end_date?: string | null
          extensions_count?: number
          location_lat?: number | null
          location_lng?: number | null
          location_address?: string | null
          contract_signed?: boolean
          contract_frequency?: string | null
          contract_signed_at?: string | null
          pickup_requested_at?: string | null
          driver_pickup_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          qr_code_id?: string
          salesperson_id?: string
          mat_type_id?: string
          status?: 'clean' | 'on_test' | 'dirty' | 'waiting_driver' | 'completed'
          company_id?: string | null
          contact_id?: string | null
          test_start_date?: string | null
          test_end_date?: string | null
          extensions_count?: number
          location_lat?: number | null
          location_lng?: number | null
          location_address?: string | null
          contract_signed?: boolean
          contract_frequency?: string | null
          contract_signed_at?: string | null
          pickup_requested_at?: string | null
          driver_pickup_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycles_qr_code_id_fkey"
            columns: ["qr_code_id"]
            isOneToOne: false
            referencedRelation: "qr_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycles_mat_type_id_fkey"
            columns: ["mat_type_id"]
            isOneToOne: false
            referencedRelation: "mat_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycles_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          }
        ]
      }
      cycle_history: {
        Row: {
          id: string
          cycle_id: string
          action: string
          old_status: string | null
          new_status: string | null
          metadata: Json | null
          performed_by: string | null
          performed_at: string
        }
        Insert: {
          id?: string
          cycle_id: string
          action: string
          old_status?: string | null
          new_status?: string | null
          metadata?: Json | null
          performed_by?: string | null
          performed_at?: string
        }
        Update: {
          id?: string
          cycle_id?: string
          action?: string
          old_status?: string | null
          new_status?: string | null
          metadata?: Json | null
          performed_by?: string | null
          performed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_history_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          }
        ]
      }
      orders: {
        Row: {
          id: string
          salesperson_id: string
          status: 'pending' | 'approved' | 'rejected' | 'shipped' | 'received'
          approved_by: string | null
          approved_at: string | null
          rejection_reason: string | null
          shipped_at: string | null
          received_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          salesperson_id: string
          status?: 'pending' | 'approved' | 'rejected' | 'shipped' | 'received'
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          shipped_at?: string | null
          received_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          salesperson_id?: string
          status?: 'pending' | 'approved' | 'rejected' | 'shipped' | 'received'
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          shipped_at?: string | null
          received_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          mat_type_id: string
          quantity_requested: number
          quantity_approved: number | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          mat_type_id: string
          quantity_requested: number
          quantity_approved?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          mat_type_id?: string
          quantity_requested?: number
          quantity_approved?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_mat_type_id_fkey"
            columns: ["mat_type_id"]
            isOneToOne: false
            referencedRelation: "mat_types"
            referencedColumns: ["id"]
          }
        ]
      }
      email_templates: {
        Row: {
          id: string
          name: string
          subject: string
          body_html: string
          body_text: string
          template_type: 'offer_rental' | 'offer_purchase' | 'offer_both' | 'reminder' | 'followup' | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          subject: string
          body_html: string
          body_text: string
          template_type?: 'offer_rental' | 'offer_purchase' | 'offer_both' | 'reminder' | 'followup' | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          subject?: string
          body_html?: string
          body_text?: string
          template_type?: 'offer_rental' | 'offer_purchase' | 'offer_both' | 'reminder' | 'followup' | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sent_emails: {
        Row: {
          id: string
          cycle_id: string | null
          company_id: string | null
          contact_id: string | null
          template_id: string | null
          recipient_email: string
          subject: string
          offer_type: 'rental' | 'purchase' | 'both' | null
          frequency: string | null
          billionmails_id: string | null
          status: string
          sent_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          cycle_id?: string | null
          company_id?: string | null
          contact_id?: string | null
          template_id?: string | null
          recipient_email: string
          subject: string
          offer_type?: 'rental' | 'purchase' | 'both' | null
          frequency?: string | null
          billionmails_id?: string | null
          status?: string
          sent_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          cycle_id?: string | null
          company_id?: string | null
          contact_id?: string | null
          template_id?: string | null
          recipient_email?: string
          subject?: string
          offer_type?: 'rental' | 'purchase' | 'both' | null
          frequency?: string | null
          billionmails_id?: string | null
          status?: string
          sent_at?: string
          created_by?: string | null
        }
        Relationships: []
      }
      offer_items: {
        Row: {
          id: string
          sent_email_id: string | null
          cycle_id: string | null
          mat_type_id: string | null
          is_design: boolean
          width_cm: number
          height_cm: number
          price_rental: number | null
          price_purchase: number | null
          price_penalty: number | null
          quantity: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sent_email_id?: string | null
          cycle_id?: string | null
          mat_type_id?: string | null
          is_design?: boolean
          width_cm: number
          height_cm: number
          price_rental?: number | null
          price_purchase?: number | null
          price_penalty?: number | null
          quantity?: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sent_email_id?: string | null
          cycle_id?: string | null
          mat_type_id?: string | null
          is_design?: boolean
          width_cm?: number
          height_cm?: number
          price_rental?: number | null
          price_purchase?: number | null
          price_penalty?: number | null
          quantity?: number
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      driver_pickups: {
        Row: {
          id: string
          status: 'pending' | 'in_progress' | 'completed'
          scheduled_date: string | null
          completed_at: string | null
          assigned_driver: string | null
          created_by: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          status?: 'pending' | 'in_progress' | 'completed'
          scheduled_date?: string | null
          completed_at?: string | null
          assigned_driver?: string | null
          created_by?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          status?: 'pending' | 'in_progress' | 'completed'
          scheduled_date?: string | null
          completed_at?: string | null
          assigned_driver?: string | null
          created_by?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      driver_pickup_items: {
        Row: {
          id: string
          pickup_id: string
          cycle_id: string
          picked_up: boolean
          picked_up_at: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          pickup_id: string
          cycle_id: string
          picked_up?: boolean
          picked_up_at?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          pickup_id?: string
          cycle_id?: string
          picked_up?: boolean
          picked_up_at?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_pickup_items_pickup_id_fkey"
            columns: ["pickup_id"]
            isOneToOne: false
            referencedRelation: "driver_pickups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_pickup_items_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          }
        ]
      }
      reminders: {
        Row: {
          id: string
          company_id: string
          user_id: string
          reminder_at: string
          note: string | null
          is_completed: boolean
          reminder_type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          reminder_at: string
          note?: string | null
          is_completed?: boolean
          reminder_type?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string
          reminder_at?: string
          note?: string | null
          is_completed?: boolean
          reminder_type?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      drivers: {
        Row: {
          id: string
          name: string
          phone: string | null
          region: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          region?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          region?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      optibrush_prices: {
        Row: {
          id: string
          has_edge: boolean
          has_drainage: boolean
          is_standard: boolean
          is_large: boolean
          color_count: '1' | '2-3'
          price_per_m2: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          has_edge: boolean
          has_drainage: boolean
          is_standard: boolean
          is_large: boolean
          color_count: '1' | '2-3'
          price_per_m2: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          has_edge?: boolean
          has_drainage?: boolean
          is_standard?: boolean
          is_large?: boolean
          color_count?: '1' | '2-3'
          price_per_m2?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      mat_prices: {
        Row: {
          id: string
          code: string
          name: string
          category: 'poslovni' | 'ergonomski' | 'zunanji' | 'design'
          m2: number
          dimensions: string
          price_week_1: number
          price_week_2: number
          price_week_3: number
          price_week_4: number
          price_purchase: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          category: 'poslovni' | 'ergonomski' | 'zunanji' | 'design'
          m2: number
          dimensions: string
          price_week_1: number
          price_week_2: number
          price_week_3: number
          price_week_4: number
          price_purchase: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          category?: 'poslovni' | 'ergonomski' | 'zunanji' | 'design'
          m2?: number
          dimensions?: string
          price_week_1?: number
          price_week_2?: number
          price_week_3?: number
          price_week_4?: number
          price_purchase?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_m2_prices: {
        Row: {
          id: string
          size_category: 'small' | 'large'
          frequency: '1' | '2' | '3' | '4'
          price_per_m2: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          size_category: 'small' | 'large'
          frequency: '1' | '2' | '3' | '4'
          price_per_m2: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          size_category?: 'small' | 'large'
          frequency?: '1' | '2' | '3' | '4'
          price_per_m2?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      price_settings: {
        Row: {
          id: string
          key: string
          value: number
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      travel_logs: {
        Row: {
          id: string
          user_id: string
          month: number
          year: number
          vehicle_brand: string | null
          vehicle_registration: string | null
          vehicle_owner: string | null
          starting_odometer: number | null
          ending_odometer: number | null
          private_km_limit: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          month: number
          year: number
          vehicle_brand?: string | null
          vehicle_registration?: string | null
          vehicle_owner?: string | null
          starting_odometer?: number | null
          ending_odometer?: number | null
          private_km_limit?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          month?: number
          year?: number
          vehicle_brand?: string | null
          vehicle_registration?: string | null
          vehicle_owner?: string | null
          starting_odometer?: number | null
          ending_odometer?: number | null
          private_km_limit?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      travel_log_entries: {
        Row: {
          id: string
          travel_log_id: string
          entry_date: string
          route: string | null
          purpose: string
          km_business: number
          km_private: number
          odometer_reading: number | null
          start_time: string | null
          end_time: string | null
          gps_session_ids: string[]
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          travel_log_id: string
          entry_date: string
          route?: string | null
          purpose?: string
          km_business?: number
          km_private?: number
          odometer_reading?: number | null
          start_time?: string | null
          end_time?: string | null
          gps_session_ids?: string[]
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          travel_log_id?: string
          entry_date?: string
          route?: string | null
          purpose?: string
          km_business?: number
          km_private?: number
          odometer_reading?: number | null
          start_time?: string | null
          end_time?: string | null
          gps_session_ids?: string[]
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_log_entries_travel_log_id_fkey"
            columns: ["travel_log_id"]
            isOneToOne: false
            referencedRelation: "travel_logs"
            referencedColumns: ["id"]
          }
        ]
      }
      gps_tracking_sessions: {
        Row: {
          id: string
          salesperson_id: string
          started_at: string
          ended_at: string | null
          total_km: number | null
          points: GpsPoint[]
          created_at: string
        }
        Insert: {
          id?: string
          salesperson_id: string
          started_at?: string
          ended_at?: string | null
          total_km?: number | null
          points?: GpsPoint[]
          created_at?: string
        }
        Update: {
          id?: string
          salesperson_id?: string
          started_at?: string
          ended_at?: string | null
          total_km?: number | null
          points?: GpsPoint[]
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'prodajalec' | 'inventar' | 'admin'
      qr_status: 'pending' | 'available' | 'active'
      cycle_status: 'clean' | 'on_test' | 'dirty' | 'waiting_driver' | 'completed'
      mat_category: 'standard' | 'ergo' | 'design'
      order_status: 'pending' | 'approved' | 'rejected' | 'shipped' | 'received'
      pickup_status: 'pending' | 'in_progress' | 'completed'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for mat_tracker schema
export type MatTrackerTables = Database['mat_tracker']['Tables']

export type Profile = MatTrackerTables['profiles']['Row']
export type MatType = MatTrackerTables['mat_types']['Row']
export type Company = MatTrackerTables['companies']['Row']
export type CompanyNote = MatTrackerTables['company_notes']['Row']
export type Contact = MatTrackerTables['contacts']['Row']
export type QRCode = MatTrackerTables['qr_codes']['Row']
export type Cycle = MatTrackerTables['cycles']['Row']
export type CycleHistory = MatTrackerTables['cycle_history']['Row']
export type Order = MatTrackerTables['orders']['Row']
export type OrderItem = MatTrackerTables['order_items']['Row']
export type EmailTemplate = MatTrackerTables['email_templates']['Row']
export type SentEmail = MatTrackerTables['sent_emails']['Row']
export type OfferItem = MatTrackerTables['offer_items']['Row']
export type DriverPickup = MatTrackerTables['driver_pickups']['Row']
export type DriverPickupItem = MatTrackerTables['driver_pickup_items']['Row']
export type Reminder = MatTrackerTables['reminders']['Row']
export type ReminderInsert = MatTrackerTables['reminders']['Insert']
export type Driver = MatTrackerTables['drivers']['Row']
export type DriverInsert = MatTrackerTables['drivers']['Insert']
export type OptibrushPrice = MatTrackerTables['optibrush_prices']['Row']
export type MatPriceDB = MatTrackerTables['mat_prices']['Row']
export type CustomM2Price = MatTrackerTables['custom_m2_prices']['Row']
export type PriceSetting = MatTrackerTables['price_settings']['Row']
export type OptibrushStandardSize = MatTrackerTables['optibrush_standard_sizes']['Row']
export type GpsTrackingSession = MatTrackerTables['gps_tracking_sessions']['Row']
export type GpsTrackingSessionInsert = MatTrackerTables['gps_tracking_sessions']['Insert']
export type GpsTrackingSessionUpdate = MatTrackerTables['gps_tracking_sessions']['Update']

export type TravelLog = MatTrackerTables['travel_logs']['Row']
export type TravelLogInsert = MatTrackerTables['travel_logs']['Insert']
export type TravelLogUpdate = MatTrackerTables['travel_logs']['Update']
export type TravelLogEntry = MatTrackerTables['travel_log_entries']['Row']
export type TravelLogEntryInsert = MatTrackerTables['travel_log_entries']['Insert']
export type TravelLogEntryUpdate = MatTrackerTables['travel_log_entries']['Update']

// Purpose types for travel log entries
export const TRAVEL_PURPOSES = ['teren', 'bolniska', 'dopust', 'praznik', 'od_doma', 'prosto'] as const
export type TravelPurpose = typeof TRAVEL_PURPOSES[number]

// Insert types
export type ProfileInsert = MatTrackerTables['profiles']['Insert']
export type CompanyInsert = MatTrackerTables['companies']['Insert']
export type ContactInsert = MatTrackerTables['contacts']['Insert']
export type CycleInsert = MatTrackerTables['cycles']['Insert']
export type OrderInsert = MatTrackerTables['orders']['Insert']

// Status enums for convenience
export const CYCLE_STATUSES = ['clean', 'on_test', 'dirty', 'waiting_driver', 'completed'] as const
export const QR_STATUSES = ['pending', 'available', 'active'] as const
export const USER_ROLES = ['prodajalec', 'inventar', 'admin'] as const
export const MAT_CATEGORIES = ['standard', 'ergo', 'design'] as const
