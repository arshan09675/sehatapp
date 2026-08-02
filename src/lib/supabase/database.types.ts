// ============================================================
// PLACEHOLDER — hand-written from supabase/migrations/0001_init.sql
// so the project type-checks before the Supabase project is linked.
//
// Regenerate (overwriting this file) after linking and after ANY
// schema change:
//   npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          full_name: string;
          phone: string | null;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: Database["public"]["Enums"]["user_role"];
          full_name: string;
          phone?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          full_name?: string;
          phone?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      clinics: {
        Row: {
          id: string;
          name: string;
          address: string;
          area: string;
          city: string;
          lat: number | null;
          lng: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address: string;
          area: string;
          city?: string;
          lat?: number | null;
          lng?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string;
          area?: string;
          city?: string;
          lat?: number | null;
          lng?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      doctors: {
        Row: {
          id: string;
          profile_id: string;
          pmc_number: string;
          specialty: string;
          qualifications: string | null;
          bio: string | null;
          photo_url: string | null;
          experience_years: number | null;
          is_verified: boolean;
          verified_at: string | null;
          verified_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          pmc_number: string;
          specialty: string;
          qualifications?: string | null;
          bio?: string | null;
          photo_url?: string | null;
          experience_years?: number | null;
          is_verified?: boolean;
          verified_at?: string | null;
          verified_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          pmc_number?: string;
          specialty?: string;
          qualifications?: string | null;
          bio?: string | null;
          photo_url?: string | null;
          experience_years?: number | null;
          is_verified?: boolean;
          verified_at?: string | null;
          verified_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      doctor_clinics: {
        Row: {
          id: string;
          doctor_id: string;
          clinic_id: string;
          fee_pkr: number;
        };
        Insert: {
          id?: string;
          doctor_id: string;
          clinic_id: string;
          fee_pkr: number;
        };
        Update: {
          id?: string;
          doctor_id?: string;
          clinic_id?: string;
          fee_pkr?: number;
        };
        Relationships: [];
      };
      schedules: {
        Row: {
          id: string;
          doctor_clinic_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          slot_minutes: number;
        };
        Insert: {
          id?: string;
          doctor_clinic_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          slot_minutes?: number;
        };
        Update: {
          id?: string;
          doctor_clinic_id?: string;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          slot_minutes?: number;
        };
        Relationships: [];
      };
      schedule_exceptions: {
        Row: {
          id: string;
          doctor_clinic_id: string;
          on_date: string;
          is_closed: boolean;
          start_time: string | null;
          end_time: string | null;
        };
        Insert: {
          id?: string;
          doctor_clinic_id: string;
          on_date: string;
          is_closed?: boolean;
          start_time?: string | null;
          end_time?: string | null;
        };
        Update: {
          id?: string;
          doctor_clinic_id?: string;
          on_date?: string;
          is_closed?: boolean;
          start_time?: string | null;
          end_time?: string | null;
        };
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string;
          clinic_id: string;
          slot_start: string;
          slot_end: string;
          status: Database["public"]["Enums"]["appointment_status"];
          fee_pkr: number;
          patient_note: string | null;
          cancel_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          doctor_id: string;
          clinic_id: string;
          slot_start: string;
          slot_end: string;
          status?: Database["public"]["Enums"]["appointment_status"];
          fee_pkr: number;
          patient_note?: string | null;
          cancel_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          doctor_id?: string;
          clinic_id?: string;
          slot_start?: string;
          slot_end?: string;
          status?: Database["public"]["Enums"]["appointment_status"];
          fee_pkr?: number;
          patient_note?: string | null;
          cancel_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          appointment_id: string;
          doctor_id: string;
          patient_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          doctor_id: string;
          patient_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          appointment_id?: string;
          doctor_id?: string;
          patient_id?: string;
          rating?: number;
          comment?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          profile_id: string;
          channel: string;
          template: string;
          payload: Json;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          channel: string;
          template: string;
          payload?: Json;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          channel?: string;
          template?: string;
          payload?: Json;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      current_doctor_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      book_appointment: {
        Args: {
          p_doctor_id: string;
          p_clinic_id: string;
          p_slot_start: string;
          p_note?: string;
        };
        Returns: Database["public"]["Tables"]["appointments"]["Row"];
      };
    };
    Enums: {
      user_role: "patient" | "doctor" | "admin";
      appointment_status:
        "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
