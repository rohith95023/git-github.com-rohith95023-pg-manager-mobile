export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      beds: {
        Row: {
          bed_number: string
          created_at: string | null
          id: string
          previous_status: string | null
          room_id: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          bed_number: string
          created_at?: string | null
          id?: string
          previous_status?: string | null
          room_id?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          bed_number?: string
          created_at?: string | null
          id?: string
          previous_status?: string | null
          room_id?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beds_roomid_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beds_tenantid_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          bed_id: string | null
          check_in_date: string | null
          check_out_date: string | null
          created_at: string | null
          id: string
          pg_id: string | null
          remarks: string | null
          requested_date: string | null
          room_id: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          stay_type: Database["public"]["Enums"]["stay_type"] | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          bed_id?: string | null
          check_in_date?: string | null
          check_out_date?: string | null
          created_at?: string | null
          id?: string
          pg_id?: string | null
          remarks?: string | null
          requested_date?: string | null
          room_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          stay_type?: Database["public"]["Enums"]["stay_type"] | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          bed_id?: string | null
          check_in_date?: string | null
          check_out_date?: string | null
          created_at?: string | null
          id?: string
          pg_id?: string | null
          remarks?: string | null
          requested_date?: string | null
          room_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          stay_type?: Database["public"]["Enums"]["stay_type"] | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_pg_id_fkey"
            columns: ["pg_id"]
            isOneToOne: false
            referencedRelation: "pgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_stay_details: {
        Row: {
          balance_amount: number | null
          created_at: string | null
          id: string
          last_calculated_at: string | null
          maintenance_amount: number | null
          maintenance_paid: boolean | null
          maintenance_type: string | null
          move_in_date: string
          paid_amount: number | null
          rent_per_day: number
          tenant_id: string
          total_rent: number | null
          updated_at: string | null
          vacate_date: string
        }
        Insert: {
          balance_amount?: number | null
          created_at?: string | null
          id?: string
          last_calculated_at?: string | null
          maintenance_amount?: number | null
          maintenance_paid?: boolean | null
          maintenance_type?: string | null
          move_in_date: string
          paid_amount?: number | null
          rent_per_day: number
          tenant_id: string
          total_rent?: number | null
          updated_at?: string | null
          vacate_date: string
        }
        Update: {
          balance_amount?: number | null
          created_at?: string | null
          id?: string
          last_calculated_at?: string | null
          maintenance_amount?: number | null
          maintenance_paid?: boolean | null
          maintenance_type?: string | null
          move_in_date?: string
          paid_amount?: number | null
          rent_per_day?: number
          tenant_id?: string
          total_rent?: number | null
          updated_at?: string | null
          vacate_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_stay_details_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          date: string | null
          description: string | null
          id: string
          notes: string | null
          owner_id: string | null
          pg_id: string | null
          title: string
          updated_at: string | null
          vendor_name: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          pg_id?: string | null
          title: string
          updated_at?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          pg_id?: string | null
          title?: string
          updated_at?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_pg_id_fkey"
            columns: ["pg_id"]
            isOneToOne: false
            referencedRelation: "pgs"
            referencedColumns: ["id"]
          },
        ]
      }
      floors: {
        Row: {
          created_at: string | null
          floor_name: string | null
          floor_number: number
          id: string
          pg_id: string | null
        }
        Insert: {
          created_at?: string | null
          floor_name?: string | null
          floor_number: number
          id?: string
          pg_id?: string | null
        }
        Update: {
          created_at?: string | null
          floor_name?: string | null
          floor_number?: number
          id?: string
          pg_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "floors_pg_id_fkey"
            columns: ["pg_id"]
            isOneToOne: false
            referencedRelation: "pgs"
            referencedColumns: ["id"]
          },
        ]
      }
      master_activity_logs: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string
          form_data: Json
          id: string
          metadata: Json | null
          operation_type: string
          owner_id: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          form_data: Json
          id?: string
          metadata?: Json | null
          operation_type: string
          owner_id?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          form_data?: Json
          id?: string
          metadata?: Json | null
          operation_type?: string
          owner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "master_activity_logs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          bed_id: string | null
          billing_month: string | null
          created_at: string | null
          id: string
          notes: string | null
          owner_id: string | null
          payment_date: string | null
          payment_method: string | null
          pg_id: string | null
          reservation_id: string | null
          room_id: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          tenant_id: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          bed_id?: string | null
          billing_month?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          pg_id?: string | null
          reservation_id?: string | null
          room_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          tenant_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          bed_id?: string | null
          billing_month?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          pg_id?: string | null
          reservation_id?: string | null
          room_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          tenant_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_bedid_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_pg_id_fkey"
            columns: ["pg_id"]
            isOneToOne: false
            referencedRelation: "pgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_reservationid_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pgs: {
        Row: {
          address: string | null
          amenities: string[] | null
          city: string | null
          created_at: string | null
          description: string | null
          gender_type: string | null
          id: string
          maintenance_amount: number | null
          maintenance_type: string | null
          manager_id: string | null
          name: string
          owner_id: string | null
          pincode: string | null
          security_deposit: number | null
          state: string | null
          status: string | null
          support_contact: string | null
          total_floors: number | null
          total_rooms: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          amenities?: string[] | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          gender_type?: string | null
          id?: string
          maintenance_amount?: number | null
          maintenance_type?: string | null
          manager_id?: string | null
          name: string
          owner_id?: string | null
          pincode?: string | null
          security_deposit?: number | null
          state?: string | null
          status?: string | null
          support_contact?: string | null
          total_floors?: number | null
          total_rooms?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          amenities?: string[] | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          gender_type?: string | null
          id?: string
          maintenance_amount?: number | null
          maintenance_type?: string | null
          manager_id?: string | null
          name?: string
          owner_id?: string | null
          pincode?: string | null
          security_deposit?: number | null
          state?: string | null
          status?: string | null
          support_contact?: string | null
          total_floors?: number | null
          total_rooms?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pgs_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pgs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          gender: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rooms: {
        Row: {
          capacity: number | null
          created_at: string | null
          current_occupancy: number | null
          deposit: number | null
          floor: number | null
          id: string
          pg_id: string | null
          previous_status: string | null
          rent: number | null
          room_number: string
          room_type: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          current_occupancy?: number | null
          deposit?: number | null
          floor?: number | null
          id?: string
          pg_id?: string | null
          previous_status?: string | null
          rent?: number | null
          room_number: string
          room_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          current_occupancy?: number | null
          deposit?: number | null
          floor?: number | null
          id?: string
          pg_id?: string | null
          previous_status?: string | null
          rent?: number | null
          room_number?: string
          room_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_pg_id_fkey"
            columns: ["pg_id"]
            isOneToOne: false
            referencedRelation: "pgs"
            referencedColumns: ["id"]
          },
        ]
      }
      system_data_snapshots: {
        Row: {
          created_at: string | null
          filename: string
          format: string
          id: string
          owner_id: string | null
          record_count: number | null
          snapshot_data: Json
        }
        Insert: {
          created_at?: string | null
          filename: string
          format: string
          id?: string
          owner_id?: string | null
          record_count?: number | null
          snapshot_data: Json
        }
        Update: {
          created_at?: string | null
          filename?: string
          format?: string
          id?: string
          owner_id?: string | null
          record_count?: number | null
          snapshot_data?: Json
        }
        Relationships: []
      }
      tenants: {
        Row: {
          balance: number | null
          bed_id: string | null
          created_at: string | null
          custom_rent: number | null
          dob: string | null
          email: string | null
          emergency_contact: string | null
          full_name: string
          gender: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          id_number: string | null
          id_type: string | null
          maintenance_amount: number | null
          maintenance_paid: boolean | null
          maintenance_type: string | null
          move_in_date: string | null
          owner_id: string | null
          pg_id: string | null
          phone: string | null
          profession: string | null
          profile_id: string | null
          rent_cycle: string | null
          rent_per_day: number | null
          rent_per_month: number | null
          room_id: string | null
          security_deposit: number | null
          status: Database["public"]["Enums"]["tenant_status"] | null
          stay_type: string | null
          updated_at: string | null
          vacate_date: string | null
        }
        Insert: {
          balance?: number | null
          bed_id?: string | null
          created_at?: string | null
          custom_rent?: number | null
          dob?: string | null
          email?: string | null
          emergency_contact?: string | null
          full_name: string
          gender?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          id_number?: string | null
          id_type?: string | null
          maintenance_amount?: number | null
          maintenance_paid?: boolean | null
          maintenance_type?: string | null
          move_in_date?: string | null
          owner_id?: string | null
          pg_id?: string | null
          phone?: string | null
          profession?: string | null
          profile_id?: string | null
          rent_cycle?: string | null
          rent_per_day?: number | null
          rent_per_month?: number | null
          room_id?: string | null
          security_deposit?: number | null
          status?: Database["public"]["Enums"]["tenant_status"] | null
          stay_type?: string | null
          updated_at?: string | null
          vacate_date?: string | null
        }
        Update: {
          balance?: number | null
          bed_id?: string | null
          created_at?: string | null
          custom_rent?: number | null
          dob?: string | null
          email?: string | null
          emergency_contact?: string | null
          full_name?: string
          gender?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          id_number?: string | null
          id_type?: string | null
          maintenance_amount?: number | null
          maintenance_paid?: boolean | null
          maintenance_type?: string | null
          move_in_date?: string | null
          owner_id?: string | null
          pg_id?: string | null
          phone?: string | null
          profession?: string | null
          profile_id?: string | null
          rent_cycle?: string | null
          rent_per_day?: number | null
          rent_per_month?: number | null
          room_id?: string | null
          security_deposit?: number | null
          status?: Database["public"]["Enums"]["tenant_status"] | null
          stay_type?: string | null
          updated_at?: string | null
          vacate_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_pg_id_fkey"
            columns: ["pg_id"]
            isOneToOne: false
            referencedRelation: "pgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      profit_summary: {
        Row: {
          id: number | null
          month: string | null
          net_profit: number | null
          owner_id: string | null
          pg_id: string | null
          total_expense: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      archive_pg_cascade: {
        Args: { p_archived_name: string; p_pg_id: string }
        Returns: undefined
      }
      hard_delete_pg_cascade: { Args: { p_pg_id: string }; Returns: undefined }
      restore_pg_cascade: {
        Args: { p_pg_id: string; p_restored_name: string }
        Returns: undefined
      }
      update_daily_statuses: { Args: never; Returns: undefined }
    }
    Enums: {
      booking_status:
      | "PENDING"
      | "APPROVED"
      | "REJECTED"
      | "CANCELLED"
      | "CONFIRMED"
      | "CHECKED_IN"
      | "COMPLETED"
      payment_method: "CASH" | "UPI" | "BANK_TRANSFER" | "CARD"
      payment_status: "PENDING" | "COMPLETED" | "FAILED" | "PARTIAL" | "PAID"
      pg_status: "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "DELETED"
      room_status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "FULL"
      room_type:
      | "SINGLE"
      | "DOUBLE"
      | "TRIPLE"
      | "DORM"
      | "FOUR_SHARE"
      | "FIVE_SHARE"
      | "OTHERS"
      stay_type: "TEMPORARY" | "ADVANCE"
      tenant_status:
      | "ACTIVE"
      | "INACTIVE"
      | "UPCOMING"
      | "COMPLETED"
      | "OVERDUE"
      | "DELETED"
      | "NOTICE"
      user_role: "ADMIN" | "TENANT" | "MANAGER"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      booking_status: [
        "PENDING",
        "APPROVED",
        "REJECTED",
        "CANCELLED",
        "CONFIRMED",
        "CHECKED_IN",
        "COMPLETED",
      ],
      payment_method: ["CASH", "UPI", "BANK_TRANSFER", "CARD"],
      payment_status: ["PENDING", "COMPLETED", "FAILED", "PARTIAL", "PAID"],
      pg_status: ["ACTIVE", "INACTIVE", "MAINTENANCE", "DELETED"],
      room_status: ["AVAILABLE", "OCCUPIED", "MAINTENANCE", "FULL"],
      room_type: [
        "SINGLE",
        "DOUBLE",
        "TRIPLE",
        "DORM",
        "FOUR_SHARE",
        "FIVE_SHARE",
        "OTHERS",
      ],
      stay_type: ["TEMPORARY", "ADVANCE"],
      tenant_status: [
        "ACTIVE",
        "INACTIVE",
        "UPCOMING",
        "COMPLETED",
        "OVERDUE",
        "DELETED",
        "NOTICE",
      ],
      user_role: ["ADMIN", "TENANT", "MANAGER"],
    },
  },
} as const
