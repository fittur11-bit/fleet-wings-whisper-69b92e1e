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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      aircraft: {
        Row: {
          created_at: string
          cva_data: Json | null
          cva_expiration: string | null
          gallery: Json | null
          id: string
          inspection_data: Json | null
          last_inspection_date: string | null
          manufacturer: string | null
          model: string | null
          notes: string | null
          owner: string | null
          photo_url: string | null
          prefix: string
          serial_number: string | null
          status: string
          total_hours: number | null
          updated_at: string
          user_id: string
          year: number | null
        }
        Insert: {
          created_at?: string
          cva_data?: Json | null
          cva_expiration?: string | null
          gallery?: Json | null
          id?: string
          inspection_data?: Json | null
          last_inspection_date?: string | null
          manufacturer?: string | null
          model?: string | null
          notes?: string | null
          owner?: string | null
          photo_url?: string | null
          prefix: string
          serial_number?: string | null
          status?: string
          total_hours?: number | null
          updated_at?: string
          user_id: string
          year?: number | null
        }
        Update: {
          created_at?: string
          cva_data?: Json | null
          cva_expiration?: string | null
          gallery?: Json | null
          id?: string
          inspection_data?: Json | null
          last_inspection_date?: string | null
          manufacturer?: string | null
          model?: string | null
          notes?: string | null
          owner?: string | null
          photo_url?: string | null
          prefix?: string
          serial_number?: string | null
          status?: string
          total_hours?: number | null
          updated_at?: string
          user_id?: string
          year?: number | null
        }
        Relationships: []
      }
      crew_members: {
        Row: {
          cma_expiration: string | null
          created_at: string
          full_name: string
          id: string
          ifr_expiration: string | null
          is_active: boolean | null
          license_number: string | null
          type_ratings: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cma_expiration?: string | null
          created_at?: string
          full_name: string
          id?: string
          ifr_expiration?: string | null
          is_active?: boolean | null
          license_number?: string | null
          type_ratings?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cma_expiration?: string | null
          created_at?: string
          full_name?: string
          id?: string
          ifr_expiration?: string | null
          is_active?: boolean | null
          license_number?: string | null
          type_ratings?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          aircraft_id: string | null
          created_at: string
          doc_type: string
          file_url: string | null
          id: string
          model: string | null
          notes: string | null
          revision_date: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
          version: string | null
        }
        Insert: {
          aircraft_id?: string | null
          created_at?: string
          doc_type: string
          file_url?: string | null
          id?: string
          model?: string | null
          notes?: string | null
          revision_date?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
          version?: string | null
        }
        Update: {
          aircraft_id?: string | null
          created_at?: string
          doc_type?: string
          file_url?: string | null
          id?: string
          model?: string | null
          notes?: string | null
          revision_date?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_aircraft_id_fkey"
            columns: ["aircraft_id"]
            isOneToOne: false
            referencedRelation: "aircraft"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_logs: {
        Row: {
          aircraft_id: string
          arrival_airport: string | null
          copilot_id: string | null
          created_at: string
          cycles: number
          date: string
          departure_airport: string | null
          flight_time: number
          fuel_burned: number | null
          fuel_loaded: number | null
          id: string
          landing_time: string | null
          nature_of_flight: string | null
          notes: string | null
          off_block_time: string | null
          on_block_time: string | null
          pilot_id: string | null
          takeoff_time: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          aircraft_id: string
          arrival_airport?: string | null
          copilot_id?: string | null
          created_at?: string
          cycles?: number
          date?: string
          departure_airport?: string | null
          flight_time?: number
          fuel_burned?: number | null
          fuel_loaded?: number | null
          id?: string
          landing_time?: string | null
          nature_of_flight?: string | null
          notes?: string | null
          off_block_time?: string | null
          on_block_time?: string | null
          pilot_id?: string | null
          takeoff_time?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          aircraft_id?: string
          arrival_airport?: string | null
          copilot_id?: string | null
          created_at?: string
          cycles?: number
          date?: string
          departure_airport?: string | null
          flight_time?: number
          fuel_burned?: number | null
          fuel_loaded?: number | null
          id?: string
          landing_time?: string | null
          nature_of_flight?: string | null
          notes?: string | null
          off_block_time?: string | null
          on_block_time?: string | null
          pilot_id?: string | null
          takeoff_time?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flight_logs_aircraft_id_fkey"
            columns: ["aircraft_id"]
            isOneToOne: false
            referencedRelation: "aircraft"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_logs_copilot_id_fkey"
            columns: ["copilot_id"]
            isOneToOne: false
            referencedRelation: "crew_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_logs_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "crew_members"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_items: {
        Row: {
          aircraft_id: string | null
          aircraft_prefix: string | null
          created_at: string
          description: string | null
          due_date: string | null
          due_hours: number | null
          id: string
          interval_hours: number | null
          interval_months: number | null
          item_type: string
          last_done_date: string | null
          last_done_hours: number | null
          notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aircraft_id?: string | null
          aircraft_prefix?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_hours?: number | null
          id?: string
          interval_hours?: number | null
          interval_months?: number | null
          item_type: string
          last_done_date?: string | null
          last_done_hours?: number | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          aircraft_id?: string | null
          aircraft_prefix?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_hours?: number | null
          id?: string
          interval_hours?: number | null
          interval_months?: number | null
          item_type?: string
          last_done_date?: string | null
          last_done_hours?: number | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_items_aircraft_id_fkey"
            columns: ["aircraft_id"]
            isOneToOne: false
            referencedRelation: "aircraft"
            referencedColumns: ["id"]
          },
        ]
      }
      part_shipments: {
        Row: {
          actual_return_date: string | null
          aircraft_id: string
          budget_amount: number | null
          created_at: string
          destination_workshop: string | null
          estimated_return_date: string | null
          id: string
          notes: string | null
          overhaul_threshold: string | null
          overhaul_type: string | null
          part_name: string
          serial_number: string | null
          shipping_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_return_date?: string | null
          aircraft_id: string
          budget_amount?: number | null
          created_at?: string
          destination_workshop?: string | null
          estimated_return_date?: string | null
          id?: string
          notes?: string | null
          overhaul_threshold?: string | null
          overhaul_type?: string | null
          part_name: string
          serial_number?: string | null
          shipping_date?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_return_date?: string | null
          aircraft_id?: string
          budget_amount?: number | null
          created_at?: string
          destination_workshop?: string | null
          estimated_return_date?: string | null
          id?: string
          notes?: string | null
          overhaul_threshold?: string | null
          overhaul_type?: string | null
          part_name?: string
          serial_number?: string | null
          shipping_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "part_shipments_aircraft_id_fkey"
            columns: ["aircraft_id"]
            isOneToOne: false
            referencedRelation: "aircraft"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          aircraft_id: string | null
          condition: string | null
          created_at: string
          hours_at_install: number | null
          id: string
          install_date: string | null
          name: string
          notes: string | null
          origin: string | null
          part_number: string | null
          photos: Json | null
          removal_date: string | null
          serial_number: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aircraft_id?: string | null
          condition?: string | null
          created_at?: string
          hours_at_install?: number | null
          id?: string
          install_date?: string | null
          name: string
          notes?: string | null
          origin?: string | null
          part_number?: string | null
          photos?: Json | null
          removal_date?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          aircraft_id?: string | null
          condition?: string | null
          created_at?: string
          hours_at_install?: number | null
          id?: string
          install_date?: string | null
          name?: string
          notes?: string | null
          origin?: string | null
          part_number?: string | null
          photos?: Json | null
          removal_date?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parts_aircraft_id_fkey"
            columns: ["aircraft_id"]
            isOneToOne: false
            referencedRelation: "aircraft"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          security_answer_hash: string | null
          security_question: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          security_answer_hash?: string | null
          security_question?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          security_answer_hash?: string | null
          security_question?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          aircraft_id: string | null
          aircraft_prefix: string | null
          checklist: Json | null
          cost: number | null
          created_at: string
          description: string | null
          hours_at_service: number | null
          id: string
          location: string | null
          notes: string | null
          performed_at: string | null
          photos: Json | null
          repair_photos: Json
          report_url: string | null
          service_type: string
          service_types: Json | null
          status: string
          technician: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aircraft_id?: string | null
          aircraft_prefix?: string | null
          checklist?: Json | null
          cost?: number | null
          created_at?: string
          description?: string | null
          hours_at_service?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          performed_at?: string | null
          photos?: Json | null
          repair_photos?: Json
          report_url?: string | null
          service_type: string
          service_types?: Json | null
          status?: string
          technician?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aircraft_id?: string | null
          aircraft_prefix?: string | null
          checklist?: Json | null
          cost?: number | null
          created_at?: string
          description?: string | null
          hours_at_service?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          performed_at?: string | null
          photos?: Json | null
          repair_photos?: Json
          report_url?: string | null
          service_type?: string
          service_types?: Json | null
          status?: string
          technician?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_aircraft_id_fkey"
            columns: ["aircraft_id"]
            isOneToOne: false
            referencedRelation: "aircraft"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_events: {
        Row: {
          bytes: number | null
          category: string
          created_at: string
          estimated_cost_usd: number | null
          event_type: string
          id: string
          metadata: Json | null
          units: number | null
          user_id: string
        }
        Insert: {
          bytes?: number | null
          category: string
          created_at?: string
          estimated_cost_usd?: number | null
          event_type: string
          id?: string
          metadata?: Json | null
          units?: number | null
          user_id: string
        }
        Update: {
          bytes?: number | null
          category?: string
          created_at?: string
          estimated_cost_usd?: number | null
          event_type?: string
          id?: string
          metadata?: Json | null
          units?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_security_question: { Args: { _email: string }; Returns: string }
      set_security_question: {
        Args: { _answer: string; _question: string }
        Returns: undefined
      }
      verify_security_answer: {
        Args: { _answer: string; _email: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
