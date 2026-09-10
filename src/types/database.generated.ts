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
      bookmark_collections: {
        Row: {
          bookmark_id: number
          collection_id: number
          created_at: string
          sort_order: string
          user_id: string
        }
        Insert: {
          bookmark_id: number
          collection_id: number
          created_at?: string
          sort_order: string
          user_id: string
        }
        Update: {
          bookmark_id?: number
          collection_id?: number
          created_at?: string
          sort_order?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmark_collections_bookmark_fkey"
            columns: ["user_id", "bookmark_id"]
            isOneToOne: false
            referencedRelation: "bookmarks"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "bookmark_collections_collection_fkey"
            columns: ["user_id", "collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      bookmark_events: {
        Row: {
          bookmark_id: number
          created_at: string
          event_id: string
          id: number
          user_id: string
        }
        Insert: {
          bookmark_id: number
          created_at?: string
          event_id: string
          id?: never
          user_id: string
        }
        Update: {
          bookmark_id?: number
          created_at?: string
          event_id?: string
          id?: never
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmark_events_bookmark_fkey"
            columns: ["user_id", "bookmark_id"]
            isOneToOne: false
            referencedRelation: "bookmarks"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      bookmark_stats: {
        Row: {
          bookmark_id: number
          updated_at: string
          user_id: string
          visit_count: number
        }
        Insert: {
          bookmark_id: number
          updated_at?: string
          user_id: string
          visit_count?: number
        }
        Update: {
          bookmark_id?: number
          updated_at?: string
          user_id?: string
          visit_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "bookmark_stats_bookmark_fkey"
            columns: ["user_id", "bookmark_id"]
            isOneToOne: false
            referencedRelation: "bookmarks"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      bookmark_tags: {
        Row: {
          bookmark_id: number
          created_at: string
          tag_id: number
          user_id: string
        }
        Insert: {
          bookmark_id: number
          created_at?: string
          tag_id: number
          user_id: string
        }
        Update: {
          bookmark_id?: number
          created_at?: string
          tag_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmark_tags_bookmark_fkey"
            columns: ["user_id", "bookmark_id"]
            isOneToOne: false
            referencedRelation: "bookmarks"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "bookmark_tags_tag_fkey"
            columns: ["user_id", "tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          client_request_id: string
          collection_count: number
          created_at: string
          domain: string | null
          favicon_asset_id: string | null
          favicon_url: string | null
          id: number
          metadata_generation: number
          metadata_status: string
          normalized_title: string | null
          og_image_asset_id: string | null
          og_image_url: string | null
          purge_after: string | null
          row_version: number
          title: string
          trashed_at: string | null
          updated_at: string
          url: string
          url_fingerprint: string | null
          user_id: string
        }
        Insert: {
          client_request_id: string
          collection_count?: number
          created_at?: string
          domain?: string | null
          favicon_asset_id?: string | null
          favicon_url?: string | null
          id?: never
          metadata_generation?: number
          metadata_status?: string
          normalized_title?: string | null
          og_image_asset_id?: string | null
          og_image_url?: string | null
          purge_after?: string | null
          row_version?: number
          title: string
          trashed_at?: string | null
          updated_at?: string
          url: string
          url_fingerprint?: string | null
          user_id: string
        }
        Update: {
          client_request_id?: string
          collection_count?: number
          created_at?: string
          domain?: string | null
          favicon_asset_id?: string | null
          favicon_url?: string | null
          id?: never
          metadata_generation?: number
          metadata_status?: string
          normalized_title?: string | null
          og_image_asset_id?: string | null
          og_image_url?: string | null
          purge_after?: string | null
          row_version?: number
          title?: string
          trashed_at?: string | null
          updated_at?: string
          url?: string
          url_fingerprint?: string | null
          user_id?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          bookmark_order_version: number
          child_order_version: number
          color: string
          created_at: string
          icon: string
          id: number
          name: string
          normalized_name: string | null
          parent_id: number | null
          row_version: number
          sort_order: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bookmark_order_version?: number
          child_order_version?: number
          color?: string
          created_at?: string
          icon?: string
          id?: never
          name: string
          normalized_name?: string | null
          parent_id?: number | null
          row_version?: number
          sort_order: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bookmark_order_version?: number
          child_order_version?: number
          color?: string
          created_at?: string
          icon?: string
          id?: never
          name?: string
          normalized_name?: string | null
          parent_id?: number | null
          row_version?: number
          sort_order?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_user_parent_fkey"
            columns: ["user_id", "parent_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      dashboard_preferences: {
        Row: {
          bookmark_sort: string
          collection_order_mode: string
          created_at: string
          desktop_collections_open: boolean
          desktop_tags_open: boolean
          mobile_collections_open: boolean
          mobile_tags_open: boolean
          root_collection_order_version: number
          row_version: number
          tag_order_mode: string
          tag_order_version: number
          theme: string
          updated_at: string
          user_id: string
          view_mode: string
        }
        Insert: {
          bookmark_sort?: string
          collection_order_mode?: string
          created_at?: string
          desktop_collections_open?: boolean
          desktop_tags_open?: boolean
          mobile_collections_open?: boolean
          mobile_tags_open?: boolean
          root_collection_order_version?: number
          row_version?: number
          tag_order_mode?: string
          tag_order_version?: number
          theme?: string
          updated_at?: string
          user_id: string
          view_mode?: string
        }
        Update: {
          bookmark_sort?: string
          collection_order_mode?: string
          created_at?: string
          desktop_collections_open?: boolean
          desktop_tags_open?: boolean
          mobile_collections_open?: boolean
          mobile_tags_open?: boolean
          root_collection_order_version?: number
          row_version?: number
          tag_order_mode?: string
          tag_order_version?: number
          theme?: string
          updated_at?: string
          user_id?: string
          view_mode?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_state: string
          avatar_source: string
          created_at: string
          custom_avatar_path: string | null
          deletion_requested_at: string | null
          generated_avatar_seed: string
          google_avatar_url: string | null
          onboarding_completed_at: string | null
          row_version: number
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          account_state?: string
          avatar_source?: string
          created_at?: string
          custom_avatar_path?: string | null
          deletion_requested_at?: string | null
          generated_avatar_seed?: string
          google_avatar_url?: string | null
          onboarding_completed_at?: string | null
          row_version?: number
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          account_state?: string
          avatar_source?: string
          created_at?: string
          custom_avatar_path?: string | null
          deletion_requested_at?: string | null
          generated_avatar_seed?: string
          google_avatar_url?: string | null
          onboarding_completed_at?: string | null
          row_version?: number
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: number
          name: string
          normalized_name: string | null
          row_version: number
          sort_order: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: never
          name: string
          normalized_name?: string | null
          row_version?: number
          sort_order: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: never
          name?: string
          normalized_name?: string | null
          row_version?: number
          sort_order?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_bookmarks_to_collection: {
        Args: {
          bookmark_ids: number[]
          collection_id: number
          sort_orders: string[]
        }
        Returns: number
      }
      create_bookmark: {
        Args: {
          client_request_id: string
          created_at?: string
          queue_name?: string
          title: string
          url: string
        }
        Returns: {
          client_request_id: string
          collection_count: number
          created_at: string
          domain: string | null
          favicon_asset_id: string | null
          favicon_url: string | null
          id: number
          metadata_generation: number
          metadata_status: string
          normalized_title: string | null
          og_image_asset_id: string | null
          og_image_url: string | null
          purge_after: string | null
          row_version: number
          title: string
          trashed_at: string | null
          updated_at: string
          url: string
          url_fingerprint: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "bookmarks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_bookmarks_forever: {
        Args: { bookmark_ids: number[] }
        Returns: number
      }
      delete_collection: {
        Args: { collection_id: number }
        Returns: {
          deleted_collection_count: number
          trashed_bookmark_count: number
        }[]
      }
      delete_tag: { Args: { tag_id: number }; Returns: number }
      get_transfer_job_status: {
        Args: { target_job_id: string }
        Returns: {
          created_at: string
          failed_count: number
          id: string
          kind: string
          processed_count: number
          public_error_code: string
          row_version: number
          selected_count: number
          state: string
          succeeded_count: number
          terminal_at: string
          updated_at: string
        }[]
      }
      move_bookmarks_to_collection: {
        Args: {
          bookmark_ids: number[]
          collection_id: number
          sort_orders: string[]
        }
        Returns: number
      }
      read_bookmark_asset_signing_paths: {
        Args: { bookmark_ids: number[]; include_og_image?: boolean }
        Returns: {
          asset_id: string
          asset_kind: string
          bookmark_id: number
          byte_size: number
          content_type: string
          height: number
          object_path: string
          width: number
        }[]
      }
      rebalance_bookmarks: {
        Args: {
          bookmark_ids: number[]
          collection_id: number
          expected_version: number
          sort_orders: string[]
        }
        Returns: number
      }
      rebalance_collections: {
        Args: {
          collection_ids: number[]
          expected_version: number
          parent_id: number
          sort_orders: string[]
        }
        Returns: number
      }
      rebalance_tags: {
        Args: {
          expected_version: number
          sort_orders: string[]
          tag_ids: number[]
        }
        Returns: number
      }
      record_bookmark_visits: {
        Args: { bookmark_ids: number[]; event_ids: string[] }
        Returns: number
      }
      remove_bookmarks_from_collection: {
        Args: { bookmark_ids: number[]; collection_id: number }
        Returns: number
      }
      reorder_bookmark: {
        Args: {
          bookmark_id: number
          collection_id: number
          expected_version: number
          next_bookmark_id: number
          previous_bookmark_id: number
          sort_order: string
        }
        Returns: number
      }
      reorder_collection: {
        Args: {
          collection_id: number
          expected_destination_version: number
          expected_source_version: number
          parent_id: number
          sort_order: string
        }
        Returns: {
          destination_version: number
          source_version: number
        }[]
      }
      reorder_tag: {
        Args: { expected_version: number; sort_order: string; tag_id: number }
        Returns: number
      }
      replace_bookmark_tags: {
        Args: { bookmark_id: number; tag_ids: number[] }
        Returns: number
      }
      request_bookmark_reenrichment: {
        Args: { bookmark_id: number; idempotency_key: string }
        Returns: string
      }
      restore_bookmarks: { Args: { bookmark_ids: number[] }; Returns: number }
      search_library: {
        Args: {
          bookmark_limit?: number
          collection_limit?: number
          query_text: string
        }
        Returns: {
          color: string
          domain: string
          favicon_url: string
          icon: string
          id: number
          name: string
          parent_id: number
          path: string
          result_kind: string
          result_order: number
          title: string
          url: string
        }[]
      }
      trash_bookmarks: { Args: { bookmark_ids: number[] }; Returns: number }
      worker_claim_bookmark_asset_cleanup: {
        Args: { batch_size: number; lease_seconds: number }
        Returns: {
          asset_id: string
          cleanup_attempt_count: number
          cleanup_lease_token: string
          object_path: string
          user_id: string
        }[]
      }
      worker_claim_enrichment_message: {
        Args: {
          lease_seconds: number
          target_generation: string
          target_message_id: string
          target_queue_name: string
          target_request_id: string
        }
        Returns: Json
      }
      worker_claim_transfer_message: {
        Args: {
          lease_seconds: number
          target_job_id: string
          target_message_id: string
          target_queue_name: string
          target_work_kind: string
        }
        Returns: Json
      }
      worker_delete_terminal_message: {
        Args: { target_message_id: string; target_queue_name: string }
        Returns: boolean
      }
      worker_finish_bookmark_asset_cleanup: {
        Args: {
          retry_at?: string
          succeeded: boolean
          target_asset_id: string
          target_cleanup_lease_token: string
        }
        Returns: boolean
      }
      worker_finish_enrichment_message: {
        Args: {
          result_domain?: string
          result_failure_class?: string
          result_favicon_asset_id?: string
          result_internal_error?: string
          result_og_image_asset_id?: string
          result_public_error_code?: string
          result_title?: string
          retry_at?: string
          succeeded: boolean
          target_generation: string
          target_lease_token: string
          target_message_id: string
          target_queue_name: string
          target_request_id: string
        }
        Returns: string
      }
      worker_finish_transfer_message: {
        Args: {
          target_failed_count: number
          target_internal_error?: string
          target_job_id: string
          target_lease_token: string
          target_message_id: string
          target_processed_count: number
          target_public_error_code?: string
          target_queue_name: string
          target_retry_at?: string
          target_state: string
          target_succeeded_count: number
        }
        Returns: string
      }
      worker_mark_bookmark_asset_ready: {
        Args: {
          target_asset_id: string
          target_byte_size: number
          target_checksum: string
          target_generation: string
          target_height: number
          target_lease_token: string
          target_request_id: string
          target_width: number
        }
        Returns: boolean
      }
      worker_operator_snapshot: { Args: never; Returns: Json }
      worker_read_enrichment_bookmark_id: {
        Args: {
          target_generation: string
          target_lease_token: string
          target_request_id: string
        }
        Returns: string
      }
      worker_read_queue: {
        Args: {
          batch_size: number
          target_queue_name: string
          visibility_seconds: number
        }
        Returns: {
          delivery_count: number
          enqueued_at: string
          envelope: Json
          message_id: string
          visible_at: string
        }[]
      }
      worker_reject_poison_message: {
        Args: {
          target_delivery_count: number
          target_message_id: string
          target_queue_name: string
          target_reason_code: string
        }
        Returns: boolean
      }
      worker_renew_enrichment_lease: {
        Args: {
          lease_seconds: number
          target_generation: string
          target_lease_token: string
          target_message_id: string
          target_queue_name: string
          target_request_id: string
          visibility_seconds: number
        }
        Returns: boolean
      }
      worker_renew_transfer_lease: {
        Args: {
          lease_seconds: number
          target_job_id: string
          target_lease_token: string
          target_message_id: string
          target_queue_name: string
          visibility_seconds: number
        }
        Returns: boolean
      }
      worker_reserve_bookmark_asset: {
        Args: {
          target_asset_id: string
          target_content_type: string
          target_generation: string
          target_kind: string
          target_lease_token: string
          target_request_id: string
        }
        Returns: string
      }
      worker_start_enrichment_attempt: {
        Args: {
          target_generation: string
          target_lease_token: string
          target_request_id: string
        }
        Returns: boolean
      }
      worker_start_transfer_attempt: {
        Args: { target_job_id: string; target_lease_token: string }
        Returns: boolean
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
