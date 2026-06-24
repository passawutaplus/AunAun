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
  anthem: {
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
      hiring_requests: {
        Row: {
          budget: Database["public"]["Enums"]["hire_budget"] | null
          budget_amount: number | null
          client_id: string | null
          client_name: string
          created_at: string
          deadline: string | null
          email: string
          freelancer_id: string | null
          id: string
          message: string | null
          phone: string | null
          project_id: string | null
          project_title: string
          status: Database["public"]["Enums"]["hire_status"]
          studio_id: string | null
          target_type: string
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
          freelancer_id?: string | null
          id?: string
          message?: string | null
          phone?: string | null
          project_id?: string | null
          project_title: string
          status?: Database["public"]["Enums"]["hire_status"]
          studio_id?: string | null
          target_type?: string
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
          freelancer_id?: string | null
          id?: string
          message?: string | null
          phone?: string | null
          project_id?: string | null
          project_title?: string
          status?: Database["public"]["Enums"]["hire_status"]
          studio_id?: string | null
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hiring_requests_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
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
          cover_image_url: string | null
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
          cover_image_url?: string | null
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
          cover_image_url?: string | null
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
          rights_attestation_version: string | null
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
          rights_attestation_version?: string | null
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
          rights_attestation_version?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _admin_actor: { Args: never; Returns: string }
      _admin_audit: {
        Args: {
          _action: string
          _metadata?: Json
          _target_id: string
          _target_type: string
        }
        Returns: undefined
      }
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
      admin_delete_collection: { Args: { _id: string }; Returns: undefined }
      admin_delete_comment: { Args: { _id: string }; Returns: undefined }
      admin_delete_project: { Args: { _id: string }; Returns: undefined }
      admin_dismiss_notification: { Args: { _id: string }; Returns: undefined }
      admin_list_notifications: {
        Args: { _limit?: number }
        Returns: Database["so1o"]["Tables"]["notifications"]["Row"][]
        SetofOptions: {
          from: "*"
          to: "notifications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_mark_cashout_paid: {
        Args: { _id: string }
        Returns: Database["shared"]["Tables"]["cashout_requests"]["Row"]
        SetofOptions: {
          from: "*"
          to: "cashout_requests"
          isOneToOne: true
          isSetofReturn: false
        }
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
      admin_reject_cashout: {
        Args: { _id: string; _note?: string }
        Returns: Database["shared"]["Tables"]["cashout_requests"]["Row"]
        SetofOptions: {
          from: "*"
          to: "cashout_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_job_status: {
        Args: { _id: string; _status: string }
        Returns: {
          applicants_count: number
          attached_cv_url: string | null
          attached_portfolio_ids: string[]
          budget_max: number | null
          budget_min: number | null
          budget_type: Database["public"]["Enums"]["job_budget_type"]
          cover_image_url: string | null
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
        SetofOptions: {
          from: "*"
          to: "job_posts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_project_status: {
        Args: { _id: string; _status: string }
        Returns: {
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
          rights_attestation_version: string | null
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
        SetofOptions: {
          from: "*"
          to: "projects"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_user_role: {
        Args: { _grant: boolean; _role: string; _user_id: string }
        Returns: undefined
      }
      admin_update_gift: {
        Args: { _active: boolean; _id: string; _price_px?: number }
        Returns: Database["shared"]["Tables"]["gifts"]["Row"]
        SetofOptions: {
          from: "*"
          to: "gifts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_update_gift_limits: {
        Args: {
          _daily_unverified: number
          _daily_verified: number
          _hold_hours: number
          _max_topup: number
          _velocity: number
        }
        Returns: Database["shared"]["Tables"]["gift_limits_config"]["Row"]
        SetofOptions: {
          from: "*"
          to: "gift_limits_config"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      available_gift_px: { Args: { _uid: string }; Returns: number }
      available_purchased_px: { Args: { _uid: string }; Returns: number }
      claim_welcome_mission: { Args: { _mission_id: string }; Returns: Json }
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
      mark_onboarding_visit: { Args: { _visit_id: string }; Returns: Json }
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
      public_feed_stats: { Args: never; Returns: Json }
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
        Returns: Database["shared"]["Tables"]["cashout_requests"]["Row"]
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
        Returns: Database["shared"]["Tables"]["gift_transactions"]["Row"]
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
      topup_wallet_mock: {
        Args: { _amount_px: number }
        Returns: Database["shared"]["Tables"]["wallets"]["Row"]
        SetofOptions: {
          from: "*"
          to: "wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
  ops: {
    Tables: {
      cycles: {
        Row: {
          created_at: string
          end_date: string
          id: string
          name: string
          start_date: string
          status: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          name: string
          start_date: string
          status?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          status?: string
        }
        Relationships: []
      }
      issue_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          issue_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          issue_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          issue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_comments_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          assignee_id: string | null
          created_at: string
          created_by: string
          cycle_id: string | null
          description: string | null
          due_date: string | null
          id: string
          issue_number: string
          labels: string[]
          priority: string
          project_id: string | null
          source_id: string | null
          source_type: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          created_by: string
          cycle_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          issue_number: string
          labels?: string[]
          priority?: string
          project_id?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string
          cycle_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          issue_number?: string
          labels?: string[]
          priority?: string
          project_id?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issues_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_runs: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          playbook_id: string
          status: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          playbook_id: string
          status?: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          playbook_id?: string
          status?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          app_scope: string
          color: string | null
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          app_scope?: string
          color?: string | null
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          app_scope?: string
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      radar_items: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          effort: string
          id: string
          impact: string
          issue_id: string | null
          source: string
          status: string
          summary: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          effort?: string
          id?: string
          impact?: string
          issue_id?: string | null
          source?: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          effort?: string
          id?: string
          impact?: string
          issue_id?: string | null
          source?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "radar_items_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          issue_id: string | null
          project_id: string | null
          quarter: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          issue_id?: string | null
          project_id?: string | null
          quarter: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          issue_id?: string | null
          project_id?: string | null
          quarter?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_items_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmap_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      format_issue_number: { Args: { n: number }; Returns: string }
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
      ai_chat_guest_usage: {
        Row: {
          count: number
          guest_id: string
          ip: string | null
          updated_at: string
          usage_date: string
        }
        Insert: {
          count?: number
          guest_id: string
          ip?: string | null
          updated_at?: string
          usage_date?: string
        }
        Update: {
          count?: number
          guest_id?: string
          ip?: string | null
          updated_at?: string
          usage_date?: string
        }
        Relationships: []
      }
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          preset: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          preset?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          preset?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_chat_usage: {
        Row: {
          count: number
          total_count: number
          updated_at: string
          usage_date: string
          user_id: string
        }
        Insert: {
          count?: number
          total_count?: number
          updated_at?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          count?: number
          total_count?: number
          updated_at?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_credit_ledger: {
        Row: {
          cost: number
          created_at: string
          feature: string
          id: string
          idempotency_key: string | null
          metadata: Json
          source: string
          user_id: string
        }
        Insert: {
          cost: number
          created_at?: string
          feature: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          source: string
          user_id: string
        }
        Update: {
          cost?: number
          created_at?: string
          feature?: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_feature_costs: {
        Row: {
          cost: number
          feature: string
          label: string | null
          updated_at: string
        }
        Insert: {
          cost: number
          feature: string
          label?: string | null
          updated_at?: string
        }
        Update: {
          cost?: number
          feature?: string
          label?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_interactions_feedback: {
        Row: {
          ai_response: string
          created_at: string
          feature: string
          id: string
          metadata: Json
          personality_settings: Json
          prompt: string
          source_message_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          ai_response: string
          created_at?: string
          feature?: string
          id?: string
          metadata?: Json
          personality_settings?: Json
          prompt: string
          source_message_id?: string | null
          status: string
          user_id: string
        }
        Update: {
          ai_response?: string
          created_at?: string
          feature?: string
          id?: string
          metadata?: Json
          personality_settings?: Json
          prompt?: string
          source_message_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_knowledge_base: {
        Row: {
          approved_at: string
          approved_by: string | null
          created_at: string
          embedding: string | null
          feature: string
          id: string
          ideal_response: string
          prompt: string
          source_sample_id: string | null
          tags: string[]
        }
        Insert: {
          approved_at?: string
          approved_by?: string | null
          created_at?: string
          embedding?: string | null
          feature: string
          id?: string
          ideal_response: string
          prompt: string
          source_sample_id?: string | null
          tags?: string[]
        }
        Update: {
          approved_at?: string
          approved_by?: string | null
          created_at?: string
          embedding?: string | null
          feature?: string
          id?: string
          ideal_response?: string
          prompt?: string
          source_sample_id?: string | null
          tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "ai_knowledge_base_source_sample_id_fkey"
            columns: ["source_sample_id"]
            isOneToOne: false
            referencedRelation: "ai_training_samples"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_personality_settings: {
        Row: {
          created_at: string
          creativity: number
          detail_level: number
          forbidden_keywords: string[]
          formality: number
          id: string
          system_prompt_override: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          creativity?: number
          detail_level?: number
          forbidden_keywords?: string[]
          formality?: number
          id?: string
          system_prompt_override?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          creativity?: number
          detail_level?: number
          forbidden_keywords?: string[]
          formality?: number
          id?: string
          system_prompt_override?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ai_tier_config: {
        Row: {
          monthly_included: number
          tier: string
          updated_at: string
        }
        Insert: {
          monthly_included: number
          tier: string
          updated_at?: string
        }
        Update: {
          monthly_included?: number
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_training_samples: {
        Row: {
          ai_response: string
          corrected_response: string | null
          created_at: string
          feature: string
          id: string
          metadata: Json
          model: string | null
          status: string
          system_prompt_version: string | null
          tokens_used: number | null
          updated_at: string
          user_id: string
          user_prompt: string
          user_rating: number | null
        }
        Insert: {
          ai_response: string
          corrected_response?: string | null
          created_at?: string
          feature: string
          id?: string
          metadata?: Json
          model?: string | null
          status?: string
          system_prompt_version?: string | null
          tokens_used?: number | null
          updated_at?: string
          user_id: string
          user_prompt: string
          user_rating?: number | null
        }
        Update: {
          ai_response?: string
          corrected_response?: string | null
          created_at?: string
          feature?: string
          id?: string
          metadata?: Json
          model?: string | null
          status?: string
          system_prompt_version?: string | null
          tokens_used?: number | null
          updated_at?: string
          user_id?: string
          user_prompt?: string
          user_rating?: number | null
        }
        Relationships: []
      }
      ai_usage_daily: {
        Row: {
          count: number
          feature: string
          id: string
          updated_at: string
          usage_date: string
          user_id: string
        }
        Insert: {
          count?: number
          feature: string
          id?: string
          updated_at?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          count?: number
          feature?: string
          id?: string
          updated_at?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          banner_url: string | null
          created_at: string
          created_by: string | null
          end_at: string | null
          id: string
          is_active: boolean
          link_url: string | null
          message: string
          start_at: string | null
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          id?: string
          is_active?: boolean
          link_url?: string | null
          message?: string
          start_at?: string | null
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          id?: string
          is_active?: boolean
          link_url?: string | null
          message?: string
          start_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      articles: {
        Row: {
          author_user_id: string | null
          category: string
          content: string
          created_at: string
          featured_image: string | null
          featured_image_alt: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          related_feature_link: string | null
          slug: string
          status: string
          summary: string
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_user_id?: string | null
          category?: string
          content?: string
          created_at?: string
          featured_image?: string | null
          featured_image_alt?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          related_feature_link?: string | null
          slug: string
          status?: string
          summary?: string
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_user_id?: string | null
          category?: string
          content?: string
          created_at?: string
          featured_image?: string | null
          featured_image_alt?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          related_feature_link?: string | null
          slug?: string
          status?: string
          summary?: string
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      asset_items: {
        Row: {
          created_at: string
          id: string
          kind: string
          label: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          label: string
          payload?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          label?: string
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      auth_banner_slides: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          sort_order: number
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      beta_feedback: {
        Row: {
          created_at: string
          feature: string
          id: string
          message: string
          rating: number | null
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          created_at?: string
          feature: string
          id?: string
          message: string
          rating?: number | null
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          created_at?: string
          feature?: string
          id?: string
          message?: string
          rating?: number | null
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      calculator_usage_events: {
        Row: {
          created_at: string
          id: string
          session_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          session_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string | null
        }
        Relationships: []
      }
      changelog_entries: {
        Row: {
          body: string
          created_at: string
          id: string
          is_published: boolean
          released_at: string
          tag: string
          title: string
          version: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          is_published?: boolean
          released_at?: string
          tag?: string
          title: string
          version: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_published?: boolean
          released_at?: string
          tag?: string
          title?: string
          version?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          image_url: string | null
          is_read: boolean
          sender_id: string
          sender_role: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          sender_id: string
          sender_role: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          sender_id?: string
          sender_role?: string
          user_id?: string
        }
        Relationships: []
      }
      client_files: {
        Row: {
          category: string
          client_id: string
          created_at: string
          expires_at: string | null
          file_name: string
          id: string
          mime_type: string | null
          notes: string | null
          size_bytes: number | null
          storage_path: string
          user_id: string
        }
        Insert: {
          category?: string
          client_id: string
          created_at?: string
          expires_at?: string | null
          file_name: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          size_bytes?: number | null
          storage_path: string
          user_id: string
        }
        Update: {
          category?: string
          client_id?: string
          created_at?: string
          expires_at?: string | null
          file_name?: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          size_bytes?: number | null
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "saved_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_links: {
        Row: {
          client_id: string
          created_at: string
          id: string
          kind: string
          label: string
          url: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          kind?: string
          label?: string
          url: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          kind?: string
          label?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "saved_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          body: string
          client_id: string
          created_at: string
          id: string
          pinned: boolean
          user_id: string
        }
        Insert: {
          body: string
          client_id: string
          created_at?: string
          id?: string
          pinned?: boolean
          user_id: string
        }
        Update: {
          body?: string
          client_id?: string
          created_at?: string
          id?: string
          pinned?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "saved_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      color_palette_colors: {
        Row: {
          created_at: string
          hex: string
          id: string
          label: string | null
          palette_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          hex: string
          id?: string
          label?: string | null
          palette_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          hex?: string
          id?: string
          label?: string | null
          palette_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "color_palette_colors_palette_id_fkey"
            columns: ["palette_id"]
            isOneToOne: false
            referencedRelation: "color_palettes"
            referencedColumns: ["id"]
          },
        ]
      }
      color_palettes: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dashboard_banner_slides: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          sort_order: number
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dashboard_daily_trends: {
        Row: {
          created_at: string
          items: Json
          trend_date: string
        }
        Insert: {
          created_at?: string
          items?: Json
          trend_date: string
        }
        Update: {
          created_at?: string
          items?: Json
          trend_date?: string
        }
        Relationships: []
      }
      dashboard_job_tasks: {
        Row: {
          created_at: string
          done: boolean
          id: string
          job_id: string
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          id?: string
          job_id: string
          sort_order?: number
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          done?: boolean
          id?: string
          job_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_job_tasks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "dashboard_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_jobs: {
        Row: {
          brand: string
          created_at: string
          done: boolean
          due_date: string | null
          id: string
          sort_order: number
          task: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          sort_order?: number
          task?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          sort_order?: number
          task?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dashboard_notes: {
        Row: {
          content: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dashboard_tasks: {
        Row: {
          created_at: string
          done: boolean
          id: string
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          done?: boolean
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      design_briefs: {
        Row: {
          ai_analysis: Json | null
          audience: Json
          client_info: Json
          confirmed_at: string | null
          confirmed_by_name: string | null
          confirmed_signature: string | null
          created_at: string
          design_direction: Json
          id: string
          notes: string
          project_id: string | null
          project_overview: Json
          references: Json
          share_token: string
          status: string
          tech_specs: Json
          timeline_budget: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          audience?: Json
          client_info?: Json
          confirmed_at?: string | null
          confirmed_by_name?: string | null
          confirmed_signature?: string | null
          created_at?: string
          design_direction?: Json
          id?: string
          notes?: string
          project_id?: string | null
          project_overview?: Json
          references?: Json
          share_token?: string
          status?: string
          tech_specs?: Json
          timeline_budget?: Json
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          audience?: Json
          client_info?: Json
          confirmed_at?: string | null
          confirmed_by_name?: string | null
          confirmed_signature?: string | null
          created_at?: string
          design_direction?: Json
          id?: string
          notes?: string
          project_id?: string | null
          project_overview?: Json
          references?: Json
          share_token?: string
          status?: string
          tech_specs?: Json
          timeline_budget?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      design_drill_reroll_usage: {
        Row: {
          day_key: string
          updated_at: string
          used_count: number
          user_id: string
        }
        Insert: {
          day_key: string
          updated_at?: string
          used_count?: number
          user_id: string
        }
        Update: {
          day_key?: string
          updated_at?: string
          used_count?: number
          user_id?: string
        }
        Relationships: []
      }
      ecosystem_links: {
        Row: {
          created_at: string
          event_type: string
          id: string
          meta: Json
          ref_id: string | null
          source_app: string
          source_page: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          meta?: Json
          ref_id?: string | null
          source_app?: string
          source_page?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          meta?: Json
          ref_id?: string | null
          source_app?: string
          source_page?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          category: string
          created_at: string
          id: string
          is_published: boolean
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          id?: string
          is_published?: boolean
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          id?: string
          is_published?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      feature_suggestions: {
        Row: {
          admin_note: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          status: string
          title: string
          updated_at: string
          upvotes: number
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
          upvotes?: number
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
          upvotes?: number
          user_id?: string | null
        }
        Relationships: []
      }
      feature_usage_events: {
        Row: {
          created_at: string
          feature: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      feedback_jobs: {
        Row: {
          client_id: string
          closed: boolean
          created_at: string
          id: string
          quotation_id: string | null
          revision_quota: number | null
          revisions: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          closed?: boolean
          created_at?: string
          id?: string
          quotation_id?: string | null
          revision_quota?: number | null
          revisions?: Json
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          closed?: boolean
          created_at?: string
          id?: string
          quotation_id?: string | null
          revision_quota?: number | null
          revisions?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_clients_invoices: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          due_date: string | null
          id: string
          meta: Json
          name: string
          project: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          client_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          meta?: Json
          name: string
          project?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          meta?: Json
          name?: string
          project?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_clients_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "saved_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_deductions: {
        Row: {
          amount: number
          created_at: string
          deduction_key: string
          enabled: boolean
          id: string
          note: string | null
          tax_year: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          deduction_key: string
          enabled?: boolean
          id?: string
          note?: string | null
          tax_year?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          deduction_key?: string
          enabled?: boolean
          id?: string
          note?: string | null
          tax_year?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          id: string
          is_deductible: boolean
          label: string
          meta: Json
          month: string
          scope: string
          spent_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          id?: string
          is_deductible?: boolean
          label: string
          meta?: Json
          month: string
          scope?: string
          spent_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          id?: string
          is_deductible?: boolean
          label?: string
          meta?: Json
          month?: string
          scope?: string
          spent_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_incomes: {
        Row: {
          category: string
          created_at: string
          gross: number
          has_certificate: boolean
          id: string
          meta: Json
          month: string
          net: number
          receive_date: string | null
          source: string
          source_quotation_id: string | null
          updated_at: string
          user_id: string
          vat: number
          wht: number
        }
        Insert: {
          category?: string
          created_at?: string
          gross?: number
          has_certificate?: boolean
          id?: string
          meta?: Json
          month: string
          net?: number
          receive_date?: string | null
          source?: string
          source_quotation_id?: string | null
          updated_at?: string
          user_id: string
          vat?: number
          wht?: number
        }
        Update: {
          category?: string
          created_at?: string
          gross?: number
          has_certificate?: boolean
          id?: string
          meta?: Json
          month?: string
          net?: number
          receive_date?: string | null
          source?: string
          source_quotation_id?: string | null
          updated_at?: string
          user_id?: string
          vat?: number
          wht?: number
        }
        Relationships: [
          {
            foreignKeyName: "finance_incomes_source_quotation_id_fkey"
            columns: ["source_quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_invoice_status_history: {
        Row: {
          changed_at: string
          from_status: string | null
          id: string
          invoice_id: string
          note: string | null
          to_status: string
          user_id: string
        }
        Insert: {
          changed_at?: string
          from_status?: string | null
          id?: string
          invoice_id: string
          note?: string | null
          to_status: string
          user_id: string
        }
        Update: {
          changed_at?: string
          from_status?: string | null
          id?: string
          invoice_id?: string
          note?: string | null
          to_status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_invoice_status_history_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "finance_clients_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_payment_methods: {
        Row: {
          created_at: string
          id: string
          kind: string
          label: string
          last4: string | null
          meta: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          label: string
          last4?: string | null
          meta?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          label?: string
          last4?: string | null
          meta?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_settings: {
        Row: {
          created_at: string
          expense_method: string
          meta: Json
          monthly_goal: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expense_method?: string
          meta?: Json
          monthly_goal?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expense_method?: string
          meta?: Json
          monthly_goal?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_subscriptions: {
        Row: {
          category: string | null
          created_at: string
          cycle: string
          id: string
          is_active: boolean
          meta: Json
          name: string
          next_renewal: string | null
          payment_method_id: string | null
          price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          cycle?: string
          id?: string
          is_active?: boolean
          meta?: Json
          name: string
          next_renewal?: string | null
          payment_method_id?: string | null
          price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          cycle?: string
          id?: string
          is_active?: boolean
          meta?: Json
          name?: string
          next_renewal?: string | null
          payment_method_id?: string | null
          price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_tax_scenarios: {
        Row: {
          created_at: string
          id: string
          name: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          payload?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hq_agents: {
        Row: {
          accent_color: string
          created_at: string
          department: string
          emoji: string
          id: string
          is_active: boolean
          max_tokens: number
          model: string
          name: string
          skills: string[]
          slug: string
          sort_order: number
          system_prompt: string
          temperature: number
          title: string
          tools: Json
          updated_at: string
        }
        Insert: {
          accent_color?: string
          created_at?: string
          department: string
          emoji?: string
          id?: string
          is_active?: boolean
          max_tokens?: number
          model?: string
          name: string
          skills?: string[]
          slug: string
          sort_order?: number
          system_prompt: string
          temperature?: number
          title: string
          tools?: Json
          updated_at?: string
        }
        Update: {
          accent_color?: string
          created_at?: string
          department?: string
          emoji?: string
          id?: string
          is_active?: boolean
          max_tokens?: number
          model?: string
          name?: string
          skills?: string[]
          slug?: string
          sort_order?: number
          system_prompt?: string
          temperature?: number
          title?: string
          tools?: Json
          updated_at?: string
        }
        Relationships: []
      }
      hq_conversations: {
        Row: {
          agent_slug: string
          archived: boolean
          created_at: string
          id: string
          pinned_context: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_slug: string
          archived?: boolean
          created_at?: string
          id?: string
          pinned_context?: Json
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_slug?: string
          archived?: boolean
          created_at?: string
          id?: string
          pinned_context?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hq_conversations_agent_slug_fkey"
            columns: ["agent_slug"]
            isOneToOne: false
            referencedRelation: "hq_agents"
            referencedColumns: ["slug"]
          },
        ]
      }
      hq_messages: {
        Row: {
          agent_slug: string | null
          content: string
          conversation_id: string
          cost_estimate: number
          created_at: string
          id: string
          metadata: Json
          role: string
          tokens_used: number
        }
        Insert: {
          agent_slug?: string | null
          content?: string
          conversation_id: string
          cost_estimate?: number
          created_at?: string
          id?: string
          metadata?: Json
          role: string
          tokens_used?: number
        }
        Update: {
          agent_slug?: string | null
          content?: string
          conversation_id?: string
          cost_estimate?: number
          created_at?: string
          id?: string
          metadata?: Json
          role?: string
          tokens_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "hq_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "hq_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      hq_outputs: {
        Row: {
          agent_slug: string
          attachments: Json
          content: string
          created_at: string
          id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          task_id: string | null
          title: string
          type: string
        }
        Insert: {
          agent_slug: string
          attachments?: Json
          content?: string
          created_at?: string
          id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          task_id?: string | null
          title?: string
          type?: string
        }
        Update: {
          agent_slug?: string
          attachments?: Json
          content?: string
          created_at?: string
          id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          task_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "hq_outputs_agent_slug_fkey"
            columns: ["agent_slug"]
            isOneToOne: false
            referencedRelation: "hq_agents"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "hq_outputs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "hq_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      hq_tasks: {
        Row: {
          assigned_agent: string | null
          context_refs: Json
          created_at: string
          created_by: string | null
          created_by_agent: string | null
          description: string
          id: string
          output: Json
          parent_task_id: string | null
          priority: string
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_agent?: string | null
          context_refs?: Json
          created_at?: string
          created_by?: string | null
          created_by_agent?: string | null
          description?: string
          id?: string
          output?: Json
          parent_task_id?: string | null
          priority?: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_agent?: string | null
          context_refs?: Json
          created_at?: string
          created_by?: string | null
          created_by_agent?: string | null
          description?: string
          id?: string
          output?: Json
          parent_task_id?: string | null
          priority?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hq_tasks_assigned_agent_fkey"
            columns: ["assigned_agent"]
            isOneToOne: false
            referencedRelation: "hq_agents"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "hq_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "hq_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      inhouse_activity_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          org_id: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          org_id: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          org_id?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inhouse_activity_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "inhouse_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inhouse_activity_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "inhouse_activity_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "inhouse_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inhouse_canvases: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          scene_data: Json
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          scene_data?: Json
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          scene_data?: Json
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inhouse_canvases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "inhouse_canvases_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "inhouse_canvases_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "inhouse_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inhouse_channels: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inhouse_channels_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "inhouse_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inhouse_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string | null
          expires_at: string
          id: string
          invited_by: string
          org_id: string
          role: Database["public"]["Enums"]["inhouse_member_role"]
          token: string
          workspace_ids: string[]
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_by: string
          org_id: string
          role?: Database["public"]["Enums"]["inhouse_member_role"]
          token: string
          workspace_ids?: string[]
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_by?: string
          org_id?: string
          role?: Database["public"]["Enums"]["inhouse_member_role"]
          token?: string
          workspace_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "inhouse_invites_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "inhouse_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "inhouse_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "inhouse_orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      inhouse_messages: {
        Row: {
          attachments: Json
          body: string
          channel_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          attachments?: Json
          body: string
          channel_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          attachments?: Json
          body?: string
          channel_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inhouse_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "inhouse_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inhouse_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      inhouse_org_members: {
        Row: {
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          org_id: string
          removed_at: string | null
          role: Database["public"]["Enums"]["inhouse_member_role"]
          status: Database["public"]["Enums"]["inhouse_member_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          org_id: string
          removed_at?: string | null
          role?: Database["public"]["Enums"]["inhouse_member_role"]
          status?: Database["public"]["Enums"]["inhouse_member_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          org_id?: string
          removed_at?: string | null
          role?: Database["public"]["Enums"]["inhouse_member_role"]
          status?: Database["public"]["Enums"]["inhouse_member_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inhouse_org_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "inhouse_org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "inhouse_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inhouse_org_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      inhouse_orgs: {
        Row: {
          address: string | null
          avatar_url: string | null
          brand_name: string | null
          brand_tagline: string | null
          created_at: string
          document_theme: Json | null
          email: string | null
          id: string
          legal_name: string | null
          name: string
          owner_id: string
          phone: string | null
          seat_limit: number
          settings: Json
          slug: string
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          brand_name?: string | null
          brand_tagline?: string | null
          created_at?: string
          document_theme?: Json | null
          email?: string | null
          id?: string
          legal_name?: string | null
          name: string
          owner_id: string
          phone?: string | null
          seat_limit?: number
          settings?: Json
          slug: string
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          brand_name?: string | null
          brand_tagline?: string | null
          created_at?: string
          document_theme?: Json | null
          email?: string | null
          id?: string
          legal_name?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          seat_limit?: number
          settings?: Json
          slug?: string
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inhouse_orgs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      inhouse_tasks: {
        Row: {
          assignee_id: string | null
          column_key: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          position: number
          priority: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assignee_id?: string | null
          column_key?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assignee_id?: string | null
          column_key?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inhouse_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "inhouse_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "inhouse_tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "inhouse_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inhouse_workspace_members: {
        Row: {
          created_at: string
          org_member_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          org_member_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          org_member_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inhouse_workspace_members_org_member_id_fkey"
            columns: ["org_member_id"]
            isOneToOne: false
            referencedRelation: "inhouse_org_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inhouse_workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "inhouse_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inhouse_workspaces: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          linked_quotation_id: string | null
          name: string
          org_id: string
          settings: Json
          slug: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          linked_quotation_id?: string | null
          name: string
          org_id: string
          settings?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          linked_quotation_id?: string | null
          name?: string
          org_id?: string
          settings?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inhouse_workspaces_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "inhouse_workspaces_linked_quotation_id_fkey"
            columns: ["linked_quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inhouse_workspaces_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "inhouse_orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_events: {
        Row: {
          amount: number | null
          created_at: string
          id: string
          image_url: string | null
          job_id: string
          kind: string
          meta: Json
          note: string
          title: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          job_id: string
          kind: string
          meta?: Json
          note?: string
          title?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          job_id?: string
          kind?: string
          meta?: Json
          note?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_trackers"
            referencedColumns: ["id"]
          },
        ]
      }
      job_milestones: {
        Row: {
          created_at: string
          done: boolean
          done_at: string | null
          id: string
          job_id: string
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          done?: boolean
          done_at?: string | null
          id?: string
          job_id: string
          label?: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          done?: boolean
          done_at?: string | null
          id?: string
          job_id?: string
          label?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_milestones_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_trackers"
            referencedColumns: ["id"]
          },
        ]
      }
      job_slips: {
        Row: {
          id: string
          job_id: string
          note: string
          rejected: boolean
          rejection_reason: string
          slip_url: string
          uploaded_at: string
          verified: boolean
        }
        Insert: {
          id?: string
          job_id: string
          note?: string
          rejected?: boolean
          rejection_reason?: string
          slip_url: string
          uploaded_at?: string
          verified?: boolean
        }
        Update: {
          id?: string
          job_id?: string
          note?: string
          rejected?: boolean
          rejection_reason?: string
          slip_url?: string
          uploaded_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "job_slips_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_trackers"
            referencedColumns: ["id"]
          },
        ]
      }
      job_steps: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          name_en: string
          name_th: string
          step_index: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          name_en: string
          name_th: string
          step_index: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          name_en?: string
          name_th?: string
          step_index?: number
        }
        Relationships: []
      }
      job_stripe_payments: {
        Row: {
          amount_thb: number
          created_at: string
          environment: string
          freelancer_user_id: string
          id: string
          job_id: string
          payment_type: string
          stripe_session_id: string
        }
        Insert: {
          amount_thb: number
          created_at?: string
          environment: string
          freelancer_user_id: string
          id?: string
          job_id: string
          payment_type: string
          stripe_session_id: string
        }
        Update: {
          amount_thb?: number
          created_at?: string
          environment?: string
          freelancer_user_id?: string
          id?: string
          job_id?: string
          payment_type?: string
          stripe_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_stripe_payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_trackers"
            referencedColumns: ["id"]
          },
        ]
      }
      job_tracker_step_comments: {
        Row: {
          author_role: string
          body: string
          created_at: string
          id: string
          job_id: string
          step_index: number
        }
        Insert: {
          author_role: string
          body: string
          created_at?: string
          id?: string
          job_id: string
          step_index: number
        }
        Update: {
          author_role?: string
          body?: string
          created_at?: string
          id?: string
          job_id?: string
          step_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_tracker_step_comments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_trackers"
            referencedColumns: ["id"]
          },
        ]
      }
      job_trackers: {
        Row: {
          amount_due: number
          brief_id: string | null
          client_id: string | null
          client_name: string
          created_at: string
          current_step: number
          deadline: string | null
          deposit_paid: boolean
          deposit_percent: number
          final_file_url: string | null
          final_paid: boolean
          id: string
          meta: Json
          notes: string
          payment_info: string
          payment_qr_url: string | null
          preview_image_url: string | null
          progress_percent: number
          quotation_id: string | null
          share_token: string
          start_date: string | null
          status: string
          title: string
          total_amount: number
          tracking_code: string
          unlocked: boolean
          updated_at: string
          user_id: string
          watermark_text: string
        }
        Insert: {
          amount_due?: number
          brief_id?: string | null
          client_id?: string | null
          client_name?: string
          created_at?: string
          current_step?: number
          deadline?: string | null
          deposit_paid?: boolean
          deposit_percent?: number
          final_file_url?: string | null
          final_paid?: boolean
          id?: string
          meta?: Json
          notes?: string
          payment_info?: string
          payment_qr_url?: string | null
          preview_image_url?: string | null
          progress_percent?: number
          quotation_id?: string | null
          share_token?: string
          start_date?: string | null
          status?: string
          title?: string
          total_amount?: number
          tracking_code?: string
          unlocked?: boolean
          updated_at?: string
          user_id: string
          watermark_text?: string
        }
        Update: {
          amount_due?: number
          brief_id?: string | null
          client_id?: string | null
          client_name?: string
          created_at?: string
          current_step?: number
          deadline?: string | null
          deposit_paid?: boolean
          deposit_percent?: number
          final_file_url?: string | null
          final_paid?: boolean
          id?: string
          meta?: Json
          notes?: string
          payment_info?: string
          payment_qr_url?: string | null
          preview_image_url?: string | null
          progress_percent?: number
          quotation_id?: string | null
          share_token?: string
          start_date?: string | null
          status?: string
          title?: string
          total_amount?: number
          tracking_code?: string
          unlocked?: boolean
          updated_at?: string
          user_id?: string
          watermark_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_trackers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "saved_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string | null
          currency: string | null
          current_step_index: number | null
          description: string | null
          final_file_url: string | null
          id: string
          notes: string | null
          payment_status: string | null
          price: number | null
          share_token: string
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
          watermark_preview_url: string | null
        }
        Insert: {
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string | null
          currency?: string | null
          current_step_index?: number | null
          description?: string | null
          final_file_url?: string | null
          id?: string
          notes?: string | null
          payment_status?: string | null
          price?: number | null
          share_token?: string
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          watermark_preview_url?: string | null
        }
        Update: {
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string | null
          currency?: string | null
          current_step_index?: number | null
          description?: string | null
          final_file_url?: string | null
          id?: string
          notes?: string | null
          payment_status?: string | null
          price?: number | null
          share_token?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          watermark_preview_url?: string | null
        }
        Relationships: []
      }
      legal_checklist_progress: {
        Row: {
          checked_items: string[]
          checklist_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          checked_items?: string[]
          checklist_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          checked_items?: string[]
          checklist_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          body: string
          created_at: string
          doc_type: string
          id: string
          meta: Json
          quotation_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          doc_type?: string
          id?: string
          meta?: Json
          quotation_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          doc_type?: string
          id?: string
          meta?: Json
          quotation_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_documents_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_license_tokens: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          quotation_id: string
          summary: Json
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          quotation_id: string
          summary?: Json
          token?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          quotation_id?: string
          summary?: Json
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_license_tokens_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_usage_rights: {
        Row: {
          channels: string[]
          created_at: string
          custom_clauses: Json
          deliverables: string[]
          extra_revision_fee: number | null
          id: string
          label: string | null
          license_type: string
          quotation_id: string | null
          revision_rounds: number
          term: string
          territory: string
          territory_custom: string | null
          transfer_on: string
          updated_at: string
          user_id: string
          work_type: string
        }
        Insert: {
          channels?: string[]
          created_at?: string
          custom_clauses?: Json
          deliverables?: string[]
          extra_revision_fee?: number | null
          id?: string
          label?: string | null
          license_type?: string
          quotation_id?: string | null
          revision_rounds?: number
          term?: string
          territory?: string
          territory_custom?: string | null
          transfer_on?: string
          updated_at?: string
          user_id: string
          work_type?: string
        }
        Update: {
          channels?: string[]
          created_at?: string
          custom_clauses?: Json
          deliverables?: string[]
          extra_revision_fee?: number | null
          id?: string
          label?: string | null
          license_type?: string
          quotation_id?: string | null
          revision_rounds?: number
          term?: string
          territory?: string
          territory_custom?: string | null
          transfer_on?: string
          updated_at?: string
          user_id?: string
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_usage_rights_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      line_link_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      line_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          kind: string
          line_user_id: string
          message_id: string
          metadata: Json | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          kind: string
          line_user_id: string
          message_id: string
          metadata?: Json | null
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          kind?: string
          line_user_id?: string
          message_id?: string
          metadata?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      line_send_state: {
        Row: {
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          updated_at: string
        }
        Insert: {
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          updated_at?: string
        }
        Update: {
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          updated_at?: string
        }
        Relationships: []
      }
      meeting_captures: {
        Row: {
          brief_id: string | null
          client_id: string | null
          created_at: string
          credits_extract: number
          credits_report: number
          credits_transcribe: number
          duration_sec: number | null
          error_message: string | null
          extract_result: Json | null
          file_size_bytes: number | null
          id: string
          media_mime: string | null
          media_path: string | null
          quality_score: number | null
          report_markdown: string | null
          source_type: string
          status: string
          summary_bullets: string[] | null
          title: string | null
          transcript: string | null
          updated_at: string
          used_free_slot: boolean
          user_id: string
        }
        Insert: {
          brief_id?: string | null
          client_id?: string | null
          created_at?: string
          credits_extract?: number
          credits_report?: number
          credits_transcribe?: number
          duration_sec?: number | null
          error_message?: string | null
          extract_result?: Json | null
          file_size_bytes?: number | null
          id?: string
          media_mime?: string | null
          media_path?: string | null
          quality_score?: number | null
          report_markdown?: string | null
          source_type: string
          status?: string
          summary_bullets?: string[] | null
          title?: string | null
          transcript?: string | null
          updated_at?: string
          used_free_slot?: boolean
          user_id: string
        }
        Update: {
          brief_id?: string | null
          client_id?: string | null
          created_at?: string
          credits_extract?: number
          credits_report?: number
          credits_transcribe?: number
          duration_sec?: number | null
          error_message?: string | null
          extract_result?: Json | null
          file_size_bytes?: number | null
          id?: string
          media_mime?: string | null
          media_path?: string | null
          quality_score?: number | null
          report_markdown?: string | null
          source_type?: string
          status?: string
          summary_bullets?: string[] | null
          title?: string | null
          transcript?: string | null
          updated_at?: string
          used_free_slot?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_captures_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "design_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_captures_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "saved_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_free_usage: {
        Row: {
          updated_at: string
          used_count: number
          user_id: string
          year_month: string
        }
        Insert: {
          updated_at?: string
          used_count?: number
          user_id: string
          year_month: string
        }
        Update: {
          updated_at?: string
          used_count?: number
          user_id?: string
          year_month?: string
        }
        Relationships: []
      }
      myport_blocks: {
        Row: {
          created_at: string
          id: string
          is_visible: boolean
          page_id: string
          payload: Json
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_visible?: boolean
          page_id: string
          payload?: Json
          sort_order?: number
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_visible?: boolean
          page_id?: string
          payload?: Json
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "myport_blocks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "myport_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      myport_pages: {
        Row: {
          created_at: string
          id: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["myport_page_status"]
          theme: Json
          title: string
          updated_at: string
          user_id: string
          view_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["myport_page_status"]
          theme?: Json
          title?: string
          updated_at?: string
          user_id: string
          view_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["myport_page_status"]
          theme?: Json
          title?: string
          updated_at?: string
          user_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "myport_pages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      payment_notifications: {
        Row: {
          amount_cents: number | null
          created_at: string
          currency: string | null
          environment: string
          event_type: string
          id: string
          message: string
          metadata: Json
          price_id: string | null
          user_id: string | null
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string
          currency?: string | null
          environment?: string
          event_type: string
          id?: string
          message?: string
          metadata?: Json
          price_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount_cents?: number | null
          created_at?: string
          currency?: string | null
          environment?: string
          event_type?: string
          id?: string
          message?: string
          metadata?: Json
          price_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payment_receipts: {
        Row: {
          id: string
          job_id: string
          notes: string | null
          receipt_url: string
          status: string | null
          uploaded_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          id?: string
          job_id: string
          notes?: string | null
          receipt_url: string
          status?: string | null
          uploaded_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          id?: string
          job_id?: string
          notes?: string | null
          receipt_url?: string
          status?: string | null
          uploaded_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          id: number
          mock_topup_enabled: boolean
          stripe_px_enabled: boolean
          updated_at: string
        }
        Insert: {
          id?: number
          mock_topup_enabled?: boolean
          stripe_px_enabled?: boolean
          updated_at?: string
        }
        Update: {
          id?: number
          mock_topup_enabled?: boolean
          stripe_px_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      planner_posts: {
        Row: {
          approval_status: string
          caption: string | null
          client_feedback: string | null
          client_id: string
          created_at: string
          custom_platforms: string[] | null
          id: string
          image_url: string | null
          link: string | null
          meta: Json
          platforms: string[]
          post_date: string
          post_time: string
          status: string
          title: string
          updated_at: string
          user_id: string
          vision_canvas_id: string | null
        }
        Insert: {
          approval_status?: string
          caption?: string | null
          client_feedback?: string | null
          client_id: string
          created_at?: string
          custom_platforms?: string[] | null
          id?: string
          image_url?: string | null
          link?: string | null
          meta?: Json
          platforms?: string[]
          post_date: string
          post_time?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
          vision_canvas_id?: string | null
        }
        Update: {
          approval_status?: string
          caption?: string | null
          client_feedback?: string | null
          client_id?: string
          created_at?: string
          custom_platforms?: string[] | null
          id?: string
          image_url?: string | null
          link?: string | null
          meta?: Json
          platforms?: string[]
          post_date?: string
          post_time?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          vision_canvas_id?: string | null
        }
        Relationships: []
      }
      planner_share_links: {
        Row: {
          client_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          month: string
          share_token: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          month: string
          share_token?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          month?: string
          share_token?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      portfolio_pages: {
        Row: {
          about: Json
          created_at: string
          experience: Json
          external_links: Json
          featured_work: Json
          hero: Json
          published_at: string | null
          resume: Json
          skills: Json
          slug: string
          status: string
          updated_at: string
          user_id: string
          visibility: Json
        }
        Insert: {
          about?: Json
          created_at?: string
          experience?: Json
          external_links?: Json
          featured_work?: Json
          hero?: Json
          published_at?: string | null
          resume?: Json
          skills?: Json
          slug: string
          status?: string
          updated_at?: string
          user_id: string
          visibility?: Json
        }
        Update: {
          about?: Json
          created_at?: string
          experience?: Json
          external_links?: Json
          featured_work?: Json
          hero?: Json
          published_at?: string | null
          resume?: Json
          skills?: Json
          slug?: string
          status?: string
          updated_at?: string
          user_id?: string
          visibility?: Json
        }
        Relationships: []
      }
      price_guide_events: {
        Row: {
          applied: boolean
          complexity: string
          created_at: string
          days: number
          id: string
          job_type: string
          max_price: number
          min_price: number
          quantity: number
          reasoning: string | null
          recommended_price: number
          user_id: string
        }
        Insert: {
          applied?: boolean
          complexity?: string
          created_at?: string
          days?: number
          id?: string
          job_type: string
          max_price?: number
          min_price?: number
          quantity?: number
          reasoning?: string | null
          recommended_price?: number
          user_id: string
        }
        Update: {
          applied?: boolean
          complexity?: string
          created_at?: string
          days?: number
          id?: string
          job_type?: string
          max_price?: number
          min_price?: number
          quantity?: number
          reasoning?: string | null
          recommended_price?: number
          user_id?: string
        }
        Relationships: []
      }
      price_guide_feedback: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          job_type: string | null
          rating: string
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          job_type?: string | null
          rating: string
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          job_type?: string | null
          rating?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      price_guide_overrides: {
        Row: {
          created_at: string
          job_type: string
          max_price: number
          min_price: number
          note: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          job_type: string
          max_price?: number
          min_price?: number
          note?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          job_type?: string
          max_price?: number
          min_price?: number
          note?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string
          active_studio_id: string | null
          address: string | null
          archetype: string | null
          archetype_secondary: string | null
          avatar_url: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          bio: string
          brand_name: string | null
          connect_onboarding_complete: boolean
          connect_payouts_enabled: boolean
          cover_url: string
          created_at: string
          currency: string
          deactivated_at: string | null
          deactivated_by: string | null
          display_name: string | null
          document_theme: Json
          email: string | null
          esign_acknowledged_at: string | null
          experience: Json
          facebook: string
          freelance_field: string | null
          frozen_at: string | null
          frozen_reason: string
          id: string
          instagram: string
          is_active: boolean
          is_verified: boolean
          last_active_at: string | null
          line_id: string
          line_linked_at: string | null
          line_messaging_user_id: string | null
          line_notify_enabled: boolean
          line_notify_prefs: Json
          locale: string
          location: string
          logo_url: string | null
          notify_email: boolean
          notify_hire: boolean
          notify_job_match: boolean
          onboarding_completed: boolean
          onboarding_data: Json
          onboarding_visits: Json
          payment_qr_url: string | null
          persona: string | null
          phone: string | null
          preferred_categories: string[]
          preferred_employment_types: string[]
          purge_after: string | null
          purged_at: string | null
          risk_score: number
          role: string
          signature_url: string | null
          skills: string[]
          social_link: string | null
          stripe_client_payments_enabled: boolean
          stripe_connect_account_id: string | null
          subscription_seats: number
          subscription_tier: string
          tagline: string | null
          tax_id: string | null
          terms: string | null
          tester_applied_at: string | null
          tester_approved: boolean
          updated_at: string
          user_id: string
          username: string | null
          verified_at: string | null
          verified_by: string | null
          website: string
        }
        Insert: {
          account_status?: string
          active_studio_id?: string | null
          address?: string | null
          archetype?: string | null
          archetype_secondary?: string | null
          avatar_url?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bio?: string
          brand_name?: string | null
          connect_onboarding_complete?: boolean
          connect_payouts_enabled?: boolean
          cover_url?: string
          created_at?: string
          currency?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          display_name?: string | null
          document_theme?: Json
          email?: string | null
          esign_acknowledged_at?: string | null
          experience?: Json
          facebook?: string
          freelance_field?: string | null
          frozen_at?: string | null
          frozen_reason?: string
          id?: string
          instagram?: string
          is_active?: boolean
          is_verified?: boolean
          last_active_at?: string | null
          line_id?: string
          line_linked_at?: string | null
          line_messaging_user_id?: string | null
          line_notify_enabled?: boolean
          line_notify_prefs?: Json
          locale?: string
          location?: string
          logo_url?: string | null
          notify_email?: boolean
          notify_hire?: boolean
          notify_job_match?: boolean
          onboarding_completed?: boolean
          onboarding_data?: Json
          onboarding_visits?: Json
          payment_qr_url?: string | null
          persona?: string | null
          phone?: string | null
          preferred_categories?: string[]
          preferred_employment_types?: string[]
          purge_after?: string | null
          purged_at?: string | null
          risk_score?: number
          role?: string
          signature_url?: string | null
          skills?: string[]
          social_link?: string | null
          stripe_client_payments_enabled?: boolean
          stripe_connect_account_id?: string | null
          subscription_seats?: number
          subscription_tier?: string
          tagline?: string | null
          tax_id?: string | null
          terms?: string | null
          tester_applied_at?: string | null
          tester_approved?: boolean
          updated_at?: string
          user_id: string
          username?: string | null
          verified_at?: string | null
          verified_by?: string | null
          website?: string
        }
        Update: {
          account_status?: string
          active_studio_id?: string | null
          address?: string | null
          archetype?: string | null
          archetype_secondary?: string | null
          avatar_url?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bio?: string
          brand_name?: string | null
          connect_onboarding_complete?: boolean
          connect_payouts_enabled?: boolean
          cover_url?: string
          created_at?: string
          currency?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          display_name?: string | null
          document_theme?: Json
          email?: string | null
          esign_acknowledged_at?: string | null
          experience?: Json
          facebook?: string
          freelance_field?: string | null
          frozen_at?: string | null
          frozen_reason?: string
          id?: string
          instagram?: string
          is_active?: boolean
          is_verified?: boolean
          last_active_at?: string | null
          line_id?: string
          line_linked_at?: string | null
          line_messaging_user_id?: string | null
          line_notify_enabled?: boolean
          line_notify_prefs?: Json
          locale?: string
          location?: string
          logo_url?: string | null
          notify_email?: boolean
          notify_hire?: boolean
          notify_job_match?: boolean
          onboarding_completed?: boolean
          onboarding_data?: Json
          onboarding_visits?: Json
          payment_qr_url?: string | null
          persona?: string | null
          phone?: string | null
          preferred_categories?: string[]
          preferred_employment_types?: string[]
          purge_after?: string | null
          purged_at?: string | null
          risk_score?: number
          role?: string
          signature_url?: string | null
          skills?: string[]
          social_link?: string | null
          stripe_client_payments_enabled?: boolean
          stripe_connect_account_id?: string | null
          subscription_seats?: number
          subscription_tier?: string
          tagline?: string | null
          tax_id?: string | null
          terms?: string | null
          tester_applied_at?: string | null
          tester_approved?: boolean
          updated_at?: string
          user_id?: string
          username?: string | null
          verified_at?: string | null
          verified_by?: string | null
          website?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          email: string | null
          id: string
          invited_at: string
          joined_at: string | null
          project_id: string
          revenue_percent: number
          role: string
          user_id: string | null
        }
        Insert: {
          email?: string | null
          id?: string
          invited_at?: string
          joined_at?: string | null
          project_id: string
          revenue_percent?: number
          role?: string
          user_id?: string | null
        }
        Update: {
          email?: string | null
          id?: string
          invited_at?: string
          joined_at?: string | null
          project_id?: string
          revenue_percent?: number
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "shared_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          handover_note: string | null
          id: string
          project_id: string
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          handover_note?: string | null
          id?: string
          project_id: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          handover_note?: string | null
          id?: string
          project_id?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "project_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "shared_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_collaborators: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          quotation_id: string
          revenue_percent: number | null
          role: string
          sort_order: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          quotation_id: string
          revenue_percent?: number | null
          role?: string
          sort_order?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          quotation_id?: string
          revenue_percent?: number | null
          role?: string
          sort_order?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_collaborators_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          addons: Json
          brief_id: string | null
          client_address: string | null
          client_email: string | null
          client_line_id: string | null
          client_name: string
          client_phone: string | null
          client_sign_method: string | null
          client_signature_url: string | null
          client_signed_at: string | null
          client_signer_ip: string | null
          client_signer_name: string | null
          client_signer_user_agent: string | null
          client_tax_id: string | null
          contract_accepted: boolean
          contract_signed_at: string | null
          contract_signer_ip: string | null
          created_at: string
          deposit_due_date: string | null
          deposit_preset: number
          difficulties: Json
          discount_kind: string
          discount_value: number
          due_date: string | null
          end_date: string | null
          header_image_url: string | null
          hidden_cost: number
          hourly_days: number
          hourly_hours: number
          id: string
          include_freelancer_signature: boolean
          inhouse_workspace_id: string | null
          invoice_issued_at: string | null
          invoice_number: string | null
          items: Json
          last_followup_at: string | null
          late_fee_percent: number
          license_certificate_path: string | null
          milestones: Json
          notes: string
          number: string
          org_id: string | null
          org_snapshot: Json | null
          paid_at: string | null
          paid_partial: number
          payment_terms: string
          pdf_exported_at: string | null
          project_name: string
          quotation_kind: string
          receipt_issued_at: string | null
          receipt_number: string | null
          revisions_count: number
          saved_client_id: string | null
          sign_share_token: string | null
          signature_consent_version: string | null
          signature_mode: string
          signed_document_url: string | null
          start_date: string | null
          status: string
          studio_id: string | null
          studio_snapshot: Json | null
          timeline_enabled: boolean
          updated_at: string
          usage_rights_id: string | null
          user_id: string
          vat_enabled: boolean
          vat_rate: number
          wht_enabled: boolean
          wht_rate: number
        }
        Insert: {
          addons?: Json
          brief_id?: string | null
          client_address?: string | null
          client_email?: string | null
          client_line_id?: string | null
          client_name?: string
          client_phone?: string | null
          client_sign_method?: string | null
          client_signature_url?: string | null
          client_signed_at?: string | null
          client_signer_ip?: string | null
          client_signer_name?: string | null
          client_signer_user_agent?: string | null
          client_tax_id?: string | null
          contract_accepted?: boolean
          contract_signed_at?: string | null
          contract_signer_ip?: string | null
          created_at?: string
          deposit_due_date?: string | null
          deposit_preset?: number
          difficulties?: Json
          discount_kind?: string
          discount_value?: number
          due_date?: string | null
          end_date?: string | null
          header_image_url?: string | null
          hidden_cost?: number
          hourly_days?: number
          hourly_hours?: number
          id?: string
          include_freelancer_signature?: boolean
          inhouse_workspace_id?: string | null
          invoice_issued_at?: string | null
          invoice_number?: string | null
          items?: Json
          last_followup_at?: string | null
          late_fee_percent?: number
          license_certificate_path?: string | null
          milestones?: Json
          notes?: string
          number: string
          org_id?: string | null
          org_snapshot?: Json | null
          paid_at?: string | null
          paid_partial?: number
          payment_terms?: string
          pdf_exported_at?: string | null
          project_name?: string
          quotation_kind?: string
          receipt_issued_at?: string | null
          receipt_number?: string | null
          revisions_count?: number
          saved_client_id?: string | null
          sign_share_token?: string | null
          signature_consent_version?: string | null
          signature_mode?: string
          signed_document_url?: string | null
          start_date?: string | null
          status?: string
          studio_id?: string | null
          studio_snapshot?: Json | null
          timeline_enabled?: boolean
          updated_at?: string
          usage_rights_id?: string | null
          user_id: string
          vat_enabled?: boolean
          vat_rate?: number
          wht_enabled?: boolean
          wht_rate?: number
        }
        Update: {
          addons?: Json
          brief_id?: string | null
          client_address?: string | null
          client_email?: string | null
          client_line_id?: string | null
          client_name?: string
          client_phone?: string | null
          client_sign_method?: string | null
          client_signature_url?: string | null
          client_signed_at?: string | null
          client_signer_ip?: string | null
          client_signer_name?: string | null
          client_signer_user_agent?: string | null
          client_tax_id?: string | null
          contract_accepted?: boolean
          contract_signed_at?: string | null
          contract_signer_ip?: string | null
          created_at?: string
          deposit_due_date?: string | null
          deposit_preset?: number
          difficulties?: Json
          discount_kind?: string
          discount_value?: number
          due_date?: string | null
          end_date?: string | null
          header_image_url?: string | null
          hidden_cost?: number
          hourly_days?: number
          hourly_hours?: number
          id?: string
          include_freelancer_signature?: boolean
          inhouse_workspace_id?: string | null
          invoice_issued_at?: string | null
          invoice_number?: string | null
          items?: Json
          last_followup_at?: string | null
          late_fee_percent?: number
          license_certificate_path?: string | null
          milestones?: Json
          notes?: string
          number?: string
          org_id?: string | null
          org_snapshot?: Json | null
          paid_at?: string | null
          paid_partial?: number
          payment_terms?: string
          pdf_exported_at?: string | null
          project_name?: string
          quotation_kind?: string
          receipt_issued_at?: string | null
          receipt_number?: string | null
          revisions_count?: number
          saved_client_id?: string | null
          sign_share_token?: string | null
          signature_consent_version?: string | null
          signature_mode?: string
          signed_document_url?: string | null
          start_date?: string | null
          status?: string
          studio_id?: string | null
          studio_snapshot?: Json | null
          timeline_enabled?: boolean
          updated_at?: string
          usage_rights_id?: string | null
          user_id?: string
          vat_enabled?: boolean
          vat_rate?: number
          wht_enabled?: boolean
          wht_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotations_inhouse_workspace_id_fkey"
            columns: ["inhouse_workspace_id"]
            isOneToOne: false
            referencedRelation: "inhouse_workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "inhouse_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_saved_client_id_fkey"
            columns: ["saved_client_id"]
            isOneToOne: false
            referencedRelation: "saved_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_usage_rights_id_fkey"
            columns: ["usage_rights_id"]
            isOneToOne: false
            referencedRelation: "legal_usage_rights"
            referencedColumns: ["id"]
          },
        ]
      }
      review_pins: {
        Row: {
          board: string
          created_at: string
          id: string
          note: string
          updated_at: string
          user_id: string
          x: number
          y: number
        }
        Insert: {
          board?: string
          created_at?: string
          id?: string
          note?: string
          updated_at?: string
          user_id: string
          x: number
          y: number
        }
        Update: {
          board?: string
          created_at?: string
          id?: string
          note?: string
          updated_at?: string
          user_id?: string
          x?: number
          y?: number
        }
        Relationships: []
      }
      saved_clients: {
        Row: {
          address: string | null
          branch: string | null
          contact_department: string | null
          contact_email: string | null
          contact_line_id: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_social: string | null
          contact_title: string | null
          cover_image_url: string | null
          created_at: string
          email: string | null
          id: string
          industry: string | null
          is_shared: boolean
          legal_name: string | null
          line_id: string | null
          map_url: string | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          preferred_channel: string | null
          rate: number | null
          relationship_status: string
          share_hidden_fields: string[]
          share_token: string | null
          social: string | null
          source: string | null
          tags: string[]
          tax_id: string | null
          type: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          branch?: string | null
          contact_department?: string | null
          contact_email?: string | null
          contact_line_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_social?: string | null
          contact_title?: string | null
          cover_image_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          is_shared?: boolean
          legal_name?: string | null
          line_id?: string | null
          map_url?: string | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          preferred_channel?: string | null
          rate?: number | null
          relationship_status?: string
          share_hidden_fields?: string[]
          share_token?: string | null
          social?: string | null
          source?: string | null
          tags?: string[]
          tax_id?: string | null
          type?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          branch?: string | null
          contact_department?: string | null
          contact_email?: string | null
          contact_line_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_social?: string | null
          contact_title?: string | null
          cover_image_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          is_shared?: boolean
          legal_name?: string | null
          line_id?: string | null
          map_url?: string | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          preferred_channel?: string | null
          rate?: number | null
          relationship_status?: string
          share_hidden_fields?: string[]
          share_token?: string | null
          social?: string | null
          source?: string | null
          tags?: string[]
          tax_id?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      shared_projects: {
        Row: {
          created_at: string
          guest_token: string | null
          guest_visible_columns: string[]
          host_user_id: string
          id: string
          pricing_model: string
          quotation_id: string | null
          status: string
          tax_split_config: Json
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          guest_token?: string | null
          guest_visible_columns?: string[]
          host_user_id: string
          id?: string
          pricing_model?: string
          quotation_id?: string | null
          status?: string
          tax_split_config?: Json
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          guest_token?: string | null
          guest_visible_columns?: string[]
          host_user_id?: string
          id?: string
          pricing_model?: string
          quotation_id?: string | null
          status?: string
          tax_split_config?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_projects_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      spec_checklist_state: {
        Row: {
          checked_ids: Json
          created_at: string
          custom_items: Json
          id: string
          template: string
          updated_at: string
          user_id: string
        }
        Insert: {
          checked_ids?: Json
          created_at?: string
          custom_items?: Json
          id?: string
          template: string
          updated_at?: string
          user_id: string
        }
        Update: {
          checked_ids?: Json
          created_at?: string
          custom_items?: Json
          id?: string
          template?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      storage_tier_config: {
        Row: {
          limit_bytes: number
          per_seat: boolean
          tier: string
          updated_at: string
        }
        Insert: {
          limit_bytes: number
          per_seat?: boolean
          tier: string
          updated_at?: string
        }
        Update: {
          limit_bytes?: number
          per_seat?: boolean
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      stripe_checkout_fulfillments: {
        Row: {
          created_at: string
          environment: string
          kind: string
          price_id: string
          quantity: number
          stripe_session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          environment: string
          kind: string
          price_id: string
          quantity: number
          stripe_session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          environment?: string
          kind?: string
          price_id?: string
          quantity?: number
          stripe_session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          environment: string
          event_id: string
          event_type: string
          processed_at: string
        }
        Insert: {
          environment: string
          event_id: string
          event_type: string
          processed_at?: string
        }
        Update: {
          environment?: string
          event_id?: string
          event_type?: string
          processed_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string
          seat_quantity: number
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id: string
          seat_quantity?: number
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          seat_quantity?: number
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      supplier_files: {
        Row: {
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          supplier_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          supplier_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          supplier_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_files_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_links: {
        Row: {
          created_at: string
          id: string
          label: string
          supplier_id: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string
          supplier_id: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          supplier_id?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_links_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          category: string | null
          contact_name: string | null
          contact_position: string | null
          cover_image_url: string | null
          created_at: string
          email: string | null
          id: string
          is_shared: boolean
          line_id: string | null
          map_url: string | null
          meta: Json
          name: string
          notes: string
          phone: string | null
          rate_note: string | null
          rating: number
          share_hidden_fields: string[]
          share_token: string | null
          tags: string[]
          type: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          contact_name?: string | null
          contact_position?: string | null
          cover_image_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_shared?: boolean
          line_id?: string | null
          map_url?: string | null
          meta?: Json
          name: string
          notes?: string
          phone?: string | null
          rate_note?: string | null
          rating?: number
          share_hidden_fields?: string[]
          share_token?: string | null
          tags?: string[]
          type?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          contact_name?: string | null
          contact_position?: string | null
          cover_image_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_shared?: boolean
          line_id?: string | null
          map_url?: string | null
          meta?: Json
          name?: string
          notes?: string
          phone?: string | null
          rate_note?: string | null
          rating?: number
          share_hidden_fields?: string[]
          share_token?: string | null
          tags?: string[]
          type?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_note: string | null
          beta_feedback_id: string | null
          category: string
          closed_at: string | null
          created_at: string
          description: string | null
          id: string
          priority: string
          rating: number | null
          resolution_note: string | null
          source: string
          source_feature: string | null
          status: string
          ticket_number: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          beta_feedback_id?: string | null
          category?: string
          closed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          rating?: number | null
          resolution_note?: string | null
          source?: string
          source_feature?: string | null
          status?: string
          ticket_number: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          beta_feedback_id?: string | null
          category?: string
          closed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          rating?: number | null
          resolution_note?: string | null
          source?: string
          source_feature?: string | null
          status?: string
          ticket_number?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_beta_feedback_id_fkey"
            columns: ["beta_feedback_id"]
            isOneToOne: false
            referencedRelation: "beta_feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      survey_responses: {
        Row: {
          answers: Json
          created_at: string
          guest_id: string | null
          id: string
          persona: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          answers?: Json
          created_at?: string
          guest_id?: string | null
          id?: string
          persona: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          answers?: Json
          created_at?: string
          guest_id?: string | null
          id?: string
          persona?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tester_applications: {
        Row: {
          alias_name: string | null
          contact_channel: string | null
          contact_email: string | null
          contact_line: string | null
          contact_value: string | null
          created_at: string
          feature_request: string | null
          full_name: string
          id: string
          main_field: string
          main_field_other: string | null
          pain_points: string[]
          pain_points_other: string | null
          quotation_method: string[]
          quotation_method_other: string | null
          updated_at: string
          user_id: string
          years_experience: string
        }
        Insert: {
          alias_name?: string | null
          contact_channel?: string | null
          contact_email?: string | null
          contact_line?: string | null
          contact_value?: string | null
          created_at?: string
          feature_request?: string | null
          full_name: string
          id?: string
          main_field: string
          main_field_other?: string | null
          pain_points?: string[]
          pain_points_other?: string | null
          quotation_method?: string[]
          quotation_method_other?: string | null
          updated_at?: string
          user_id: string
          years_experience: string
        }
        Update: {
          alias_name?: string | null
          contact_channel?: string | null
          contact_email?: string | null
          contact_line?: string | null
          contact_value?: string | null
          created_at?: string
          feature_request?: string | null
          full_name?: string
          id?: string
          main_field?: string
          main_field_other?: string | null
          pain_points?: string[]
          pain_points_other?: string | null
          quotation_method?: string[]
          quotation_method_other?: string | null
          updated_at?: string
          user_id?: string
          years_experience?: string
        }
        Relationships: []
      }
      ticket_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          storage_path: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          storage_path: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          storage_path?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_events: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          event_type: string
          id: string
          new_value: string | null
          old_value: string | null
          ticket_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          event_type: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          ticket_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          event_type?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      typo_pairs: {
        Row: {
          body_font: string
          body_weight: number
          created_at: string
          heading_font: string
          heading_weight: number
          id: string
          label: string | null
          mood: string
          user_id: string
        }
        Insert: {
          body_font: string
          body_weight?: number
          created_at?: string
          heading_font: string
          heading_weight?: number
          id?: string
          label?: string | null
          mood: string
          user_id: string
        }
        Update: {
          body_font?: string
          body_weight?: number
          created_at?: string
          heading_font?: string
          heading_weight?: number
          id?: string
          label?: string | null
          mood?: string
          user_id?: string
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          activity_type?: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_ai_period: {
        Row: {
          id: string
          included_limit: number
          included_used: number
          period_end: string | null
          period_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          included_limit: number
          included_used?: number
          period_end?: string | null
          period_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          included_limit?: number
          included_used?: number
          period_end?: string | null
          period_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_color_palettes: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          balance: number
          environment: string
          id: string
          lifetime_purchased: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          environment?: string
          id?: string
          lifetime_purchased?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          environment?: string
          id?: string
          lifetime_purchased?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_device_events: {
        Row: {
          browser: string | null
          created_at: string
          device_type: string
          id: string
          os: string | null
          pixel_ratio: number | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          viewport_height: number | null
          viewport_width: number | null
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_type: string
          id?: string
          os?: string | null
          pixel_ratio?: number | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_type?: string
          id?: string
          os?: string | null
          pixel_ratio?: number | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
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
      user_saved_colors: {
        Row: {
          created_at: string
          hex: string
          id: string
          label: string | null
          palette_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hex: string
          id?: string
          label?: string | null
          palette_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          hex?: string
          id?: string
          label?: string | null
          palette_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_saved_colors_palette_id_fkey"
            columns: ["palette_id"]
            isOneToOne: false
            referencedRelation: "user_color_palettes"
            referencedColumns: ["id"]
          },
        ]
      }
      vision_canvas_reactions: {
        Row: {
          block_id: string | null
          canvas_id: string
          created_at: string
          guest_name: string | null
          id: string
          kind: string
          message: string | null
          pin_x: number | null
          pin_y: number | null
          target_block_id: string | null
        }
        Insert: {
          block_id?: string | null
          canvas_id: string
          created_at?: string
          guest_name?: string | null
          id?: string
          kind: string
          message?: string | null
          pin_x?: number | null
          pin_y?: number | null
          target_block_id?: string | null
        }
        Update: {
          block_id?: string | null
          canvas_id?: string
          created_at?: string
          guest_name?: string | null
          id?: string
          kind?: string
          message?: string | null
          pin_x?: number | null
          pin_y?: number | null
          target_block_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vision_canvas_reactions_canvas_id_fkey"
            columns: ["canvas_id"]
            isOneToOne: false
            referencedRelation: "vision_canvases"
            referencedColumns: ["id"]
          },
        ]
      }
      vision_canvases: {
        Row: {
          blocks: Json
          brief_id: string | null
          created_at: string
          designer_note: string
          font: string | null
          id: string
          is_public: boolean
          keywords: string[]
          live_text: string
          palette: string[]
          share_token: string
          title: string
          updated_at: string
          user_id: string
          voting_enabled: boolean
        }
        Insert: {
          blocks?: Json
          brief_id?: string | null
          created_at?: string
          designer_note?: string
          font?: string | null
          id?: string
          is_public?: boolean
          keywords?: string[]
          live_text?: string
          palette?: string[]
          share_token?: string
          title?: string
          updated_at?: string
          user_id: string
          voting_enabled?: boolean
        }
        Update: {
          blocks?: Json
          brief_id?: string | null
          created_at?: string
          designer_note?: string
          font?: string | null
          id?: string
          is_public?: boolean
          keywords?: string[]
          live_text?: string
          palette?: string[]
          share_token?: string
          title?: string
          updated_at?: string
          user_id?: string
          voting_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "vision_canvases_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "design_briefs"
            referencedColumns: ["id"]
          },
        ]
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
      work_projects: {
        Row: {
          archived: boolean
          client: string
          client_id: string | null
          comments: Json
          created_at: string
          deadline: string | null
          done_at: string | null
          id: string
          meta: Json
          priority: string
          rate: number | null
          revision_limit: number
          revisions: number
          status: string
          title: string
          updated_at: string
          user_id: string
          versions: Json
        }
        Insert: {
          archived?: boolean
          client?: string
          client_id?: string | null
          comments?: Json
          created_at?: string
          deadline?: string | null
          done_at?: string | null
          id?: string
          meta?: Json
          priority?: string
          rate?: number | null
          revision_limit?: number
          revisions?: number
          status?: string
          title: string
          updated_at?: string
          user_id: string
          versions?: Json
        }
        Update: {
          archived?: boolean
          client?: string
          client_id?: string | null
          comments?: Json
          created_at?: string
          deadline?: string | null
          done_at?: string | null
          id?: string
          meta?: Json
          priority?: string
          rate?: number | null
          revision_limit?: number
          revisions?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          versions?: Json
        }
        Relationships: []
      }
    }
    Views: {
      ecosystem_notifications: {
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
      notifications: {
        Row: {
          actor_avatar: string | null
          actor_name: string | null
          actor_user_id: string | null
          created_at: string | null
          id: string | null
          message: string | null
          project_id: string | null
          read: boolean | null
          type: string | null
          url: string | null
          user_id: string | null
        }
        Insert: {
          actor_avatar?: string | null
          actor_name?: string | null
          actor_user_id?: string | null
          created_at?: string | null
          id?: string | null
          message?: string | null
          project_id?: string | null
          read?: boolean | null
          type?: string | null
          url?: string | null
          user_id?: string | null
        }
        Update: {
          actor_avatar?: string | null
          actor_name?: string | null
          actor_user_id?: string | null
          created_at?: string | null
          id?: string | null
          message?: string | null
          project_id?: string | null
          read?: boolean | null
          type?: string | null
          url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      so1o_notifications: {
        Row: {
          actor_avatar: string | null
          actor_name: string | null
          actor_user_id: string | null
          created_at: string | null
          id: string | null
          message: string | null
          project_id: string | null
          read: boolean | null
          type: string | null
          url: string | null
          user_id: string | null
        }
        Insert: {
          actor_avatar?: string | null
          actor_name?: string | null
          actor_user_id?: string | null
          created_at?: string | null
          id?: string | null
          message?: string | null
          project_id?: string | null
          read?: boolean | null
          type?: string | null
          url?: string | null
          user_id?: string | null
        }
        Update: {
          actor_avatar?: string | null
          actor_name?: string | null
          actor_user_id?: string | null
          created_at?: string | null
          id?: string | null
          message?: string | null
          project_id?: string | null
          read?: boolean | null
          type?: string | null
          url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _ai_daily_credit_limit: { Args: never; Returns: number }
      _ai_daily_eligible: { Args: { _user_id: string }; Returns: boolean }
      _ai_daily_limit: { Args: { _user_id: string }; Returns: number }
      _ai_daily_period: {
        Args: { _user_id: string }
        Returns: {
          included_limit: number
          period_end: string
          period_key: string
        }[]
      }
      _ai_daily_period_end: { Args: never; Returns: string }
      _ai_daily_period_key: { Args: never; Returns: string }
      _ai_free_daily_trial_days_left: {
        Args: { _user_id: string }
        Returns: number
      }
      _ai_free_trial_days_left: { Args: { _user_id: string }; Returns: number }
      _ai_free_trial_ends_at: { Args: { _user_id: string }; Returns: string }
      _ai_resolve_period: {
        Args: { _user_id: string }
        Returns: {
          included_limit: number
          period_end: string
          period_key: string
        }[]
      }
      _ai_signup_at: { Args: { _user_id: string }; Returns: string }
      _ai_sync_daily_period: {
        Args: { _user_id: string }
        Returns: {
          daily_limit: number
          daily_period_key: string
          daily_remaining: number
          daily_used: number
        }[]
      }
      _ai_user_tier: { Args: { _user_id: string }; Returns: string }
      _catalog_demo_project_id: { Args: { i: number }; Returns: string }
      _catalog_demo_uid: { Args: { i: number }; Returns: string }
      _check_welcome_mission: {
        Args: { _mission_id: string; _uid: string }
        Returns: boolean
      }
      _delete_storage_object: {
        Args: { _bucket: string; _path: string }
        Returns: undefined
      }
      _design_drill_day_key: { Args: never; Returns: string }
      _profile_auth_id: { Args: { _uid: string }; Returns: string }
      _storage_path_from_url: {
        Args: { _bucket: string; _url: string }
        Returns: string
      }
      _storage_user_limit: { Args: { _user_id: string }; Returns: number }
      _unsplash_art: {
        Args: { h?: number; i: number; w?: number }
        Returns: string
      }
      _user_rows_bytes: {
        Args: { _sql: string; _user_id: string }
        Returns: number
      }
      _welcome_visit: { Args: { _key: string; _uid: string }; Returns: boolean }
      accept_inhouse_invite: { Args: { _token: string }; Returns: string }
      accept_studio_hire_request: {
        Args: { p_request_id: string }
        Returns: string
      }
      add_ai_credits_atomic: {
        Args: {
          _credits: number
          _environment: string
          _price_id?: string
          _stripe_session_id: string
          _user_id: string
        }
        Returns: number
      }
      admin_ecosystem_funnel: { Args: { _days?: number }; Returns: Json }
      admin_ecosystem_ops_stats: { Args: never; Returns: Json }
      admin_list_platform_events: {
        Args: { _limit?: number }
        Returns: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "platform_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_profiles_safe: {
        Args: never
        Returns: {
          archetype: string
          archetype_secondary: string
          avatar_url: string
          brand_name: string
          created_at: string
          currency: string
          deactivated_at: string
          deactivated_by: string
          display_name: string
          email: string
          freelance_field: string
          id: string
          is_active: boolean
          last_active_at: string
          onboarding_completed: boolean
          onboarding_data: Json
          persona: string
          purge_after: string
          purged_at: string
          subscription_seats: number
          subscription_tier: string
          tagline: string
          tester_applied_at: string
          tester_approved: boolean
          updated_at: string
          user_id: string
        }[]
      }
      admin_search_users: {
        Args: { _limit?: number; _query: string }
        Returns: {
          created_at: string
          display_name: string
          subscription_tier: string
          user_id: string
          username: string
        }[]
      }
      admin_sso_metrics: { Args: never; Returns: Json }
      admin_user_360: { Args: { _user_id: string }; Returns: Json }
      assert_org_seat_available: {
        Args: { _org_id: string }
        Returns: undefined
      }
      auto_update_invoice_statuses: { Args: never; Returns: number }
      check_and_increment_ai_usage: {
        Args: { _feature: string; _limit: number; _user_id: string }
        Returns: Json
      }
      check_portfolio_slug_available: {
        Args: { _slug: string; _user_id?: string }
        Returns: boolean
      }
      claim_design_drill_reroll: {
        Args: { _daily_limit?: number; _user_id: string }
        Returns: Json
      }
      claim_meeting_free_slot: { Args: { _user_id: string }; Returns: Json }
      confirm_brief_by_token: {
        Args: { _name: string; _signature: string; _token: string }
        Returns: boolean
      }
      create_inhouse_org: {
        Args: { _name: string; _workspace_name?: string }
        Returns: string
      }
      debit_ai_credits: {
        Args: {
          _environment?: string
          _feature: string
          _idempotency_key?: string
          _user_id: string
        }
        Returns: Json
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      enqueue_line_notification: {
        Args: {
          _idempotency_key?: string
          _kind: string
          _link?: string
          _params?: Json
          _user_id: string
        }
        Returns: number
      }
      find_or_create_studio_chat: {
        Args: { p_studio_id: string }
        Returns: string
      }
      force_purge_user: {
        Args: { _admin_user_id?: string; _target_user_id: string }
        Returns: {
          auth_deleted: boolean
          user_id: string
          warnings: string[]
        }[]
      }
      format_ticket_number: { Args: { n: number }; Returns: string }
      fulfill_client_job_payment_stripe: {
        Args: {
          _amount_thb: number
          _environment: string
          _freelancer_user_id: string
          _job_id: string
          _payment_type: string
          _stripe_session_id: string
        }
        Returns: Json
      }
      gen_tracking_code: { Args: never; Returns: string }
      get_admin_activity_feed: {
        Args: { _category?: string; _days?: number; _limit?: number }
        Returns: {
          category: string
          detail: string
          event_type: string
          occurred_at: string
          ref_id: string
          title: string
          user_id: string
        }[]
      }
      get_ai_usage_summary: {
        Args: { _environment?: string; _user_id: string }
        Returns: Json
      }
      get_brief_by_token: { Args: { _token: string }; Returns: Json }
      get_calculator_usage_count: { Args: never; Returns: number }
      get_daily_active_users: {
        Args: { _days?: number }
        Returns: {
          active_users: number
          day: string
          total_events: number
        }[]
      }
      get_db_usage_stats: { Args: never; Returns: Json }
      get_design_drill_reroll_status: {
        Args: { _daily_limit?: number; _user_id: string }
        Returns: Json
      }
      get_device_breakdown: {
        Args: { _by?: string; _days?: number }
        Returns: {
          label: string
          sessions: number
          unique_users: number
        }[]
      }
      get_device_usage_stats: {
        Args: { _days?: number }
        Returns: {
          device_type: string
          pct: number
          sessions: number
          unique_users: number
        }[]
      }
      get_feature_data_stats: {
        Args: never
        Returns: {
          avg_per_user: number
          feature: string
          max_per_user: number
          table_name: string
          total_records: number
          unique_users: number
        }[]
      }
      get_feature_usage_stats: {
        Args: { _days?: number }
        Returns: {
          feature: string
          last_used: string
          total_events: number
          unique_users: number
        }[]
      }
      get_feature_usage_trend: {
        Args: { _days?: number }
        Returns: {
          day: string
          events: number
          feature: string
          unique_users: number
        }[]
      }
      get_hourly_active_distribution: {
        Args: { _days?: number }
        Returns: {
          events: number
          hour: number
          unique_users: number
        }[]
      }
      get_my_pending_inhouse_invites: {
        Args: never
        Returns: {
          email: string
          expires_at: string
          id: string
          org_id: string
          org_name: string
          org_slug: string
          role: Database["public"]["Enums"]["inhouse_member_role"]
          token: string
        }[]
      }
      get_planner_posts_by_token: {
        Args: { _token: string }
        Returns: {
          approval_status: string
          caption: string
          client_feedback: string
          client_id: string
          custom_platforms: string[]
          id: string
          image_url: string
          link: string
          platforms: string[]
          post_date: string
          post_time: string
          status: string
          title: string
        }[]
      }
      get_planner_share_by_token: {
        Args: { _token: string }
        Returns: {
          client_id: string
          created_at: string
          expires_at: string
          id: string
          month: string
          share_token: string
          user_id: string
        }[]
      }
      get_portfolio_by_slug: { Args: { _slug: string }; Returns: Json }
      get_public_myport_by_slug: { Args: { _slug: string }; Returns: Json }
      get_public_profile: {
        Args: { _user_id: string }
        Returns: {
          avatar_url: string
          brand_name: string
          created_at: string
          display_name: string
          logo_url: string
          social_link: string
          tagline: string
          user_id: string
        }[]
      }
      get_quotation_sign_payload_by_token: {
        Args: { _token: string }
        Returns: Json
      }
      get_shared_client_by_token: { Args: { _token: string }; Returns: Json }
      get_shared_supplier_by_token: { Args: { _token: string }; Returns: Json }
      get_storage_usage_stats: { Args: never; Returns: Json }
      get_top_active_users: {
        Args: { _days?: number; _limit?: number }
        Returns: {
          active_days: number
          display_name: string
          email: string
          last_seen: string
          total_events: number
          user_id: string
        }[]
      }
      get_top_subscriptions: {
        Args: { _limit?: number }
        Returns: {
          avg_price: number
          category: string
          name: string
          total_monthly_value: number
          total_subscriptions: number
          user_count: number
        }[]
      }
      get_user_storage_summary: { Args: { _user_id: string }; Returns: Json }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_article_view: { Args: { _slug: string }; Returns: undefined }
      increment_myport_view: { Args: { _slug: string }; Returns: undefined }
      inhouse_active_member_count: {
        Args: { _org_id: string }
        Returns: number
      }
      inhouse_can_access_workspace: {
        Args: { _user_id?: string; _workspace_id: string }
        Returns: boolean
      }
      inhouse_is_org_admin: {
        Args: { _org_id: string; _user_id?: string }
        Returns: boolean
      }
      inhouse_is_org_member: {
        Args: { _org_id: string; _user_id?: string }
        Returns: boolean
      }
      is_pro_tier: { Args: { _user_id: string }; Returns: boolean }
      is_quotation_collaborator: {
        Args: { p_quotation_id: string }
        Returns: boolean
      }
      is_quotation_lead_collaborator: {
        Args: { p_quotation_id: string }
        Returns: boolean
      }
      is_studio_admin: { Args: { p_studio_id: string }; Returns: boolean }
      log_inhouse_activity: {
        Args: {
          _event_type: string
          _metadata?: Json
          _org_id: string
          _workspace_id: string
        }
        Returns: string
      }
      log_platform_event: {
        Args: {
          p_actor_id?: string
          p_event_type: string
          p_metadata?: Json
          p_target_id?: string
          p_target_type?: string
        }
        Returns: string
      }
      log_user_activity: { Args: { _activity_type?: string }; Returns: boolean }
      mark_cashout_failed_stripe: {
        Args: { _cashout_id: string; _reason?: string }
        Returns: undefined
      }
      mark_cashout_paid_stripe: {
        Args: { _cashout_id: string }
        Returns: undefined
      }
      mark_cashout_processing: {
        Args: { _cashout_id: string; _stripe_transfer_id: string }
        Returns: undefined
      }
      match_ai_knowledge: {
        Args: {
          match_count?: number
          match_feature: string
          query_embedding: string
        }
        Returns: {
          feature: string
          id: string
          ideal_response: string
          prompt: string
          similarity: number
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      ops_promote_work_item: {
        Args: {
          p_description?: string
          p_source_id: string
          p_source_type: string
          p_title: string
        }
        Returns: Database["ops"]["Tables"]["issues"]["Row"]
        SetofOptions: {
          from: "*"
          to: "issues"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      project_media_user_owns_path: {
        Args: { object_name: string }
        Returns: boolean
      }
      public_feed_stats: { Args: never; Returns: Json }
      purge_inactive_profile_data: {
        Args: { _limit?: number }
        Returns: {
          auth_deleted: boolean
          user_id: string
          warnings: string[]
        }[]
      }
      purge_old_storage: { Args: never; Returns: undefined }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      refund_ai_credits: {
        Args: {
          _original_idempotency_key: string
          _refund_idempotency_key: string
          _user_id: string
        }
        Returns: Json
      }
      render_line_message: {
        Args: { _kind: string; _locale: string; _params: Json }
        Returns: string
      }
      reset_ai_period_on_renewal: {
        Args: { _user_id: string }
        Returns: undefined
      }
      resolve_quotation_id_by_sign_token: {
        Args: { _token: string }
        Returns: string
      }
      sign_quotation_by_token: {
        Args: {
          _consent_version?: string
          _method: string
          _name: string
          _signature_url?: string
          _signed_document_url?: string
          _signer_ip?: string
          _signer_ua?: string
          _token: string
        }
        Returns: boolean
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
        Returns: Database["anthem"]["Tables"]["app_feedback"]["Row"]
        SetofOptions: {
          from: "*"
          to: "app_feedback"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_post_approval: {
        Args: {
          _feedback: string
          _post_id: string
          _share_token: string
          _status: string
        }
        Returns: undefined
      }
      sync_connect_account: {
        Args: {
          _account_id: string
          _onboarding_complete: boolean
          _payouts_enabled: boolean
          _user_id: string
        }
        Returns: undefined
      }
      sync_inhouse_org_seat_limit: {
        Args: { _owner_id: string }
        Returns: undefined
      }
      sync_user_tier: { Args: { _user_id: string }; Returns: undefined }
      topup_wallet_mock: { Args: { _amount_px: number }; Returns: string }
      topup_wallet_stripe: {
        Args: {
          _amount_cents?: number
          _amount_px: number
          _environment?: string
          _price_id?: string
          _stripe_session_id: string
          _user_id: string
        }
        Returns: string
      }
      touch_last_active: { Args: never; Returns: undefined }
      update_brief_by_token: {
        Args: {
          _audience?: Json
          _client_info?: Json
          _design_direction?: Json
          _notes?: string
          _project_overview?: Json
          _references?: Json
          _tech_specs?: Json
          _timeline_budget?: Json
          _token: string
        }
        Returns: boolean
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
      hire_budget: "1k-5k" | "5k-20k" | "20k-50k" | "50k+"
      hire_status:
        | "α╣âα╕½α╕íα╣ê"
        | "α╕ùα╕╡α╣êα╕òα╣ëα╕¡α╕çα╕òα╕¡α╕Ü"
        | "α╕òα╕┤α╕öα╕òα╣êα╕¡α╣üα╕Ñα╣ëα╕º"
        | "α╕¢α╕┤α╕öα╣üα╕Ñα╣ëα╕º"
        | "α╕òα╕¡α╕Üα╕úα╕▒α╕Ü"
        | "α╕¢α╕Åα╕┤α╣Çα╕¬α╕ÿ"
      inhouse_member_role: "owner" | "admin" | "member" | "viewer"
      inhouse_member_status: "invited" | "active" | "removed"
      job_application_status:
        | "pending"
        | "shortlisted"
        | "rejected"
        | "accepted"
      job_budget_type: "fixed" | "hourly" | "monthly"
      job_location_type: "remote" | "onsite" | "hybrid"
      job_status: "open" | "closed" | "filled"
      myport_page_status: "draft" | "published"
      studio_formation_status: "pending" | "completed" | "cancelled"
      studio_invite_status: "pending" | "accepted" | "declined"
      studio_member_role: "owner" | "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  shared: {
    Tables: {
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
      cashout_requests: {
        Row: {
          bank_info: Json
          created_at: string
          failure_reason: string | null
          fee_px: number
          gross_px: number
          id: string
          net_px: number
          processed_at: string | null
          status: string
          stripe_transfer_id: string | null
          user_id: string
        }
        Insert: {
          bank_info?: Json
          created_at?: string
          failure_reason?: string | null
          fee_px?: number
          gross_px: number
          id?: string
          net_px: number
          processed_at?: string | null
          status?: string
          stripe_transfer_id?: string | null
          user_id: string
        }
        Update: {
          bank_info?: Json
          created_at?: string
          failure_reason?: string | null
          fee_px?: number
          gross_px?: number
          id?: string
          net_px?: number
          processed_at?: string | null
          status?: string
          stripe_transfer_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_pins: {
        Row: {
          conversation_id: string
          pinned_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          pinned_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          pinned_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_pins_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          client_id: string
          conversation_type: string
          created_at: string
          created_by: string | null
          freelancer_id: string
          id: string
          kind: string
          last_message_at: string
          project_id: string | null
          project_title: string
          request_id: string | null
          studio_id: string | null
          title: string | null
        }
        Insert: {
          client_id: string
          conversation_type?: string
          created_at?: string
          created_by?: string | null
          freelancer_id: string
          id?: string
          kind: string
          last_message_at?: string
          project_id?: string | null
          project_title?: string
          request_id?: string | null
          studio_id?: string | null
          title?: string | null
        }
        Update: {
          client_id?: string
          conversation_type?: string
          created_at?: string
          created_by?: string | null
          freelancer_id?: string
          id?: string
          kind?: string
          last_message_at?: string
          project_id?: string | null
          project_title?: string
          request_id?: string | null
          studio_id?: string | null
          title?: string | null
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
      messages: {
        Row: {
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string
          deleted_at: string | null
          id: string
          message_type: string
          project_id: string | null
          read_at: string | null
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          attachment_url?: string | null
          content?: string
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          message_type?: string
          project_id?: string | null
          read_at?: string | null
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          message_type?: string
          project_id?: string | null
          read_at?: string | null
          reply_to_id?: string | null
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
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          app: string
          body: string
          created_at: string
          id: string
          is_dismissed: boolean
          is_read: boolean
          kind: string
          link: string
          metadata: Json
          title: string
          user_id: string
        }
        Insert: {
          app: string
          body?: string
          created_at?: string
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          kind: string
          link?: string
          metadata?: Json
          title: string
          user_id: string
        }
        Update: {
          app?: string
          body?: string
          created_at?: string
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          kind?: string
          link?: string
          metadata?: Json
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_topups: {
        Row: {
          amount_cents: number | null
          amount_px: number
          created_at: string
          id: string
          method: string
          payment_provider: string | null
          status: string
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents?: number | null
          amount_px: number
          created_at?: string
          id?: string
          method?: string
          payment_provider?: string | null
          status?: string
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number | null
          amount_px?: number
          created_at?: string
          id?: string
          method?: string
          payment_provider?: string | null
          status?: string
          stripe_session_id?: string | null
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
      [_ in never]: never
    }
    Functions: {
      push_notification: {
        Args: {
          _app: string
          _body?: string
          _kind: string
          _link?: string
          _metadata?: Json
          _title: string
          _user_id: string
        }
        Returns: string
      }
      user_in_conversation: {
        Args: { conv_id: string; uid: string }
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
  so1o: {
    Tables: {
      notifications: {
        Row: {
          actor_avatar: string | null
          actor_name: string
          actor_user_id: string | null
          created_at: string
          id: string
          message: string
          project_id: string | null
          read: boolean
          type: string
          url: string | null
          user_id: string
        }
        Insert: {
          actor_avatar?: string | null
          actor_name?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          message?: string
          project_id?: string | null
          read?: boolean
          type: string
          url?: string | null
          user_id: string
        }
        Update: {
          actor_avatar?: string | null
          actor_name?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          message?: string
          project_id?: string | null
          read?: boolean
          type?: string
          url?: string | null
          user_id?: string
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
  anthem: {
    Enums: {},
  },
  graphql_public: {
    Enums: {},
  },
  ops: {
    Enums: {},
  },
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
      hire_budget: ["1k-5k", "5k-20k", "20k-50k", "50k+"],
      hire_status: [
        "α╣âα╕½α╕íα╣ê",
        "α╕ùα╕╡α╣êα╕òα╣ëα╕¡α╕çα╕òα╕¡α╕Ü",
        "α╕òα╕┤α╕öα╕òα╣êα╕¡α╣üα╕Ñα╣ëα╕º",
        "α╕¢α╕┤α╕öα╣üα╕Ñα╣ëα╕º",
        "α╕òα╕¡α╕Üα╕úα╕▒α╕Ü",
        "α╕¢α╕Åα╕┤α╣Çα╕¬α╕ÿ",
      ],
      inhouse_member_role: ["owner", "admin", "member", "viewer"],
      inhouse_member_status: ["invited", "active", "removed"],
      job_application_status: [
        "pending",
        "shortlisted",
        "rejected",
        "accepted",
      ],
      job_budget_type: ["fixed", "hourly", "monthly"],
      job_location_type: ["remote", "onsite", "hybrid"],
      job_status: ["open", "closed", "filled"],
      myport_page_status: ["draft", "published"],
      studio_formation_status: ["pending", "completed", "cancelled"],
      studio_invite_status: ["pending", "accepted", "declined"],
      studio_member_role: ["owner", "admin", "member"],
    },
  },
  shared: {
    Enums: {},
  },
  so1o: {
    Enums: {},
  },
} as const
