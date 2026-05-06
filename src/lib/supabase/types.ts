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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
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
  public: {
    Tables: {
      access_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          last_used_at: string | null
          note: string | null
          quota_total: number
          quota_used: number
          revoked: boolean
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          last_used_at?: string | null
          note?: string | null
          quota_total?: number
          quota_used?: number
          revoked?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          last_used_at?: string | null
          note?: string | null
          quota_total?: number
          quota_used?: number
          revoked?: boolean
        }
        Relationships: []
      }
      grill_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          draft: string
          id: string
          phase: string
          revised_draft: string | null
          revision: Json | null
          scenario: string
          status: string
          tree_snapshot: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          draft: string
          id?: string
          phase?: string
          revised_draft?: string | null
          revision?: Json | null
          scenario: string
          status?: string
          tree_snapshot?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          draft?: string
          id?: string
          phase?: string
          revised_draft?: string | null
          revision?: Json | null
          scenario?: string
          status?: string
          tree_snapshot?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grill_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          id: string
          max_rounds: number
          model_access: string
          monthly_credits: number
          name: string
          price_monthly: number
          price_yearly: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          id: string
          max_rounds: number
          model_access?: string
          monthly_credits: number
          name: string
          price_monthly?: number
          price_yearly?: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          max_rounds?: number
          model_access?: string
          monthly_credits?: number
          name?: string
          price_monthly?: number
          price_yearly?: number
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_admin: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_admin?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_admin?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      redeem_code_usages: {
        Row: {
          code_id: string
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          code_id: string
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          code_id?: string
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redeem_code_usages_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "redeem_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redeem_code_usages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      redeem_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          credits: number
          expires_at: string
          id: string
          max_uses: number
          note: string | null
          revoked: boolean
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          credits: number
          expires_at: string
          id?: string
          max_uses?: number
          note?: string | null
          revoked?: boolean
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          credits?: number
          expires_at?: string
          id?: string
          max_uses?: number
          note?: string | null
          revoked?: boolean
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "redeem_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          bonus_credits: number
          bonus_credits_used: number
          created_at: string
          credits_remaining: number
          credits_used: number
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bonus_credits?: number
          bonus_credits_used?: number
          created_at?: string
          credits_remaining?: number
          credits_used?: number
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bonus_credits?: number
          bonus_credits_used?: number
          created_at?: string
          credits_remaining?: number
          credits_used?: number
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_provider_keys: {
        Row: {
          base_url: string | null
          created_at: string
          encrypted_key: string
          id: string
          key_hint: string
          provider_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          base_url?: string | null
          created_at?: string
          encrypted_key: string
          id?: string
          key_hint: string
          provider_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          base_url?: string | null
          created_at?: string
          encrypted_key?: string
          id?: string
          key_hint?: string
          provider_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_provider_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      deduct_access_code_quota: { Args: { p_code: string }; Returns: Json }
      deduct_subscription_credit: { Args: { p_user_id: string }; Returns: Json }
      is_access_code_valid: { Args: { p_code: string }; Returns: boolean }
      redeem_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: Json
      }
      reset_monthly_credits: { Args: { p_user_id: string }; Returns: Json }
      validate_access_code: { Args: { p_code: string }; Returns: Json }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
