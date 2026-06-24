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
      ad_applications: {
        Row: {
          ad_description: string
          ad_tagline: string
          ad_title: string
          admin_note: string
          amount_thb: number
          budget_px: number
          company: string
          contact_name: string
          created_at: string
          cta_label: string
          duration_days: number
          email: string
          id: string
          image_url: string
          notes: string
          package: Database["public"]["Enums"]["ad_package"]
          paid_at: string | null
          phone: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["ad_application_status"]
          target_url: string
          updated_at: string
          user_id: string
          website: string
        }
        Insert: {
          ad_description?: string
          ad_tagline?: string
          ad_title: string
          admin_note?: string
          amount_thb?: number
          budget_px?: number
          company?: string
          contact_name: string
          created_at?: string
          cta_label?: string
          duration_days?: number
          email: string
          id?: string
          image_url: string
          notes?: string
          package?: Database["public"]["Enums"]["ad_package"]
          paid_at?: string | null
          phone?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["ad_application_status"]
          target_url: string
          updated_at?: string
          user_id: string
          website?: string
        }
        Update: {
          ad_description?: string
          ad_tagline?: string
          ad_title?: string
          admin_note?: string
          amount_thb?: number
          budget_px?: number
          company?: string
          contact_name?: string
          created_at?: string
          cta_label?: string
          duration_days?: number
          email?: string
          id?: string
          image_url?: string
          notes?: string
          package?: Database["public"]["Enums"]["ad_package"]
          paid_at?: string | null
          phone?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["ad_application_status"]
          target_url?: string
          updated_at?: string
          user_id?: string
          website?: string
        }
        Relationships: []
      }
      ad_campaigns: {
        Row: {
          advertiser_user_id: string
          application_id: string | null
          clicks: number
          created_at: string
          cta_label: string
          end_at: string | null
          id: string
          image_url: string
          impressions: number
          package: Database["public"]["Enums"]["ad_package"]
          price_px: number
          promotion_text: string
          rejection_reason: string
          start_at: string
          status: Database["public"]["Enums"]["ad_status"]
          tagline: string
          target_url: string
          title: string
          updated_at: string
        }
        Insert: {
          advertiser_user_id: string
          application_id?: string | null
          clicks?: number
          created_at?: string
          cta_label?: string
          end_at?: string | null
          id?: string
          image_url: string
          impressions?: number
          package?: Database["public"]["Enums"]["ad_package"]
          price_px?: number
          promotion_text?: string
          rejection_reason?: string
          start_at?: string
          status?: Database["public"]["Enums"]["ad_status"]
          tagline?: string
          target_url: string
          title: string
          updated_at?: string
        }
        Update: {
          advertiser_user_id?: string
          application_id?: string | null
          clicks?: number
          created_at?: string
          cta_label?: string
          end_at?: string | null
          id?: string
          image_url?: string
          impressions?: number
          package?: Database["public"]["Enums"]["ad_package"]
          price_px?: number
          promotion_text?: string
          rejection_reason?: string
          start_at?: string
          status?: Database["public"]["Enums"]["ad_status"]
          tagline?: string
          target_url?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ad_events: {
        Row: {
          ad_id: string
          created_at: string
          event_type: Database["public"]["Enums"]["ad_event_type"]
          id: string
          placement: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          ad_id: string
          created_at?: string
          event_type: Database["public"]["Enums"]["ad_event_type"]
          id?: string
          placement?: string
          session_id?: string
          user_id?: string | null
        }
        Update: {
          ad_id?: string
          created_at?: string
          event_type?: Database["public"]["Enums"]["ad_event_type"]
          id?: string
          placement?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_events_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          metadata: Json
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string
          target_type?: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      aml_flags: {
        Row: {
          admin_note: string
          created_at: string
          details: Json
          flag_type: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string
          created_at?: string
          details?: Json
          flag_type: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string
          created_at?: string
          details?: Json
          flag_type?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      app_feedback: {
        Row: {
          admin_note: string
          created_at: string
          feature: string
          id: string
          message: string
          project_id: string | null
          rating: number
          resolved_at: string | null
          resolved_by: string | null
          route: string
          status: string
          updated_at: string
          user_agent: string
          user_id: string
          viewport: string
        }
        Insert: {
          admin_note?: string
          created_at?: string
          feature?: string
          id?: string
          message?: string
          project_id?: string | null
          rating: number
          resolved_at?: string | null
          resolved_by?: string | null
          route?: string
          status?: string
          updated_at?: string
          user_agent?: string
          user_id: string
          viewport?: string
        }
        Update: {
          admin_note?: string
          created_at?: string
          feature?: string
          id?: string
          message?: string
          project_id?: string | null
          rating?: number
          resolved_at?: string | null
          resolved_by?: string | null
          route?: string
          status?: string
          updated_at?: string
          user_agent?: string
          user_id?: string
          viewport?: string
        }
        Relationships: []
      }
      cashout_requests: {
        Row: {
          bank_info: Json
          created_at: string
          fee_px: number
          gross_px: number
          id: string
          net_px: number
          processed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          bank_info?: Json
          created_at?: string
          fee_px?: number
          gross_px: number
          id?: string
          net_px: number
          processed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          bank_info?: Json
          created_at?: string
          fee_px?: number
          gross_px?: number
          id?: string
          net_px?: number
          processed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      collab_requests: {
        Row: {
          attached_project_ids: string[]
          collab_types: string[]
          created_at: string
          external_drive_url: string | null
          id: string
          message: string
          other_type_note: string | null
          project_id: string | null
          recipient_id: string
          sender_id: string
          status: Database["public"]["Enums"]["collab_status"]
          timeline: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          attached_project_ids?: string[]
          collab_types?: string[]
          created_at?: string
          external_drive_url?: string | null
          id?: string
          message: string
          other_type_note?: string | null
          project_id?: string | null
          recipient_id: string
          sender_id: string
          status?: Database["public"]["Enums"]["collab_status"]
          timeline?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          attached_project_ids?: string[]
          collab_types?: string[]
          created_at?: string
          external_drive_url?: string | null
          id?: string
          message?: string
          other_type_note?: string | null
          project_id?: string | null
          recipient_id?: string
          sender_id?: string
          status?: Database["public"]["Enums"]["collab_status"]
          timeline?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      collection_items: {
        Row: {
          added_at: string
          collection_id: string
          project_id: string
        }
        Insert: {
          added_at?: string
          collection_id: string
          project_id: string
        }
        Update: {
          added_at?: string
          collection_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          category: string
          cover_url: string
          created_at: string
          description: string
          id: string
          is_public: boolean
          item_count: number
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          category?: string
          cover_url?: string
          created_at?: string
          description?: string
          id?: string
          is_public?: boolean
          item_count?: number
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          cover_url?: string
          created_at?: string
          description?: string
          id?: string
          is_public?: boolean
          item_count?: number
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          created_at: string
          draft_md: string
          id: string
          job_id: string | null
          payload: Json
          status: Database["public"]["Enums"]["contract_status"]
          title: string
          type: Database["public"]["Enums"]["contract_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          draft_md?: string
          id?: string
          job_id?: string | null
          payload?: Json
          status?: Database["public"]["Enums"]["contract_status"]
          title?: string
          type?: Database["public"]["Enums"]["contract_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          draft_md?: string
          id?: string
          job_id?: string | null
          payload?: Json
          status?: Database["public"]["Enums"]["contract_status"]
          title?: string
          type?: Database["public"]["Enums"]["contract_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          client_id: string
          created_at: string
          freelancer_id: string
          id: string
          kind: string
          last_message_at: string
          project_id: string | null
          project_title: string
          request_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          freelancer_id: string
          id?: string
          kind: string
          last_message_at?: string
          project_id?: string | null
          project_title?: string
          request_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          freelancer_id?: string
          id?: string
          kind?: string
          last_message_at?: string
          project_id?: string | null
          project_title?: string
          request_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: []
      }
      gift_limits_config: {
        Row: {
          daily_limit_unverified: number
          daily_limit_verified: number
          hold_hours: number
          id: number
          max_topup_per_tx: number
          min_account_age_hours: number
          updated_at: string
          velocity_per_hour: number
        }
        Insert: {
          daily_limit_unverified?: number
          daily_limit_verified?: number
          hold_hours?: number
          id?: number
          max_topup_per_tx?: number
          min_account_age_hours?: number
          updated_at?: string
          velocity_per_hour?: number
        }
        Update: {
          daily_limit_unverified?: number
          daily_limit_verified?: number
          hold_hours?: number
          id?: number
          max_topup_per_tx?: number
          min_account_age_hours?: number
          updated_at?: string
          velocity_per_hour?: number
        }
        Relationships: []
      }
      gift_transactions: {
        Row: {
          created_at: string
          gift_id: string
          id: string
          message: string
          price_px: number
          project_id: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          gift_id: string
          id?: string
          message?: string
          price_px: number
          project_id?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          gift_id?: string
          id?: string
          message?: string
          price_px?: number
          project_id?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_transactions_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
        ]
      }
      gifts: {
        Row: {
          active: boolean
          code: string
          created_at: string
          display_order: number
          icon: string
          id: string
          name_en: string
          name_th: string
          price_px: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          display_order?: number
          icon: string
          id?: string
          name_en: string
          name_th: string
          price_px: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          display_order?: number
          icon?: string
          id?: string
          name_en?: string
          name_th?: string
          price_px?: number
        }
        Relationships: []
      }
      hiring_requests: {
        Row: {
          budget: Database["public"]["Enums"]["hire_budget"] | null
          budget_amount: number | null
          client_id: string | null
          client_name: string
          created_at: string
          deadline: string | null
          email: string
          freelancer_id: string
          id: string
          message: string | null
          phone: string | null
          project_id: string | null
          project_title: string
          status: Database["public"]["Enums"]["hire_status"]
          updated_at: string
        }
        Insert: {
          budget?: Database["public"]["Enums"]["hire_budget"] | null
          budget_amount?: number | null
          client_id?: string | null
          client_name: string
          created_at?: string
          deadline?: string | null
          email: string
          freelancer_id: string
          id?: string
          message?: string | null
          phone?: string | null
          project_id?: string | null
          project_title: string
          status?: Database["public"]["Enums"]["hire_status"]
          updated_at?: string
        }
        Update: {
          budget?: Database["public"]["Enums"]["hire_budget"] | null
          budget_amount?: number | null
          client_id?: string | null
          client_name?: string
          created_at?: string
          deadline?: string | null
          email?: string
          freelancer_id?: string
          id?: string
          message?: string | null
          phone?: string | null
          project_id?: string | null
          project_title?: string
          status?: Database["public"]["Enums"]["hire_status"]
          updated_at?: string
        }
        Relationships: []
      }
      image_likes: {
        Row: {
          created_at: string
          image_url: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          image_url: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          image_url?: string
          project_id?: string
          user_id?: string
        }
        Relationships: []
      }
      image_shares: {
        Row: {
          created_at: string
          id: string
          image_url: string
          platform: string
          project_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          platform: string
          project_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          platform?: string
          project_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      inspire_boards: {
        Row: {
          cover_url: string
          created_at: string
          id: string
          item_count: number
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          cover_url?: string
          created_at?: string
          id?: string
          item_count?: number
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          cover_url?: string
          created_at?: string
          id?: string
          item_count?: number
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      inspire_items: {
        Row: {
          added_at: string
          board_id: string
          id: string
          image_url: string
          project_id: string
        }
        Insert: {
          added_at?: string
          board_id: string
          id?: string
          image_url: string
          project_id: string
        }
        Update: {
          added_at?: string
          board_id?: string
          id?: string
          image_url?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspire_items_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "inspire_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          applicant_id: string
          cover_letter: string
          created_at: string
          id: string
          job_id: string
          portfolio_project_ids: string[]
          status: Database["public"]["Enums"]["job_application_status"]
          updated_at: string
        }
        Insert: {
          applicant_id: string
          cover_letter?: string
          created_at?: string
          id?: string
          job_id: string
          portfolio_project_ids?: string[]
          status?: Database["public"]["Enums"]["job_application_status"]
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          cover_letter?: string
          created_at?: string
          id?: string
          job_id?: string
          portfolio_project_ids?: string[]
          status?: Database["public"]["Enums"]["job_application_status"]
          updated_at?: string
        }
        Relationships: []
      }
      job_match_notifications: {
        Row: {
          created_at: string
          id: string
          is_dismissed: boolean
          is_read: boolean
          job_id: string
          match_reasons: string[]
          match_score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          job_id: string
          match_reasons?: string[]
          match_score?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          job_id?: string
          match_reasons?: string[]
          match_score?: number
          user_id?: string
        }
        Relationships: []
      }
      job_posts: {
        Row: {
          applicants_count: number
          attached_cv_url: string | null
          attached_portfolio_ids: string[]
          budget_max: number | null
          budget_min: number | null
          budget_type: Database["public"]["Enums"]["job_budget_type"]
          created_at: string
          deadline: string | null
          description: string
          employment_type: string
          id: string
          location: string
          location_type: Database["public"]["Enums"]["job_location_type"]
          post_type: string
          posted_by: string
          poster_role: string
          role_category: string
          skills: string[]
          status: Database["public"]["Enums"]["job_status"]
          studio_id: string | null
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          applicants_count?: number
          attached_cv_url?: string | null
          attached_portfolio_ids?: string[]
          budget_max?: number | null
          budget_min?: number | null
          budget_type?: Database["public"]["Enums"]["job_budget_type"]
          created_at?: string
          deadline?: string | null
          description?: string
          employment_type?: string
          id?: string
          location?: string
          location_type?: Database["public"]["Enums"]["job_location_type"]
          post_type?: string
          posted_by: string
          poster_role?: string
          role_category?: string
          skills?: string[]
          status?: Database["public"]["Enums"]["job_status"]
          studio_id?: string | null
          title: string
          updated_at?: string
          views?: number
        }
        Update: {
          applicants_count?: number
          attached_cv_url?: string | null
          attached_portfolio_ids?: string[]
          budget_max?: number | null
          budget_min?: number | null
          budget_type?: Database["public"]["Enums"]["job_budget_type"]
          created_at?: string
          deadline?: string | null
          description?: string
          employment_type?: string
          id?: string
          location?: string
          location_type?: Database["public"]["Enums"]["job_location_type"]
          post_type?: string
          posted_by?: string
          poster_role?: string
          role_category?: string
          skills?: string[]
          status?: Database["public"]["Enums"]["job_status"]
          studio_id?: string | null
          title?: string
          updated_at?: string
          views?: number
        }
        Relationships: []
      }
      kyc_requests: {
        Row: {
          admin_note: string
          contact_note: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string
          contact_note?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string
          contact_note?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          attachment_url?: string | null
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          active_studio_id: string | null
          avatar_url: string | null
          bio: string | null
          cover_url: string
          created_at: string
          display_name: string
          email: string | null
          experience: Json
          facebook: string | null
          frozen_at: string | null
          frozen_reason: string
          id: string
          instagram: string | null
          is_verified: boolean
          line_id: string | null
          location: string
          notify_email: boolean
          notify_hire: boolean
          notify_job_match: boolean
          onboarding_visits: Json
          phone: string | null
          preferred_categories: string[]
          preferred_employment_types: string[]
          risk_score: number
          role: string | null
          skills: string[]
          updated_at: string
          username: string | null
          verified_at: string | null
          verified_by: string | null
          website: string | null
        }
        Insert: {
          account_status?: string
          active_studio_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string
          created_at?: string
          display_name?: string
          email?: string | null
          experience?: Json
          facebook?: string | null
          frozen_at?: string | null
          frozen_reason?: string
          id: string
          instagram?: string | null
          is_verified?: boolean
          line_id?: string | null
          location?: string
          notify_email?: boolean
          notify_hire?: boolean
          notify_job_match?: boolean
          phone?: string | null
          preferred_categories?: string[]
          preferred_employment_types?: string[]
          risk_score?: number
          role?: string | null
          skills?: string[]
          updated_at?: string
          username?: string | null
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
        }
        Update: {
          account_status?: string
          active_studio_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string
          created_at?: string
          display_name?: string
          email?: string | null
          experience?: Json
          facebook?: string | null
          frozen_at?: string | null
          frozen_reason?: string
          id?: string
          instagram?: string | null
          is_verified?: boolean
          line_id?: string | null
          location?: string
          notify_email?: boolean
          notify_hire?: boolean
          notify_job_match?: boolean
          phone?: string | null
          preferred_categories?: string[]
          preferred_employment_types?: string[]
          risk_score?: number
          role?: string | null
          skills?: string[]
          updated_at?: string
          username?: string | null
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
        }
        Relationships: []
      }
      project_bookmarks: {
        Row: {
          created_at: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          project_id?: string
          user_id?: string
        }
        Relationships: []
      }
      project_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_likes: {
        Row: {
          created_at: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          project_id?: string
          user_id?: string
        }
        Relationships: []
      }
      project_views: {
        Row: {
          project_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          project_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          project_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          allow_collab: boolean
          allow_hire: boolean
          category: string
          copyright_holder: string
          cover_url: string | null
          created_at: string
          credited_user_ids: string[]
          description: string | null
          embedding: string | null
          gallery_urls: string[]
          has_third_party_assets: boolean
          id: string
          is_pinned: boolean
          license_note: string
          license_type: string
          likes: number
          owner_id: string
          price_thb: number | null
          rights_attested_at: string | null
          sort_order: number
          status: string
          studio_id: string | null
          subtitle: string | null
          tags: string[]
          third_party_note: string
          title: string
          tools: string[]
          updated_at: string
          views: number
        }
        Insert: {
          allow_collab?: boolean
          allow_hire?: boolean
          category: string
          copyright_holder?: string
          cover_url?: string | null
          created_at?: string
          credited_user_ids?: string[]
          description?: string | null
          embedding?: string | null
          gallery_urls?: string[]
          has_third_party_assets?: boolean
          id?: string
          is_pinned?: boolean
          license_note?: string
          license_type?: string
          likes?: number
          owner_id: string
          price_thb?: number | null
          rights_attested_at?: string | null
          sort_order?: number
          status?: string
          studio_id?: string | null
          subtitle?: string | null
          tags?: string[]
          third_party_note?: string
          title: string
          tools?: string[]
          updated_at?: string
          views?: number
        }
        Update: {
          allow_collab?: boolean
          allow_hire?: boolean
          category?: string
          copyright_holder?: string
          cover_url?: string | null
          created_at?: string
          credited_user_ids?: string[]
          description?: string | null
          embedding?: string | null
          gallery_urls?: string[]
          has_third_party_assets?: boolean
          id?: string
          is_pinned?: boolean
          license_note?: string
          license_type?: string
          likes?: number
          owner_id?: string
          price_thb?: number | null
          rights_attested_at?: string | null
          sort_order?: number
          status?: string
          studio_id?: string | null
          subtitle?: string | null
          tags?: string[]
          third_party_note?: string
          title?: string
          tools?: string[]
          updated_at?: string
          views?: number
        }
        Relationships: []
      }
      studio_formation_invites: {
        Row: {
          created_at: string
          formation_id: string
          invitee_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["studio_invite_status"]
        }
        Insert: {
          created_at?: string
          formation_id: string
          invitee_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["studio_invite_status"]
        }
        Update: {
          created_at?: string
          formation_id?: string
          invitee_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["studio_invite_status"]
        }
        Relationships: []
      }
      studio_formation_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          created_studio_id: string | null
          founder_id: string
          id: string
          proposed_available_for_work: boolean
          proposed_bio: string
          proposed_contact_email: string
          proposed_contact_phone: string
          proposed_cover_url: string
          proposed_expertise: string[]
          proposed_logo_url: string
          proposed_name: string
          proposed_slug: string
          proposed_social_links: Json
          proposed_tagline: string
          proposed_website: string
          status: Database["public"]["Enums"]["studio_formation_status"]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_studio_id?: string | null
          founder_id: string
          id?: string
          proposed_available_for_work?: boolean
          proposed_bio?: string
          proposed_contact_email?: string
          proposed_contact_phone?: string
          proposed_cover_url?: string
          proposed_expertise?: string[]
          proposed_logo_url?: string
          proposed_name: string
          proposed_slug: string
          proposed_social_links?: Json
          proposed_tagline?: string
          proposed_website?: string
          status?: Database["public"]["Enums"]["studio_formation_status"]
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_studio_id?: string | null
          founder_id?: string
          id?: string
          proposed_available_for_work?: boolean
          proposed_bio?: string
          proposed_contact_email?: string
          proposed_contact_phone?: string
          proposed_cover_url?: string
          proposed_expertise?: string[]
          proposed_logo_url?: string
          proposed_name?: string
          proposed_slug?: string
          proposed_social_links?: Json
          proposed_tagline?: string
          proposed_website?: string
          status?: Database["public"]["Enums"]["studio_formation_status"]
        }
        Relationships: []
      }
      studio_members: {
        Row: {
          credit_title: string
          joined_at: string
          role: Database["public"]["Enums"]["studio_member_role"]
          studio_id: string
          user_id: string
        }
        Insert: {
          credit_title?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["studio_member_role"]
          studio_id: string
          user_id: string
        }
        Update: {
          credit_title?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["studio_member_role"]
          studio_id?: string
          user_id?: string
        }
        Relationships: []
      }
      studios: {
        Row: {
          available_for_work: boolean
          avatar_url: string
          bio: string
          contact_email: string
          contact_phone: string
          cover_url: string
          created_at: string
          created_by: string
          expertise: string[]
          id: string
          location: string
          logo_url: string
          member_count: number
          name: string
          slug: string
          social_links: Json
          tagline: string
          updated_at: string
          verified: boolean
          website: string
        }
        Insert: {
          available_for_work?: boolean
          avatar_url?: string
          bio?: string
          contact_email?: string
          contact_phone?: string
          cover_url?: string
          created_at?: string
          created_by: string
          expertise?: string[]
          id?: string
          location?: string
          logo_url?: string
          member_count?: number
          name: string
          slug: string
          social_links?: Json
          tagline?: string
          updated_at?: string
          verified?: boolean
          website?: string
        }
        Update: {
          available_for_work?: boolean
          avatar_url?: string
          bio?: string
          contact_email?: string
          contact_phone?: string
          cover_url?: string
          created_at?: string
          created_by?: string
          expertise?: string[]
          id?: string
          location?: string
          logo_url?: string
          member_count?: number
          name?: string
          slug?: string
          social_links?: Json
          tagline?: string
          updated_at?: string
          verified?: boolean
          website?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          admin_note: string
          created_at: string
          details: string
          evidence_files: Json
          evidence_urls: string[]
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_owner_id: string | null
          target_type: string
          updated_at: string
        }
        Insert: {
          admin_note?: string
          created_at?: string
          details?: string
          evidence_files?: Json
          evidence_urls?: string[]
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_owner_id?: string | null
          target_type: string
          updated_at?: string
        }
        Update: {
          admin_note?: string
          created_at?: string
          details?: string
          evidence_files?: Json
          evidence_urls?: string[]
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_owner_id?: string | null
          target_type?: string
          updated_at?: string
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
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
      wallet_topups: {
        Row: {
          amount_px: number
          available_at: string
          created_at: string
          id: string
          method: string
          status: string
          user_id: string
        }
        Insert: {
          amount_px: number
          available_at?: string
          created_at?: string
          id?: string
          method?: string
          status?: string
          user_id: string
        }
        Update: {
          amount_px?: number
          available_at?: string
          created_at?: string
          id?: string
          method?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      welcome_mission_catalog: {
        Row: {
          active: boolean
          description_th: string
          difficulty: string
          id: string
          reward_px: number
          sort_order: number
          title_th: string
        }
        Insert: {
          active?: boolean
          description_th?: string
          difficulty?: string
          id: string
          reward_px: number
          sort_order?: number
          title_th: string
        }
        Update: {
          active?: boolean
          description_th?: string
          difficulty?: string
          id?: string
          reward_px?: number
          sort_order?: number
          title_th?: string
        }
        Relationships: []
      }
      welcome_mission_claims: {
        Row: {
          claimed_at: string
          id: string
          mission_id: string
          reward_px: number
          user_id: string
        }
        Insert: {
          claimed_at?: string
          id?: string
          mission_id: string
          reward_px: number
          user_id: string
        }
        Update: {
          claimed_at?: string
          id?: string
          mission_id?: string
          reward_px?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "welcome_mission_claims_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "welcome_mission_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      welcome_px_ledger: {
        Row: {
          created_at: string
          delta: number
          id: string
          mission_id: string | null
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          mission_id?: string | null
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          mission_id?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance_px: number | null
          earned_px: number
          lifetime_earned_px: number
          lifetime_spent_px: number
          lifetime_welcome_px: number
          purchased_px: number
          updated_at: string
          user_id: string
          welcome_px: number
        }
        Insert: {
          balance_px?: number | null
          earned_px?: number
          lifetime_earned_px?: number
          lifetime_spent_px?: number
          lifetime_welcome_px?: number
          purchased_px?: number
          updated_at?: string
          user_id: string
          welcome_px?: number
        }
        Update: {
          balance_px?: number | null
          earned_px?: number
          lifetime_earned_px?: number
          lifetime_spent_px?: number
          lifetime_welcome_px?: number
          purchased_px?: number
          updated_at?: string
          user_id?: string
          welcome_px?: number
        }
        Relationships: []
      }
    }
    Views: {
      notifications: {
        Row: {
          app: string | null
          body: string | null
          created_at: string | null
          id: string | null
          is_dismissed: boolean | null
          is_read: boolean | null
          kind: string | null
          link: string | null
          metadata: Json | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          app?: string | null
          body?: string | null
          created_at?: string | null
          id?: string | null
          is_dismissed?: boolean | null
          is_read?: boolean | null
          kind?: string | null
          link?: string | null
          metadata?: Json | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          app?: string | null
          body?: string | null
          created_at?: string | null
          id?: string | null
          is_dismissed?: boolean | null
          is_read?: boolean | null
          kind?: string | null
          link?: string | null
          metadata?: Json | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      ad_events_daily: {
        Args: { _ad_id: string; _days?: number }
        Returns: {
          clicks: number
          day: string
          impressions: number
          interests: number
        }[]
      }
      admin_ad_overview: { Args: never; Returns: Json }
      admin_aml_overview: { Args: never; Returns: Json }
      admin_approve_ad_application: {
        Args: { _duration_days?: number; _id: string }
        Returns: {
          advertiser_user_id: string
          application_id: string | null
          clicks: number
          created_at: string
          cta_label: string
          end_at: string | null
          id: string
          image_url: string
          impressions: number
          package: Database["public"]["Enums"]["ad_package"]
          price_px: number
          promotion_text: string
          rejection_reason: string
          start_at: string
          status: Database["public"]["Enums"]["ad_status"]
          tagline: string
          target_url: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "ad_campaigns"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_approve_kyc: {
        Args: { _note?: string; _request_id: string }
        Returns: {
          admin_note: string
          contact_note: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "kyc_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_freeze_account: {
        Args: { _reason: string; _user_id: string }
        Returns: {
          account_status: string
          active_studio_id: string | null
          avatar_url: string | null
          bio: string | null
          cover_url: string
          created_at: string
          display_name: string
          email: string | null
          experience: Json
          facebook: string | null
          frozen_at: string | null
          frozen_reason: string
          id: string
          instagram: string | null
          is_verified: boolean
          line_id: string | null
          location: string
          notify_email: boolean
          notify_hire: boolean
          notify_job_match: boolean
          onboarding_visits: Json
          phone: string | null
          preferred_categories: string[]
          preferred_employment_types: string[]
          risk_score: number
          role: string | null
          skills: string[]
          updated_at: string
          username: string | null
          verified_at: string | null
          verified_by: string | null
          website: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_gift_overview: { Args: never; Returns: Json }
      admin_list_cashouts: {
        Args: { _limit?: number }
        Returns: {
          bank_info: Json
          created_at: string
          fee_px: number
          gross_px: number
          id: string
          net_px: number
          processed_at: string
          status: string
          user_avatar: string
          user_id: string
          user_name: string
        }[]
      }
      admin_list_topups: {
        Args: { _limit?: number }
        Returns: {
          amount_px: number
          created_at: string
          id: string
          method: string
          status: string
          user_avatar: string
          user_id: string
          user_name: string
        }[]
      }
      admin_mark_cashout_paid: {
        Args: { _id: string }
        Returns: {
          bank_info: Json
          created_at: string
          fee_px: number
          gross_px: number
          id: string
          net_px: number
          processed_at: string | null
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "cashout_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_recent_gifts: {
        Args: { _days?: number; _limit?: number }
        Returns: {
          created_at: string
          gift_icon: string
          gift_name: string
          id: string
          message: string
          price_px: number
          project_id: string
          project_title: string
          recipient_avatar: string
          recipient_id: string
          recipient_name: string
          sender_avatar: string
          sender_id: string
          sender_name: string
        }[]
      }
      admin_reject_ad_application: {
        Args: { _id: string; _note?: string }
        Returns: {
          ad_description: string
          ad_tagline: string
          ad_title: string
          admin_note: string
          amount_thb: number
          budget_px: number
          company: string
          contact_name: string
          created_at: string
          cta_label: string
          duration_days: number
          email: string
          id: string
          image_url: string
          notes: string
          package: Database["public"]["Enums"]["ad_package"]
          paid_at: string | null
          phone: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["ad_application_status"]
          target_url: string
          updated_at: string
          user_id: string
          website: string
        }
        SetofOptions: {
          from: "*"
          to: "ad_applications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_reject_kyc: {
        Args: { _note?: string; _request_id: string }
        Returns: {
          admin_note: string
          contact_note: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "kyc_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_resolve_aml_flag: {
        Args: { _action: string; _flag_id: string; _note?: string }
        Returns: {
          admin_note: string
          created_at: string
          details: Json
          flag_type: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "aml_flags"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_top_gift_projects: {
        Args: { _limit?: number }
        Returns: {
          cover_url: string
          gift_count: number
          owner_id: string
          owner_name: string
          project_id: string
          title: string
          total_px: number
        }[]
      }
      admin_top_gift_recipients: {
        Args: { _limit?: number }
        Returns: {
          avatar_url: string
          display_name: string
          gift_count: number
          total_px: number
          user_id: string
          username: string
        }[]
      }
      admin_top_gift_senders: {
        Args: { _limit?: number }
        Returns: {
          avatar_url: string
          display_name: string
          gift_count: number
          total_px: number
          user_id: string
          username: string
        }[]
      }
      admin_unfreeze_account: {
        Args: { _user_id: string }
        Returns: {
          account_status: string
          active_studio_id: string | null
          avatar_url: string | null
          bio: string | null
          cover_url: string
          created_at: string
          display_name: string
          email: string | null
          experience: Json
          facebook: string | null
          frozen_at: string | null
          frozen_reason: string
          id: string
          instagram: string | null
          is_verified: boolean
          line_id: string | null
          location: string
          notify_email: boolean
          notify_hire: boolean
          notify_job_match: boolean
          onboarding_visits: Json
          phone: string | null
          preferred_categories: string[]
          preferred_employment_types: string[]
          risk_score: number
          role: string | null
          skills: string[]
          updated_at: string
          username: string | null
          verified_at: string | null
          verified_by: string | null
          website: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      available_gift_px: { Args: { _uid: string }; Returns: number }
      available_purchased_px: { Args: { _uid: string }; Returns: number }
      claim_welcome_mission: { Args: { _mission_id: string }; Returns: Json }
      mark_onboarding_visit: { Args: { _visit_id: string }; Returns: Json }
      calculate_risk_score: { Args: { _uid: string }; Returns: number }
      create_report: {
        Args: {
          _details: string
          _evidence_files: Json
          _evidence_urls: string[]
          _reason: string
          _target_id: string
          _target_owner_id: string
          _target_type: string
        }
        Returns: {
          admin_note: string
          created_at: string
          details: string
          evidence_files: Json
          evidence_urls: string[]
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_owner_id: string | null
          target_type: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "user_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      daily_gift_total: { Args: { _uid: string }; Returns: number }
      ensure_wallet: { Args: { _uid: string }; Returns: undefined }
      get_active_ads: {
        Args: { _limit?: number }
        Returns: {
          advertiser_user_id: string
          application_id: string | null
          clicks: number
          created_at: string
          cta_label: string
          end_at: string | null
          id: string
          image_url: string
          impressions: number
          package: Database["public"]["Enums"]["ad_package"]
          price_px: number
          promotion_text: string
          rejection_reason: string
          start_at: string
          status: Database["public"]["Enums"]["ad_status"]
          tagline: string
          target_url: string
          title: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "ad_campaigns"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_ad_campaign: {
        Args: { _id: string }
        Returns: {
          advertiser_user_id: string
          application_id: string | null
          clicks: number
          created_at: string
          cta_label: string
          end_at: string | null
          id: string
          image_url: string
          impressions: number
          package: Database["public"]["Enums"]["ad_package"]
          price_px: number
          promotion_text: string
          rejection_reason: string
          start_at: string
          status: Database["public"]["Enums"]["ad_status"]
          tagline: string
          target_url: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "ad_campaigns"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      image_like_count: {
        Args: { _image_url: string; _project_id: string }
        Returns: number
      }
      image_share_count: {
        Args: { _image_url: string; _project_id: string }
        Returns: number
      }
      increment_project_view: {
        Args: { _project_id: string }
        Returns: undefined
      }
      is_formation_participant: {
        Args: { _formation_id: string; _user_id: string }
        Returns: boolean
      }
      is_studio_admin: {
        Args: { _studio_id: string; _user_id: string }
        Returns: boolean
      }
      is_studio_member: {
        Args: { _studio_id: string; _user_id: string }
        Returns: boolean
      }
      log_ad_event: {
        Args: {
          _ad_id: string
          _event_type: Database["public"]["Enums"]["ad_event_type"]
        }
        Returns: undefined
      }
      log_ad_event_v2: {
        Args: {
          _ad_id: string
          _event_type: Database["public"]["Enums"]["ad_event_type"]
          _placement?: string
          _session_id?: string
        }
        Returns: undefined
      }
      match_similar_projects: {
        Args: { _exclude: string; _limit?: number; _query: string }
        Returns: {
          category: string
          cover_url: string
          gallery_urls: string[]
          id: string
          owner_id: string
          similarity: number
          title: string
        }[]
      }
      mock_pay_ad_application: {
        Args: { _id: string }
        Returns: {
          ad_description: string
          ad_tagline: string
          ad_title: string
          admin_note: string
          amount_thb: number
          budget_px: number
          company: string
          contact_name: string
          created_at: string
          cta_label: string
          duration_days: number
          email: string
          id: string
          image_url: string
          notes: string
          package: Database["public"]["Enums"]["ad_package"]
          paid_at: string | null
          phone: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["ad_application_status"]
          target_url: string
          updated_at: string
          user_id: string
          website: string
        }
        SetofOptions: {
          from: "*"
          to: "ad_applications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      recommend_from_likes: {
        Args: { _limit?: number; _user_id: string }
        Returns: {
          category: string
          cover_url: string
          gallery_urls: string[]
          id: string
          owner_id: string
          similarity: number
          title: string
        }[]
      }
      request_cashout: {
        Args: { _amount_px: number; _bank_info: Json }
        Returns: {
          bank_info: Json
          created_at: string
          fee_px: number
          gross_px: number
          id: string
          net_px: number
          processed_at: string | null
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "cashout_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      send_gift: {
        Args: {
          _gift_id: string
          _message?: string
          _project_id?: string
          _recipient_id: string
        }
        Returns: {
          created_at: string
          gift_id: string
          id: string
          message: string
          price_px: number
          project_id: string | null
          recipient_id: string
          sender_id: string
        }
        SetofOptions: {
          from: "*"
          to: "gift_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_feedback: {
        Args: {
          _feature: string
          _message: string
          _project_id: string
          _rating: number
          _route: string
          _user_agent: string
          _viewport: string
        }
        Returns: {
          admin_note: string
          created_at: string
          feature: string
          id: string
          message: string
          project_id: string | null
          rating: number
          resolved_at: string | null
          resolved_by: string | null
          route: string
          status: string
          updated_at: string
          user_agent: string
          user_id: string
          viewport: string
        }
        SetofOptions: {
          from: "*"
          to: "app_feedback"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_kyc_request: {
        Args: { _contact_note?: string }
        Returns: {
          admin_note: string
          contact_note: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "kyc_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      topup_wallet_mock: {
        Args: { _amount_px: number }
        Returns: {
          balance_px: number | null
          earned_px: number
          lifetime_earned_px: number
          lifetime_spent_px: number
          purchased_px: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      ad_application_status:
        | "pending"
        | "approved"
        | "rejected"
        | "pending_payment"
        | "paid"
      ad_event_type: "impression" | "click" | "interest"
      ad_package: "basic" | "standard" | "premium"
      ad_status:
        | "draft"
        | "pending"
        | "approved"
        | "active"
        | "paused"
        | "rejected"
        | "expired"
      app_role: "admin" | "user"
      collab_status:
        | "pending"
        | "interested"
        | "passed"
        | "archived"
        | "accepted"
        | "declined"
      contract_status: "draft" | "finalized"
      contract_type: "project" | "fulltime"
      hire_budget: "1k-5k" | "5k-20k" | "20k-50k" | "50k+"
      hire_status:
        | "ใหม่"
        | "ที่ต้องตอบ"
        | "ติดต่อแล้ว"
        | "ปิดแล้ว"
        | "ตอบรับ"
        | "ปฏิเสธ"
      job_application_status:
        | "pending"
        | "shortlisted"
        | "rejected"
        | "accepted"
      job_budget_type: "fixed" | "hourly" | "monthly"
      job_location_type: "remote" | "onsite" | "hybrid"
      job_status: "open" | "closed" | "filled"
      studio_formation_status: "pending" | "completed" | "cancelled"
      studio_invite_status: "pending" | "accepted" | "declined"
      studio_member_role: "owner" | "admin" | "member"
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
      ad_application_status: [
        "pending",
        "approved",
        "rejected",
        "pending_payment",
        "paid",
      ],
      ad_event_type: ["impression", "click", "interest"],
      ad_package: ["basic", "standard", "premium"],
      ad_status: [
        "draft",
        "pending",
        "approved",
        "active",
        "paused",
        "rejected",
        "expired",
      ],
      app_role: ["admin", "user"],
      collab_status: [
        "pending",
        "interested",
        "passed",
        "archived",
        "accepted",
        "declined",
      ],
      contract_status: ["draft", "finalized"],
      contract_type: ["project", "fulltime"],
      hire_budget: ["1k-5k", "5k-20k", "20k-50k", "50k+"],
      hire_status: [
        "ใหม่",
        "ที่ต้องตอบ",
        "ติดต่อแล้ว",
        "ปิดแล้ว",
        "ตอบรับ",
        "ปฏิเสธ",
      ],
      job_application_status: [
        "pending",
        "shortlisted",
        "rejected",
        "accepted",
      ],
      job_budget_type: ["fixed", "hourly", "monthly"],
      job_location_type: ["remote", "onsite", "hybrid"],
      job_status: ["open", "closed", "filled"],
      studio_formation_status: ["pending", "completed", "cancelled"],
      studio_invite_status: ["pending", "accepted", "declined"],
      studio_member_role: ["owner", "admin", "member"],
    },
  },
} as const
