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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_match_suggestions: {
        Row: {
          ai_score: number
          created_at: string
          found_item_id: string
          id: string
          image_similarity: number | null
          location_proximity: number | null
          lost_item_id: string
          reasoning: string | null
          reviewed_at: string | null
          status: string
          text_similarity: number | null
        }
        Insert: {
          ai_score?: number
          created_at?: string
          found_item_id: string
          id?: string
          image_similarity?: number | null
          location_proximity?: number | null
          lost_item_id: string
          reasoning?: string | null
          reviewed_at?: string | null
          status?: string
          text_similarity?: number | null
        }
        Update: {
          ai_score?: number
          created_at?: string
          found_item_id?: string
          id?: string
          image_similarity?: number | null
          location_proximity?: number | null
          lost_item_id?: string
          reasoning?: string | null
          reviewed_at?: string | null
          status?: string
          text_similarity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_match_suggestions_found_item_id_fkey"
            columns: ["found_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_match_suggestions_lost_item_id_fkey"
            columns: ["lost_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_notifications: {
        Row: {
          created_at: string
          id: string
          item_id: string | null
          message: string
          metadata: Json | null
          notification_type: string
          sent: boolean
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id?: string | null
          message: string
          metadata?: Json | null
          notification_type: string
          sent?: boolean
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string | null
          message?: string
          metadata?: Json | null
          notification_type?: string
          sent?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_notifications_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tags: {
        Row: {
          auto_description: string | null
          auto_title: string | null
          created_at: string
          embedding: Json | null
          id: string
          item_id: string
          objects_detected: string[]
          tags: string[]
          updated_at: string
        }
        Insert: {
          auto_description?: string | null
          auto_title?: string | null
          created_at?: string
          embedding?: Json | null
          id?: string
          item_id: string
          objects_detected?: string[]
          tags?: string[]
          updated_at?: string
        }
        Update: {
          auto_description?: string | null
          auto_title?: string | null
          created_at?: string
          embedding?: Json | null
          id?: string
          item_id?: string
          objects_detected?: string[]
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tags_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      claims: {
        Row: {
          claimant_id: string
          created_at: string
          id: string
          item_id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          verification_answers: Json | null
        }
        Insert: {
          claimant_id: string
          created_at?: string
          id?: string
          item_id: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          verification_answers?: Json | null
        }
        Update: {
          claimant_id?: string
          created_at?: string
          id?: string
          item_id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          verification_answers?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "claims_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount: number
          created_at: string
          donor_email: string | null
          donor_user_id: string | null
          id: string
          razorpay_order_id: string
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          donor_email?: string | null
          donor_user_id?: string | null
          id?: string
          razorpay_order_id: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          donor_email?: string | null
          donor_user_id?: string | null
          id?: string
          razorpay_order_id?: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
        }
        Relationships: []
      }
      guest_submissions: {
        Row: {
          additional_info: string | null
          category: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          date_lost_found: string | null
          description: string
          email: string
          id: string
          item_type: string
          latitude: number | null
          location: string
          longitude: number | null
          photos: string[] | null
          published_item_id: string | null
          reward: string | null
          status: string
          title: string
          token: string
          verification_questions: string[] | null
        }
        Insert: {
          additional_info?: string | null
          category: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          date_lost_found?: string | null
          description: string
          email: string
          id?: string
          item_type: string
          latitude?: number | null
          location: string
          longitude?: number | null
          photos?: string[] | null
          published_item_id?: string | null
          reward?: string | null
          status?: string
          title: string
          token: string
          verification_questions?: string[] | null
        }
        Update: {
          additional_info?: string | null
          category?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          date_lost_found?: string | null
          description?: string
          email?: string
          id?: string
          item_type?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          photos?: string[] | null
          published_item_id?: string | null
          reward?: string | null
          status?: string
          title?: string
          token?: string
          verification_questions?: string[] | null
        }
        Relationships: []
      }
      items: {
        Row: {
          additional_info: string | null
          category: string
          contact_email: string
          contact_name: string
          contact_phone: string
          created_at: string
          date_lost_found: string
          description: string
          id: string
          item_type: string
          latitude: number | null
          location: string
          longitude: number | null
          photos: Json | null
          reward: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          verification_questions: Json | null
        }
        Insert: {
          additional_info?: string | null
          category: string
          contact_email: string
          contact_name: string
          contact_phone: string
          created_at?: string
          date_lost_found: string
          description: string
          id?: string
          item_type: string
          latitude?: number | null
          location: string
          longitude?: number | null
          photos?: Json | null
          reward?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          verification_questions?: Json | null
        }
        Update: {
          additional_info?: string | null
          category?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          created_at?: string
          date_lost_found?: string
          description?: string
          id?: string
          item_type?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          photos?: Json | null
          reward?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          verification_questions?: Json | null
        }
        Relationships: []
      }
      matches: {
        Row: {
          created_at: string
          found_item_id: string | null
          id: string
          lost_item_id: string | null
          similarity_score: number | null
          status: string
        }
        Insert: {
          created_at?: string
          found_item_id?: string | null
          id?: string
          lost_item_id?: string | null
          similarity_score?: number | null
          status?: string
        }
        Update: {
          created_at?: string
          found_item_id?: string | null
          id?: string
          lost_item_id?: string | null
          similarity_score?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_found_item_id_fkey"
            columns: ["found_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_lost_item_id_fkey"
            columns: ["lost_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean | null
          related_item_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean | null
          related_item_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean | null
          related_item_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_item_id_fkey"
            columns: ["related_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          id: string
          payment_type: string
          razorpay_order_id: string
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          id?: string
          payment_type?: string
          razorpay_order_id: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          id?: string
          payment_type?: string
          razorpay_order_id?: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_verified: boolean | null
          phone: string | null
          updated_at: string
          verification_payment_id: string | null
          verified_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_verified?: boolean | null
          phone?: string | null
          updated_at?: string
          verification_payment_id?: string | null
          verified_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          phone?: string | null
          updated_at?: string
          verification_payment_id?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_info: Json | null
          endpoint: string
          id: string
          lat: number | null
          lng: number | null
          p256dh: string
          radius_km: number
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_info?: Json | null
          endpoint: string
          id?: string
          lat?: number | null
          lng?: number | null
          p256dh: string
          radius_km?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_info?: Json | null
          endpoint?: string
          id?: string
          lat?: number | null
          lng?: number | null
          p256dh?: string
          radius_km?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reason: string
          reported_item_id: string | null
          reported_user_id: string | null
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reported_item_id?: string | null
          reported_user_id?: string | null
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reported_item_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      verifications: {
        Row: {
          block_number: number | null
          blockchain_hash: string | null
          created_at: string
          id: string
          item_id: string
          status: string
          transaction_hash: string | null
          updated_at: string
          user_id: string
          verification_data: Json | null
          verification_type: string
          verified_at: string | null
        }
        Insert: {
          block_number?: number | null
          blockchain_hash?: string | null
          created_at?: string
          id?: string
          item_id: string
          status?: string
          transaction_hash?: string | null
          updated_at?: string
          user_id: string
          verification_data?: Json | null
          verification_type?: string
          verified_at?: string | null
        }
        Update: {
          block_number?: number | null
          blockchain_hash?: string | null
          created_at?: string
          id?: string
          item_id?: string
          status?: string
          transaction_hash?: string | null
          updated_at?: string
          user_id?: string
          verification_data?: Json | null
          verification_type?: string
          verified_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_conversations: {
        Args: { p_user_id: string }
        Returns: {
          last_message: string
          last_message_time: string
          other_user_id: string
          unread_count: number
          user_email: string
          user_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_moderator: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
