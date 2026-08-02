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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      access_points: {
        Row: {
          code: string
          created_at: string
          destination_path: string
          id: string
          label: string
          last_scanned_at: string | null
          neighborhood_id: string
          scan_count: number
          status: Database["public"]["Enums"]["access_point_status"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          destination_path: string
          id?: string
          label: string
          last_scanned_at?: string | null
          neighborhood_id: string
          scan_count?: number
          status?: Database["public"]["Enums"]["access_point_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          destination_path?: string
          id?: string
          label?: string
          last_scanned_at?: string | null
          neighborhood_id?: string
          scan_count?: number
          status?: Database["public"]["Enums"]["access_point_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_points_neighborhood_id_fkey"
            columns: ["neighborhood_id"]
            isOneToOne: false
            referencedRelation: "neighborhoods"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      moderation_actions: {
        Row: {
          action: Database["public"]["Enums"]["moderation_action"]
          actor_id: string
          created_at: string
          id: string
          reason: string | null
          report_id: string | null
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Insert: {
          action: Database["public"]["Enums"]["moderation_action"]
          actor_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          report_id?: string | null
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Update: {
          action?: Database["public"]["Enums"]["moderation_action"]
          actor_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          report_id?: string | null
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target"]
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      neighborhoods: {
        Row: {
          about: string | null
          center_lat: number | null
          center_lng: number | null
          city: string
          civic_area_codes: string[]
          civic_provider: string | null
          created_at: string
          id: string
          location_type: Database["public"]["Enums"]["location_type"]
          name: string
          slug: string
          state_code: string | null
          status: Database["public"]["Enums"]["community_status"]
          tagline: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          about?: string | null
          center_lat?: number | null
          center_lng?: number | null
          city: string
          civic_area_codes?: string[]
          civic_provider?: string | null
          created_at?: string
          id?: string
          location_type?: Database["public"]["Enums"]["location_type"]
          name: string
          slug: string
          state_code?: string | null
          status?: Database["public"]["Enums"]["community_status"]
          tagline?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          about?: string | null
          center_lat?: number | null
          center_lng?: number | null
          city?: string
          civic_area_codes?: string[]
          civic_provider?: string | null
          created_at?: string
          id?: string
          location_type?: Database["public"]["Enums"]["location_type"]
          name?: string
          slug?: string
          state_code?: string | null
          status?: Database["public"]["Enums"]["community_status"]
          tagline?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      places: {
        Row: {
          address: string | null
          category: string
          created_at: string
          description: string | null
          hidden: boolean
          hours: string | null
          id: string
          name: string
          neighborhood_id: string
          phone: string | null
          removed: boolean
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          category: string
          created_at?: string
          description?: string | null
          hidden?: boolean
          hours?: string | null
          id?: string
          name: string
          neighborhood_id: string
          phone?: string | null
          removed?: boolean
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: string
          created_at?: string
          description?: string | null
          hidden?: boolean
          hours?: string | null
          id?: string
          name?: string
          neighborhood_id?: string
          phone?: string | null
          removed?: boolean
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "places_neighborhood_id_fkey"
            columns: ["neighborhood_id"]
            isOneToOne: false
            referencedRelation: "neighborhoods"
            referencedColumns: ["id"]
          },
        ]
      }
      post_participants: {
        Row: {
          created_at: string
          id: string
          note: string | null
          post_id: string
          role: Database["public"]["Enums"]["participation_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          post_id: string
          role: Database["public"]["Enums"]["participation_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          post_id?: string
          role?: Database["public"]["Enums"]["participation_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_participants_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string | null
          body: string
          capacity: number | null
          condition: string | null
          created_at: string
          expires_at: string | null
          going_count: number
          hidden: boolean
          id: string
          image_paths: string[]
          interested_count: number
          is_free: boolean | null
          location: string | null
          needed_by: string | null
          neighborhood_id: string
          price_cents: number | null
          slots: number | null
          starts_at: string | null
          status: Database["public"]["Enums"]["post_status"]
          title: string
          type: Database["public"]["Enums"]["post_type"]
          updated_at: string
          volunteer_count: number
        }
        Insert: {
          author_id?: string | null
          body: string
          capacity?: number | null
          condition?: string | null
          created_at?: string
          expires_at?: string | null
          going_count?: number
          hidden?: boolean
          id?: string
          image_paths?: string[]
          interested_count?: number
          is_free?: boolean | null
          location?: string | null
          needed_by?: string | null
          neighborhood_id: string
          price_cents?: number | null
          slots?: number | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          title: string
          type: Database["public"]["Enums"]["post_type"]
          updated_at?: string
          volunteer_count?: number
        }
        Update: {
          author_id?: string | null
          body?: string
          capacity?: number | null
          condition?: string | null
          created_at?: string
          expires_at?: string | null
          going_count?: number
          hidden?: boolean
          id?: string
          image_paths?: string[]
          interested_count?: number
          is_free?: boolean | null
          location?: string | null
          needed_by?: string | null
          neighborhood_id?: string
          price_cents?: number | null
          slots?: number | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          title?: string
          type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string
          volunteer_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_neighborhood_id_fkey"
            columns: ["neighborhood_id"]
            isOneToOne: false
            referencedRelation: "neighborhoods"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          about: string | null
          avatar_path: string | null
          created_at: string
          display_name: string
          home_neighborhood_id: string | null
          id: string
          updated_at: string
        }
        Insert: {
          about?: string | null
          avatar_path?: string | null
          created_at?: string
          display_name?: string
          home_neighborhood_id?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          about?: string | null
          avatar_path?: string | null
          created_at?: string
          display_name?: string
          home_neighborhood_id?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_home_neighborhood_id_fkey"
            columns: ["home_neighborhood_id"]
            isOneToOne: false
            referencedRelation: "neighborhoods"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          note: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target"]
          updated_at?: string
        }
        Relationships: []
      }
      saved_neighborhoods: {
        Row: {
          created_at: string
          id: string
          neighborhood_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          neighborhood_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          neighborhood_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_neighborhoods_neighborhood_id_fkey"
            columns: ["neighborhood_id"]
            isOneToOne: false
            referencedRelation: "neighborhoods"
            referencedColumns: ["id"]
          },
        ]
      }
      standing_events: {
        Row: {
          category: Database["public"]["Enums"]["standing_event_category"]
          created_at: string
          created_by: string | null
          days_of_week: number[]
          description: string | null
          end_day_offset: number
          end_time: string | null
          ends_on: string | null
          exception_note: string | null
          excluded_dates: string[]
          id: string
          image_attribution: string | null
          image_url: string | null
          image_verified_at: string | null
          last_verified_at: string | null
          neighborhood_id: string | null
          origin: string
          place_id: string | null
          source_key: string
          source_url: string
          start_time: string
          starts_on: string | null
          status: Database["public"]["Enums"]["standing_event_status"]
          timezone: string
          title: string
          updated_at: string
          venue_address: string | null
          venue_name: string
          verified_by: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["standing_event_category"]
          created_at?: string
          created_by?: string | null
          days_of_week: number[]
          description?: string | null
          end_day_offset?: number
          end_time?: string | null
          ends_on?: string | null
          exception_note?: string | null
          excluded_dates?: string[]
          id?: string
          image_attribution?: string | null
          image_url?: string | null
          image_verified_at?: string | null
          last_verified_at?: string | null
          neighborhood_id?: string | null
          origin?: string
          place_id?: string | null
          source_key: string
          source_url: string
          start_time: string
          starts_on?: string | null
          status?: Database["public"]["Enums"]["standing_event_status"]
          timezone?: string
          title: string
          updated_at?: string
          venue_address?: string | null
          venue_name: string
          verified_by?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["standing_event_category"]
          created_at?: string
          created_by?: string | null
          days_of_week?: number[]
          description?: string | null
          end_day_offset?: number
          end_time?: string | null
          ends_on?: string | null
          exception_note?: string | null
          excluded_dates?: string[]
          id?: string
          image_attribution?: string | null
          image_url?: string | null
          image_verified_at?: string | null
          last_verified_at?: string | null
          neighborhood_id?: string | null
          origin?: string
          place_id?: string | null
          source_key?: string
          source_url?: string
          start_time?: string
          starts_on?: string | null
          status?: Database["public"]["Enums"]["standing_event_status"]
          timezone?: string
          title?: string
          updated_at?: string
          venue_address?: string | null
          venue_name?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "standing_events_neighborhood_id_fkey"
            columns: ["neighborhood_id"]
            isOneToOne: false
            referencedRelation: "neighborhoods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standing_events_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      store_listings: {
        Row: {
          condition: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string
          hidden: boolean
          id: string
          image_paths: string[]
          neighborhood_id: string
          pickup_notes: string | null
          price_cents: number
          removed: boolean
          reserved_until: string | null
          status: Database["public"]["Enums"]["store_listing_status"]
          stripe_price_lookup_key: string | null
          stripe_product_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          condition?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description: string
          hidden?: boolean
          id?: string
          image_paths?: string[]
          neighborhood_id: string
          pickup_notes?: string | null
          price_cents: number
          removed?: boolean
          reserved_until?: string | null
          status?: Database["public"]["Enums"]["store_listing_status"]
          stripe_price_lookup_key?: string | null
          stripe_product_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          condition?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string
          hidden?: boolean
          id?: string
          image_paths?: string[]
          neighborhood_id?: string
          pickup_notes?: string | null
          price_cents?: number
          removed?: boolean
          reserved_until?: string | null
          status?: Database["public"]["Enums"]["store_listing_status"]
          stripe_price_lookup_key?: string | null
          stripe_product_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_listings_neighborhood_id_fkey"
            columns: ["neighborhood_id"]
            isOneToOne: false
            referencedRelation: "neighborhoods"
            referencedColumns: ["id"]
          },
        ]
      }
      store_orders: {
        Row: {
          amount_cents: number
          buyer_email: string | null
          buyer_id: string | null
          created_at: string
          currency: string
          environment: string
          fulfilled_at: string | null
          id: string
          listing_id: string
          paid_at: string | null
          pickup_note: string | null
          status: Database["public"]["Enums"]["store_order_status"]
          stripe_payment_intent_id: string | null
          stripe_session_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          buyer_email?: string | null
          buyer_id?: string | null
          created_at?: string
          currency?: string
          environment?: string
          fulfilled_at?: string | null
          id?: string
          listing_id: string
          paid_at?: string | null
          pickup_note?: string | null
          status?: Database["public"]["Enums"]["store_order_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          buyer_email?: string | null
          buyer_id?: string | null
          created_at?: string
          currency?: string
          environment?: string
          fulfilled_at?: string | null
          id?: string
          listing_id?: string
          paid_at?: string | null
          pickup_note?: string | null
          status?: Database["public"]["Enums"]["store_order_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "store_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          author_id: string
          author_last_read_at: string | null
          created_at: string
          id: string
          initiator_id: string
          initiator_last_read_at: string | null
          last_message_at: string
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          author_last_read_at?: string | null
          created_at?: string
          id?: string
          initiator_id: string
          initiator_last_read_at?: string | null
          last_message_at?: string
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_last_read_at?: string | null
          created_at?: string
          id?: string
          initiator_id?: string
          initiator_last_read_at?: string | null
          last_message_at?: string
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "threads_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_blocked_pair: { Args: { _a: string; _b: string }; Returns: boolean }
      is_published_community: {
        Args: { _neighborhood_id: string }
        Returns: boolean
      }
      is_thread_member: {
        Args: { _thread_id: string; _user_id: string }
        Returns: boolean
      }
      record_access_point_scan: { Args: { _code: string }; Returns: string }
    }
    Enums: {
      access_point_status: "active" | "paused"
      app_role: "admin" | "moderator" | "member"
      community_status: "draft" | "published"
      location_type: "neighborhood" | "town" | "village" | "city"
      moderation_action: "dismiss" | "hide" | "remove" | "restore"
      participation_role: "going" | "volunteer" | "interested"
      post_status: "active" | "completed" | "expired" | "removed"
      post_type: "plan" | "marketplace" | "volunteer" | "bulletin"
      report_reason:
        | "spam"
        | "unsafe"
        | "wrong_board"
        | "not_neighborly"
        | "other"
      report_status: "open" | "dismissed" | "actioned"
      report_target: "post" | "place" | "profile" | "thread" | "store_listing"
      standing_event_category:
        | "trivia"
        | "karaoke"
        | "bingo"
        | "games"
        | "drag"
        | "live_music"
        | "show_tunes"
        | "nightlife"
      standing_event_status: "draft" | "active" | "paused"
      store_listing_status:
        | "draft"
        | "available"
        | "reserved"
        | "sold"
        | "archived"
      store_order_status:
        | "pending"
        | "paid"
        | "cancelled"
        | "refunded"
        | "fulfilled"
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
      access_point_status: ["active", "paused"],
      app_role: ["admin", "moderator", "member"],
      community_status: ["draft", "published"],
      location_type: ["neighborhood", "town", "village", "city"],
      moderation_action: ["dismiss", "hide", "remove", "restore"],
      participation_role: ["going", "volunteer", "interested"],
      post_status: ["active", "completed", "expired", "removed"],
      post_type: ["plan", "marketplace", "volunteer", "bulletin"],
      report_reason: [
        "spam",
        "unsafe",
        "wrong_board",
        "not_neighborly",
        "other",
      ],
      report_status: ["open", "dismissed", "actioned"],
      report_target: ["post", "place", "profile", "thread", "store_listing"],
      standing_event_category: [
        "trivia",
        "karaoke",
        "bingo",
        "games",
        "drag",
        "live_music",
        "show_tunes",
        "nightlife",
      ],
      standing_event_status: ["draft", "active", "paused"],
      store_listing_status: [
        "draft",
        "available",
        "reserved",
        "sold",
        "archived",
      ],
      store_order_status: [
        "pending",
        "paid",
        "cancelled",
        "refunded",
        "fulfilled",
      ],
    },
  },
} as const
