/* eslint-disable */
// AUTO-GENERATED from the live database (public via Supabase type generator; anthem + shared from information_schema).
// Do not edit by hand — regenerate. App code imports the routed `Database` from ./types instead.
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
      app_feedback: {
        Row: {
          id: string
          user_id: string
          feature: string
          route: string
          rating: number | null
          message: string
          user_agent: string
          viewport: string
          created_at: string
          project_id: string | null
          status: string
          admin_note: string
          resolved_by: string | null
          resolved_at: string | null
          updated_at: string
          kind: string | null
          ticket_number: string | null
          screenshot_path: string
          annotation_json: Json
        }
        Insert: {
          id?: string
          user_id: string
          feature?: string
          route?: string
          rating?: number | null
          message?: string
          user_agent?: string
          viewport?: string
          created_at?: string
          project_id?: string | null
          status?: string
          admin_note?: string
          resolved_by?: string | null
          resolved_at?: string | null
          updated_at?: string
          kind?: string | null
          ticket_number?: string | null
          screenshot_path?: string
          annotation_json?: Json
        }
        Update: {
          id?: string
          user_id?: string
          feature?: string
          route?: string
          rating?: number | null
          message?: string
          user_agent?: string
          viewport?: string
          created_at?: string
          project_id?: string | null
          status?: string
          admin_note?: string
          resolved_by?: string | null
          resolved_at?: string | null
          updated_at?: string
          kind?: string | null
          ticket_number?: string | null
          screenshot_path?: string
          annotation_json?: Json
        }
        Relationships: []
      }
      chat_settings: {
        Row: {
          user_id: string
          hire_auto_reply_enabled: boolean
          hire_auto_reply_text: string
          hire_auto_reply_image_url: string | null
          hire_auto_reply_link_url: string | null
          collab_auto_reply_enabled: boolean
          collab_auto_reply_text: string
          collab_auto_reply_image_url: string | null
          collab_auto_reply_link_url: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          hire_auto_reply_enabled?: boolean
          hire_auto_reply_text?: string
          hire_auto_reply_image_url?: string | null
          hire_auto_reply_link_url?: string | null
          collab_auto_reply_enabled?: boolean
          collab_auto_reply_text?: string
          collab_auto_reply_image_url?: string | null
          collab_auto_reply_link_url?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          hire_auto_reply_enabled?: boolean
          hire_auto_reply_text?: string
          hire_auto_reply_image_url?: string | null
          hire_auto_reply_link_url?: string | null
          collab_auto_reply_enabled?: boolean
          collab_auto_reply_text?: string
          collab_auto_reply_image_url?: string | null
          collab_auto_reply_link_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      collab_requests: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string
          project_id: string | null
          collab_types: string[]
          message: string
          attached_project_ids: string[]
          external_drive_url: string | null
          website_url: string | null
          other_type_note: string | null
          status: Database["public"]["Enums"]["collab_status"]
          created_at: string
          updated_at: string
          cancel_reason: string | null
          cancel_note: string | null
          reject_reason: string | null
          reject_note: string | null
          keep_chat: boolean
          inbox_priority: string
        }
        Insert: {
          id?: string
          sender_id: string
          recipient_id: string
          project_id?: string | null
          collab_types?: string[]
          message: string
          attached_project_ids?: string[]
          external_drive_url?: string | null
          website_url?: string | null
          other_type_note?: string | null
          status?: Database["public"]["Enums"]["collab_status"]
          created_at?: string
          updated_at?: string
          cancel_reason?: string | null
          cancel_note?: string | null
          reject_reason?: string | null
          reject_note?: string | null
          keep_chat?: boolean
          inbox_priority?: string
        }
        Update: {
          id?: string
          sender_id?: string
          recipient_id?: string
          project_id?: string | null
          collab_types?: string[]
          message?: string
          attached_project_ids?: string[]
          external_drive_url?: string | null
          website_url?: string | null
          other_type_note?: string | null
          status?: Database["public"]["Enums"]["collab_status"]
          created_at?: string
          updated_at?: string
          cancel_reason?: string | null
          cancel_note?: string | null
          reject_reason?: string | null
          reject_note?: string | null
          keep_chat?: boolean
          inbox_priority?: string
        }
        Relationships: []
      }
      collection_items: {
        Row: {
          collection_id: string
          project_id: string
          added_at: string
          community_post_id: string | null
        }
        Insert: {
          collection_id: string
          project_id: string
          added_at?: string
          community_post_id?: string | null
        }
        Update: {
          collection_id?: string
          project_id?: string
          added_at?: string
          community_post_id?: string | null
        }
        Relationships: []
      }
      collections: {
        Row: {
          id: string
          owner_id: string
          name: string
          description: string
          category: string
          cover_url: string
          is_public: boolean
          item_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          description?: string
          category?: string
          cover_url?: string
          is_public?: boolean
          item_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          description?: string
          category?: string
          cover_url?: string
          is_public?: boolean
          item_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_comment_likes: {
        Row: {
          comment_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          comment_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          comment_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      community_engagement_rewards: {
        Row: {
          id: string
          user_id: string
          post_id: string | null
          kind: string
          px_amount: number
          idempotency_key: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          post_id?: string | null
          kind: string
          px_amount?: number
          idempotency_key: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          post_id?: string | null
          kind?: string
          px_amount?: number
          idempotency_key?: string
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      community_notification_receipts: {
        Row: {
          kind: string
          source_id: string
          recipient_id: string
          actor_id: string
          created_at: string
        }
        Insert: {
          kind: string
          source_id: string
          recipient_id: string
          actor_id: string
          created_at?: string
        }
        Update: {
          kind?: string
          source_id?: string
          recipient_id?: string
          actor_id?: string
          created_at?: string
        }
        Relationships: []
      }
      community_post_bookmarks: {
        Row: {
          post_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          post_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          post_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      community_post_comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          content: string
          parent_id: string | null
          depth: number
          created_at: string
          like_count: number
          image_urls: string[]
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          content: string
          parent_id?: string | null
          depth?: number
          created_at?: string
          like_count?: number
          image_urls?: string[]
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          content?: string
          parent_id?: string | null
          depth?: number
          created_at?: string
          like_count?: number
          image_urls?: string[]
        }
        Relationships: []
      }
      community_post_likes: {
        Row: {
          post_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          post_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          post_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      community_post_views: {
        Row: {
          id: string
          post_id: string
          user_id: string | null
          created_at: string
          view_day: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id?: string | null
          created_at?: string
          view_day?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string | null
          created_at?: string
          view_day?: string
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          id: string
          author_id: string
          post_kind: string
          title: string
          body: string
          category: string
          tags: string[]
          gallery_urls: string[]
          video_urls: string[]
          question_topic: string | null
          status: string
          reply_count: number
          created_at: string
          updated_at: string
          like_count: number
          view_count: number
          tools: string[]
          mentioned_project_ids: string[]
          tagged_user_ids: string[]
          media_aspect: string
          quoted_post_id: string | null
          quote_comment: string | null
          link_urls: string[]
          text_cover_theme: string | null
        }
        Insert: {
          id?: string
          author_id: string
          post_kind: string
          title: string
          body: string
          category?: string
          tags?: string[]
          gallery_urls?: string[]
          video_urls?: string[]
          question_topic?: string | null
          status?: string
          reply_count?: number
          created_at?: string
          updated_at?: string
          like_count?: number
          view_count?: number
          tools?: string[]
          mentioned_project_ids?: string[]
          tagged_user_ids?: string[]
          media_aspect?: string
          quoted_post_id?: string | null
          quote_comment?: string | null
          link_urls?: string[]
          text_cover_theme?: string | null
        }
        Update: {
          id?: string
          author_id?: string
          post_kind?: string
          title?: string
          body?: string
          category?: string
          tags?: string[]
          gallery_urls?: string[]
          video_urls?: string[]
          question_topic?: string | null
          status?: string
          reply_count?: number
          created_at?: string
          updated_at?: string
          like_count?: number
          view_count?: number
          tools?: string[]
          mentioned_project_ids?: string[]
          tagged_user_ids?: string[]
          media_aspect?: string
          quoted_post_id?: string | null
          quote_comment?: string | null
          link_urls?: string[]
          text_cover_theme?: string | null
        }
        Relationships: []
      }
      creator_objects: {
        Row: {
          id: string
          owner_id: string
          title: string
          code: string
          summary: string
          story: string
          kind: string
          subtype: string
          material: string
          fulfillment: string
          edition: string
          edition_label: string
          price_thb: number
          lead_time: string
          cover_url: string | null
          gallery_urls: string[]
          finishes: Json
          specs: Json
          downloads: Json
          license_note: string
          status: string
          created_at: string
          updated_at: string
          reference_project_ids: string[]
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          code?: string
          summary?: string
          story?: string
          kind: string
          subtype?: string
          material?: string
          fulfillment?: string
          edition?: string
          edition_label?: string
          price_thb: number
          lead_time?: string
          cover_url?: string | null
          gallery_urls?: string[]
          finishes?: Json
          specs?: Json
          downloads?: Json
          license_note?: string
          status?: string
          created_at?: string
          updated_at?: string
          reference_project_ids?: string[]
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          code?: string
          summary?: string
          story?: string
          kind?: string
          subtype?: string
          material?: string
          fulfillment?: string
          edition?: string
          edition_label?: string
          price_thb?: number
          lead_time?: string
          cover_url?: string | null
          gallery_urls?: string[]
          finishes?: Json
          specs?: Json
          downloads?: Json
          license_note?: string
          status?: string
          created_at?: string
          updated_at?: string
          reference_project_ids?: string[]
        }
        Relationships: []
      }
      creator_service_bookmarks: {
        Row: {
          service_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          service_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          service_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      creator_service_views: {
        Row: {
          viewer_id: string
          service_id: string
          viewed_at: string
          referrer_project_id: string | null
        }
        Insert: {
          viewer_id: string
          service_id: string
          viewed_at?: string
          referrer_project_id?: string | null
        }
        Update: {
          viewer_id?: string
          service_id?: string
          viewed_at?: string
          referrer_project_id?: string | null
        }
        Relationships: []
      }
      creator_services: {
        Row: {
          id: string
          owner_id: string
          title: string
          price_thb: number
          summary: string
          deliverables: string[]
          duration_label: string
          concepts_label: string
          revisions_label: string
          cover_url: string | null
          status: string
          sort_order: number
          created_at: string
          updated_at: string
          gallery_urls: string[]
          price_min_thb: number
          category: string
          tags: string[]
          reference_project_ids: string[]
          exclusions_note: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          price_thb: number
          summary?: string
          deliverables?: string[]
          duration_label?: string
          concepts_label?: string
          revisions_label?: string
          cover_url?: string | null
          status?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
          gallery_urls?: string[]
          price_min_thb?: number
          category?: string
          tags?: string[]
          reference_project_ids?: string[]
          exclusions_note?: string
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          price_thb?: number
          summary?: string
          deliverables?: string[]
          duration_label?: string
          concepts_label?: string
          revisions_label?: string
          cover_url?: string | null
          status?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
          gallery_urls?: string[]
          price_min_thb?: number
          category?: string
          tags?: string[]
          reference_project_ids?: string[]
          exclusions_note?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          follower_id?: string
          following_id?: string
          created_at?: string
        }
        Relationships: []
      }
      forum_attachments: {
        Row: {
          id: string
          topic_id: string | null
          reply_id: string | null
          author_id: string
          kind: string
          file_name: string
          mime_type: string
          size_bytes: number
          storage_path: string | null
          public_url: string | null
          scan_status: string
          scan_reason: string | null
          scanned_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          topic_id?: string | null
          reply_id?: string | null
          author_id: string
          kind: string
          file_name: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string | null
          public_url?: string | null
          scan_status?: string
          scan_reason?: string | null
          scanned_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          topic_id?: string | null
          reply_id?: string | null
          author_id?: string
          kind?: string
          file_name?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string | null
          public_url?: string | null
          scan_status?: string
          scan_reason?: string | null
          scanned_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      forum_categories: {
        Row: {
          id: string
          slug: string
          name_th: string
          description: string
          icon: string
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          name_th: string
          description?: string
          icon?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name_th?: string
          description?: string
          icon?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      forum_replies: {
        Row: {
          id: string
          topic_id: string
          author_id: string
          body: string
          parent_id: string | null
          is_accepted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          topic_id: string
          author_id: string
          body: string
          parent_id?: string | null
          is_accepted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          topic_id?: string
          author_id?: string
          body?: string
          parent_id?: string | null
          is_accepted?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      forum_topic_bookmarks: {
        Row: {
          topic_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          topic_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          topic_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      forum_topic_likes: {
        Row: {
          topic_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          topic_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          topic_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      forum_topics: {
        Row: {
          id: string
          category_id: string
          author_id: string
          title: string
          body: string
          status: string
          tags: string[]
          reply_count: number
          like_count: number
          view_count: number
          last_activity_at: string
          accepted_reply_id: string | null
          is_locked: boolean
          moderation_state: string
          created_at: string
          updated_at: string
          is_pinned: boolean
          pinned_at: string | null
          admin_note: string
          is_announcement: boolean
        }
        Insert: {
          id?: string
          category_id: string
          author_id: string
          title: string
          body: string
          status?: string
          tags?: string[]
          reply_count?: number
          like_count?: number
          view_count?: number
          last_activity_at?: string
          accepted_reply_id?: string | null
          is_locked?: boolean
          moderation_state?: string
          created_at?: string
          updated_at?: string
          is_pinned?: boolean
          pinned_at?: string | null
          admin_note?: string
          is_announcement?: boolean
        }
        Update: {
          id?: string
          category_id?: string
          author_id?: string
          title?: string
          body?: string
          status?: string
          tags?: string[]
          reply_count?: number
          like_count?: number
          view_count?: number
          last_activity_at?: string
          accepted_reply_id?: string | null
          is_locked?: boolean
          moderation_state?: string
          created_at?: string
          updated_at?: string
          is_pinned?: boolean
          pinned_at?: string | null
          admin_note?: string
          is_announcement?: boolean
        }
        Relationships: []
      }
      forum_user_ranks: {
        Row: {
          user_id: string
          rank: string
          title_th: string
          granted_by: string | null
          note: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          rank: string
          title_th?: string
          granted_by?: string | null
          note?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          rank?: string
          title_th?: string
          granted_by?: string | null
          note?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      hire_cancel_request_events: {
        Row: {
          id: string
          cancel_request_id: string
          actor_id: string | null
          event_type: string
          snapshot: Json
          diff_summary: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cancel_request_id: string
          actor_id?: string | null
          event_type: string
          snapshot?: Json
          diff_summary?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cancel_request_id?: string
          actor_id?: string | null
          event_type?: string
          snapshot?: Json
          diff_summary?: string | null
          created_at?: string
        }
        Relationships: []
      }
      hire_cancel_requests: {
        Row: {
          id: string
          hiring_request_id: string
          conversation_id: string | null
          initiated_by: string
          initiator_id: string
          status: string
          money_terms: string
          reason_id: string | null
          reason_note: string | null
          evidence_urls: string[]
          response_money_terms: string | null
          response_reason_id: string | null
          response_note: string | null
          responder_id: string | null
          responded_at: string | null
          first_submitted_at: string
          last_edited_at: string | null
          respond_deadline_at: string
          edit_until_at: string
          reminder_24h_sent_at: string | null
          reminder_near_sent_at: string | null
          created_at: string
          updated_at: string
          hire_order_id: string | null
        }
        Insert: {
          id?: string
          hiring_request_id: string
          conversation_id?: string | null
          initiated_by: string
          initiator_id: string
          status?: string
          money_terms?: string
          reason_id?: string | null
          reason_note?: string | null
          evidence_urls?: string[]
          response_money_terms?: string | null
          response_reason_id?: string | null
          response_note?: string | null
          responder_id?: string | null
          responded_at?: string | null
          first_submitted_at?: string
          last_edited_at?: string | null
          respond_deadline_at: string
          edit_until_at: string
          reminder_24h_sent_at?: string | null
          reminder_near_sent_at?: string | null
          created_at?: string
          updated_at?: string
          hire_order_id?: string | null
        }
        Update: {
          id?: string
          hiring_request_id?: string
          conversation_id?: string | null
          initiated_by?: string
          initiator_id?: string
          status?: string
          money_terms?: string
          reason_id?: string | null
          reason_note?: string | null
          evidence_urls?: string[]
          response_money_terms?: string | null
          response_reason_id?: string | null
          response_note?: string | null
          responder_id?: string | null
          responded_at?: string | null
          first_submitted_at?: string
          last_edited_at?: string | null
          respond_deadline_at?: string
          edit_until_at?: string
          reminder_24h_sent_at?: string | null
          reminder_near_sent_at?: string | null
          created_at?: string
          updated_at?: string
          hire_order_id?: string | null
        }
        Relationships: []
      }
      hiring_org_members: {
        Row: {
          org_id: string
          user_id: string
          role: string
          joined_at: string
        }
        Insert: {
          org_id: string
          user_id: string
          role?: string
          joined_at?: string
        }
        Update: {
          org_id?: string
          user_id?: string
          role?: string
          joined_at?: string
        }
        Relationships: []
      }
      hiring_organizations: {
        Row: {
          id: string
          created_by: string
          legal_name: string
          display_name: string
          org_type: string
          tax_id: string
          province: string
          district: string
          address: string
          contact_name: string
          contact_email: string
          contact_phone: string
          website: string | null
          social_links: Json
          logo_url: string | null
          description: string | null
          category: string | null
          document_url: string | null
          status: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          created_by: string
          legal_name: string
          display_name: string
          org_type?: string
          tax_id: string
          province?: string
          district?: string
          address?: string
          contact_name?: string
          contact_email: string
          contact_phone: string
          website?: string | null
          social_links?: Json
          logo_url?: string | null
          description?: string | null
          category?: string | null
          document_url?: string | null
          status?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          created_by?: string
          legal_name?: string
          display_name?: string
          org_type?: string
          tax_id?: string
          province?: string
          district?: string
          address?: string
          contact_name?: string
          contact_email?: string
          contact_phone?: string
          website?: string | null
          social_links?: Json
          logo_url?: string | null
          description?: string | null
          category?: string | null
          document_url?: string | null
          status?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      hiring_requests: {
        Row: {
          id: string
          freelancer_id: string | null
          client_id: string | null
          project_id: string | null
          project_title: string
          client_name: string
          email: string
          phone: string | null
          budget: Database["public"]["Enums"]["hire_budget"] | null
          budget_amount: number | null
          deadline: string | null
          message: string | null
          status: Database["public"]["Enums"]["hire_status"]
          studio_id: string | null
          target_type: string
          job_post_id: string | null
          invited_as: string | null
          invited_studio_id: string | null
          created_at: string
          updated_at: string
          attachment_urls: string[] | null
          budget_min: number | null
          budget_max: number | null
          job_type: string | null
          job_type_other: string | null
          reject_reason: string | null
          reject_note: string | null
          forwarded_to_user_id: string | null
          forwarded_from_request_id: string | null
          post_reject_chat: string | null
          forward_note: string | null
          cancel_reason: string | null
          cancel_note: string | null
          offer_accepted_at: string | null
          linked_project_id: string | null
          service_id: string | null
          inbox_priority: string
        }
        Insert: {
          id?: string
          freelancer_id?: string | null
          client_id?: string | null
          project_id?: string | null
          project_title: string
          client_name: string
          email: string
          phone?: string | null
          budget?: Database["public"]["Enums"]["hire_budget"] | null
          budget_amount?: number | null
          deadline?: string | null
          message?: string | null
          status?: Database["public"]["Enums"]["hire_status"]
          studio_id?: string | null
          target_type?: string
          job_post_id?: string | null
          invited_as?: string | null
          invited_studio_id?: string | null
          created_at?: string
          updated_at?: string
          attachment_urls?: string[] | null
          budget_min?: number | null
          budget_max?: number | null
          job_type?: string | null
          job_type_other?: string | null
          reject_reason?: string | null
          reject_note?: string | null
          forwarded_to_user_id?: string | null
          forwarded_from_request_id?: string | null
          post_reject_chat?: string | null
          forward_note?: string | null
          cancel_reason?: string | null
          cancel_note?: string | null
          offer_accepted_at?: string | null
          linked_project_id?: string | null
          service_id?: string | null
          inbox_priority?: string
        }
        Update: {
          id?: string
          freelancer_id?: string | null
          client_id?: string | null
          project_id?: string | null
          project_title?: string
          client_name?: string
          email?: string
          phone?: string | null
          budget?: Database["public"]["Enums"]["hire_budget"] | null
          budget_amount?: number | null
          deadline?: string | null
          message?: string | null
          status?: Database["public"]["Enums"]["hire_status"]
          studio_id?: string | null
          target_type?: string
          job_post_id?: string | null
          invited_as?: string | null
          invited_studio_id?: string | null
          created_at?: string
          updated_at?: string
          attachment_urls?: string[] | null
          budget_min?: number | null
          budget_max?: number | null
          job_type?: string | null
          job_type_other?: string | null
          reject_reason?: string | null
          reject_note?: string | null
          forwarded_to_user_id?: string | null
          forwarded_from_request_id?: string | null
          post_reject_chat?: string | null
          forward_note?: string | null
          cancel_reason?: string | null
          cancel_note?: string | null
          offer_accepted_at?: string | null
          linked_project_id?: string | null
          service_id?: string | null
          inbox_priority?: string
        }
        Relationships: []
      }
      image_likes: {
        Row: {
          user_id: string
          project_id: string
          image_url: string
          created_at: string
        }
        Insert: {
          user_id: string
          project_id: string
          image_url: string
          created_at?: string
        }
        Update: {
          user_id?: string
          project_id?: string
          image_url?: string
          created_at?: string
        }
        Relationships: []
      }
      image_shares: {
        Row: {
          id: string
          project_id: string
          image_url: string
          user_id: string | null
          platform: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          image_url: string
          user_id?: string | null
          platform: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          image_url?: string
          user_id?: string | null
          platform?: string
          created_at?: string
        }
        Relationships: []
      }
      inspire_boards: {
        Row: {
          id: string
          owner_id: string
          name: string
          cover_url: string
          item_count: number
          created_at: string
          updated_at: string
          is_default: boolean
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          cover_url?: string
          item_count?: number
          created_at?: string
          updated_at?: string
          is_default?: boolean
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          cover_url?: string
          item_count?: number
          created_at?: string
          updated_at?: string
          is_default?: boolean
        }
        Relationships: []
      }
      inspire_items: {
        Row: {
          id: string
          board_id: string
          project_id: string
          image_url: string
          added_at: string
          pinned_at: string | null
        }
        Insert: {
          id?: string
          board_id: string
          project_id: string
          image_url: string
          added_at?: string
          pinned_at?: string | null
        }
        Update: {
          id?: string
          board_id?: string
          project_id?: string
          image_url?: string
          added_at?: string
          pinned_at?: string | null
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          id: string
          job_id: string
          applicant_id: string
          cover_letter: string
          portfolio_project_ids: string[]
          status: Database["public"]["Enums"]["job_application_status"]
          proposed_rate_min: number | null
          proposed_rate_max: number | null
          ready_date: string | null
          viewed_at: string | null
          contacted_at: string | null
          attached_cv_url: string | null
          created_at: string
          updated_at: string
          conversation_id: string | null
          reject_reason: string | null
          reject_note: string | null
          decided_at: string | null
          decided_by: string | null
        }
        Insert: {
          id?: string
          job_id: string
          applicant_id: string
          cover_letter?: string
          portfolio_project_ids?: string[]
          status?: Database["public"]["Enums"]["job_application_status"]
          proposed_rate_min?: number | null
          proposed_rate_max?: number | null
          ready_date?: string | null
          viewed_at?: string | null
          contacted_at?: string | null
          attached_cv_url?: string | null
          created_at?: string
          updated_at?: string
          conversation_id?: string | null
          reject_reason?: string | null
          reject_note?: string | null
          decided_at?: string | null
          decided_by?: string | null
        }
        Update: {
          id?: string
          job_id?: string
          applicant_id?: string
          cover_letter?: string
          portfolio_project_ids?: string[]
          status?: Database["public"]["Enums"]["job_application_status"]
          proposed_rate_min?: number | null
          proposed_rate_max?: number | null
          ready_date?: string | null
          viewed_at?: string | null
          contacted_at?: string | null
          attached_cv_url?: string | null
          created_at?: string
          updated_at?: string
          conversation_id?: string | null
          reject_reason?: string | null
          reject_note?: string | null
          decided_at?: string | null
          decided_by?: string | null
        }
        Relationships: []
      }
      job_match_notifications: {
        Row: {
          id: string
          user_id: string
          job_id: string
          match_score: number
          match_reasons: string[]
          is_read: boolean
          is_dismissed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          job_id: string
          match_score?: number
          match_reasons?: string[]
          is_read?: boolean
          is_dismissed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          job_id?: string
          match_score?: number
          match_reasons?: string[]
          is_read?: boolean
          is_dismissed?: boolean
          created_at?: string
        }
        Relationships: []
      }
      job_posts: {
        Row: {
          id: string
          studio_id: string | null
          posted_by: string | null
          title: string | null
          role_category: string | null
          description: string | null
          skills: string[] | null
          budget_min: number | null
          budget_max: number | null
          budget_type: Database["public"]["Enums"]["job_budget_type"] | null
          location_type: Database["public"]["Enums"]["job_location_type"] | null
          location: string | null
          deadline: string | null
          status: Database["public"]["Enums"]["job_status"] | null
          applicants_count: number | null
          views: number | null
          created_at: string | null
          updated_at: string | null
          post_type: string | null
          poster_role: string | null
          employment_type: string | null
          attached_cv_url: string | null
          attached_portfolio_ids: string[] | null
          cover_image_url: string | null
          deliverables: string[] | null
          reference_urls: string[] | null
          headcount: number | null
          application_methods: string[] | null
          ready_to_start: string | null
          poster_entity_type: string | null
          posted_as_studio_id: string | null
          show_profile_badge: boolean
          hiring_org_id: string | null
          contact_email: string | null
          contact_phone: string | null
          workplace_address: string | null
          meeting_location: string | null
          social_links: Json
          requirements_must: string[]
          requirements_nice: string[]
          perks: string[]
          exclusions_note: string | null
          gallery_urls: string[]
          is_urgent: boolean
        }
        Insert: {
          id: string
          studio_id?: string | null
          posted_by?: string | null
          title?: string | null
          role_category?: string | null
          description?: string | null
          skills?: string[] | null
          budget_min?: number | null
          budget_max?: number | null
          budget_type?: Database["public"]["Enums"]["job_budget_type"] | null
          location_type?: Database["public"]["Enums"]["job_location_type"] | null
          location?: string | null
          deadline?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          applicants_count?: number | null
          views?: number | null
          created_at?: string | null
          updated_at?: string | null
          post_type?: string | null
          poster_role?: string | null
          employment_type?: string | null
          attached_cv_url?: string | null
          attached_portfolio_ids?: string[] | null
          cover_image_url?: string | null
          deliverables?: string[] | null
          reference_urls?: string[] | null
          headcount?: number | null
          application_methods?: string[] | null
          ready_to_start?: string | null
          poster_entity_type?: string | null
          posted_as_studio_id?: string | null
          show_profile_badge?: boolean
          hiring_org_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          workplace_address?: string | null
          meeting_location?: string | null
          social_links?: Json
          requirements_must?: string[]
          requirements_nice?: string[]
          perks?: string[]
          exclusions_note?: string | null
          gallery_urls?: string[]
          is_urgent?: boolean
        }
        Update: {
          id?: string
          studio_id?: string | null
          posted_by?: string | null
          title?: string | null
          role_category?: string | null
          description?: string | null
          skills?: string[] | null
          budget_min?: number | null
          budget_max?: number | null
          budget_type?: Database["public"]["Enums"]["job_budget_type"] | null
          location_type?: Database["public"]["Enums"]["job_location_type"] | null
          location?: string | null
          deadline?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          applicants_count?: number | null
          views?: number | null
          created_at?: string | null
          updated_at?: string | null
          post_type?: string | null
          poster_role?: string | null
          employment_type?: string | null
          attached_cv_url?: string | null
          attached_portfolio_ids?: string[] | null
          cover_image_url?: string | null
          deliverables?: string[] | null
          reference_urls?: string[] | null
          headcount?: number | null
          application_methods?: string[] | null
          ready_to_start?: string | null
          poster_entity_type?: string | null
          posted_as_studio_id?: string | null
          show_profile_badge?: boolean
          hiring_org_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          workplace_address?: string | null
          meeting_location?: string | null
          social_links?: Json
          requirements_must?: string[]
          requirements_nice?: string[]
          perks?: string[]
          exclusions_note?: string | null
          gallery_urls?: string[]
          is_urgent?: boolean
        }
        Relationships: []
      }
      job_saved: {
        Row: {
          id: string
          user_id: string
          job_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          job_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          job_id?: string
          created_at?: string
        }
        Relationships: []
      }
      object_orders: {
        Row: {
          id: string
          object_id: string
          object_title: string
          buyer_id: string
          seller_id: string
          qty: number
          finish: string
          note: string
          status: string
          tracking_code: string
          created_at: string
          updated_at: string
          unit_price_thb: number
          amount_satang: number
          platform_fee_satang: number
          seller_net_satang: number
          fulfillment: string
          ship_name: string
          ship_phone: string
          ship_address: string
          payment_status: string
          charge_id: string
          paid_at: string | null
          received_at: string | null
          seller_release: string
        }
        Insert: {
          id?: string
          object_id: string
          object_title?: string
          buyer_id: string
          seller_id: string
          qty?: number
          finish?: string
          note?: string
          status?: string
          tracking_code?: string
          created_at?: string
          updated_at?: string
          unit_price_thb?: number
          amount_satang?: number
          platform_fee_satang?: number
          seller_net_satang?: number
          fulfillment?: string
          ship_name?: string
          ship_phone?: string
          ship_address?: string
          payment_status?: string
          charge_id?: string
          paid_at?: string | null
          received_at?: string | null
          seller_release?: string
        }
        Update: {
          id?: string
          object_id?: string
          object_title?: string
          buyer_id?: string
          seller_id?: string
          qty?: number
          finish?: string
          note?: string
          status?: string
          tracking_code?: string
          created_at?: string
          updated_at?: string
          unit_price_thb?: number
          amount_satang?: number
          platform_fee_satang?: number
          seller_net_satang?: number
          fulfillment?: string
          ship_name?: string
          ship_phone?: string
          ship_address?: string
          payment_status?: string
          charge_id?: string
          paid_at?: string | null
          received_at?: string | null
          seller_release?: string
        }
        Relationships: []
      }
      post_boosts: {
        Row: {
          id: string
          user_id: string
          target_type: string
          target_id: string
          package: string
          amount_thb: number
          duration_days: number
          status: string
          stripe_session_id: string | null
          start_at: string | null
          end_at: string | null
          impressions: number
          clicks: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          target_type: string
          target_id: string
          package: string
          amount_thb: number
          duration_days: number
          status?: string
          stripe_session_id?: string | null
          start_at?: string | null
          end_at?: string | null
          impressions?: number
          clicks?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          target_type?: string
          target_id?: string
          package?: string
          amount_thb?: number
          duration_days?: number
          status?: string
          stripe_session_id?: string | null
          start_at?: string | null
          end_at?: string | null
          impressions?: number
          clicks?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_bookmarks: {
        Row: {
          project_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          project_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          project_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      project_canvas_templates: {
        Row: {
          id: string
          user_id: string
          name: string
          hint: string
          source_key: string | null
          modules: Json
          open_context: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          hint?: string
          source_key?: string | null
          modules?: Json
          open_context?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          hint?: string
          source_key?: string | null
          modules?: Json
          open_context?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_collab_invites: {
        Row: {
          id: string
          project_id: string
          invited_user_id: string
          invited_by: string
          status: string
          created_at: string
          responded_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          invited_user_id: string
          invited_by: string
          status?: string
          created_at?: string
          responded_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          invited_user_id?: string
          invited_by?: string
          status?: string
          created_at?: string
          responded_at?: string | null
        }
        Relationships: []
      }
      project_comments: {
        Row: {
          id: string
          project_id: string
          user_id: string
          content: string
          created_at: string
          updated_at: string
          parent_id: string | null
          depth: number
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          content: string
          created_at?: string
          updated_at?: string
          parent_id?: string | null
          depth?: number
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          content?: string
          created_at?: string
          updated_at?: string
          parent_id?: string | null
          depth?: number
        }
        Relationships: []
      }
      project_likes: {
        Row: {
          project_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          project_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          project_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      project_series: {
        Row: {
          id: string
          owner_id: string
          title: string
          summary: string
          client_label: string
          year: number | null
          is_public: boolean
          cover_project_id: string | null
          sort_order: number
          created_at: string
          updated_at: string
          cover_url: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          summary?: string
          client_label?: string
          year?: number | null
          is_public?: boolean
          cover_project_id?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
          cover_url?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          summary?: string
          client_label?: string
          year?: number | null
          is_public?: boolean
          cover_project_id?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
          cover_url?: string | null
        }
        Relationships: []
      }
      project_series_items: {
        Row: {
          series_id: string
          project_id: string
          position: number
          role_label: string
          added_at: string
        }
        Insert: {
          series_id: string
          project_id: string
          position?: number
          role_label?: string
          added_at?: string
        }
        Update: {
          series_id?: string
          project_id?: string
          position?: number
          role_label?: string
          added_at?: string
        }
        Relationships: []
      }
      project_views: {
        Row: {
          user_id: string
          project_id: string
          viewed_at: string
        }
        Insert: {
          user_id: string
          project_id: string
          viewed_at?: string
        }
        Update: {
          user_id?: string
          project_id?: string
          viewed_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          owner_id: string | null
          title: string | null
          subtitle: string | null
          description: string | null
          category: string | null
          cover_url: string | null
          gallery_urls: string[] | null
          tools: string[] | null
          tags: string[] | null
          price_thb: number | null
          status: string | null
          views: number | null
          likes: number | null
          created_at: string | null
          updated_at: string | null
          allow_hire: boolean | null
          allow_collab: boolean | null
          embedding: string | null
          studio_id: string | null
          credited_user_ids: string[] | null
          license_type: string | null
          license_note: string | null
          has_third_party_assets: boolean | null
          third_party_note: string | null
          rights_attested_at: string | null
          copyright_holder: string | null
          sort_order: number | null
          is_pinned: boolean | null
          rights_attestation_version: string | null
          linked_community_post_ids: string[]
          collab_user_ids: string[]
          video_urls: string[]
          brief: string | null
          creator_role: string | null
          process_note: string | null
          deliverables: string | null
          duration_label: string | null
          outcome_note: string | null
          opportunity_types: string[]
          opportunity_note: string | null
          external_links: Json
          project_assets: Json
          content_blocks: Json
          gallery_display_mode: string
          grid_layout: string
          ai_assisted: boolean
          ai_disclosure_note: string
          client_permission_confirmed: boolean
          editor_mode: string
          flex_grid_layout: Json
        }
        Insert: {
          id?: string
          owner_id?: string | null
          title?: string | null
          subtitle?: string | null
          description?: string | null
          category?: string | null
          cover_url?: string | null
          gallery_urls?: string[] | null
          tools?: string[] | null
          tags?: string[] | null
          price_thb?: number | null
          status?: string | null
          views?: number | null
          likes?: number | null
          created_at?: string | null
          updated_at?: string | null
          allow_hire?: boolean | null
          allow_collab?: boolean | null
          embedding?: string | null
          studio_id?: string | null
          credited_user_ids?: string[] | null
          license_type?: string | null
          license_note?: string | null
          has_third_party_assets?: boolean | null
          third_party_note?: string | null
          rights_attested_at?: string | null
          copyright_holder?: string | null
          sort_order?: number | null
          is_pinned?: boolean | null
          rights_attestation_version?: string | null
          linked_community_post_ids?: string[]
          collab_user_ids?: string[]
          video_urls?: string[]
          brief?: string | null
          creator_role?: string | null
          process_note?: string | null
          deliverables?: string | null
          duration_label?: string | null
          outcome_note?: string | null
          opportunity_types?: string[]
          opportunity_note?: string | null
          external_links?: Json
          project_assets?: Json
          content_blocks?: Json
          gallery_display_mode?: string
          grid_layout?: string
          ai_assisted?: boolean
          ai_disclosure_note?: string
          client_permission_confirmed?: boolean
          editor_mode?: string
          flex_grid_layout?: Json
        }
        Update: {
          id?: string
          owner_id?: string | null
          title?: string | null
          subtitle?: string | null
          description?: string | null
          category?: string | null
          cover_url?: string | null
          gallery_urls?: string[] | null
          tools?: string[] | null
          tags?: string[] | null
          price_thb?: number | null
          status?: string | null
          views?: number | null
          likes?: number | null
          created_at?: string | null
          updated_at?: string | null
          allow_hire?: boolean | null
          allow_collab?: boolean | null
          embedding?: string | null
          studio_id?: string | null
          credited_user_ids?: string[] | null
          license_type?: string | null
          license_note?: string | null
          has_third_party_assets?: boolean | null
          third_party_note?: string | null
          rights_attested_at?: string | null
          copyright_holder?: string | null
          sort_order?: number | null
          is_pinned?: boolean | null
          rights_attestation_version?: string | null
          linked_community_post_ids?: string[]
          collab_user_ids?: string[]
          video_urls?: string[]
          brief?: string | null
          creator_role?: string | null
          process_note?: string | null
          deliverables?: string | null
          duration_label?: string | null
          outcome_note?: string | null
          opportunity_types?: string[]
          opportunity_note?: string | null
          external_links?: Json
          project_assets?: Json
          content_blocks?: Json
          gallery_display_mode?: string
          grid_layout?: string
          ai_assisted?: boolean
          ai_disclosure_note?: string
          client_permission_confirmed?: boolean
          editor_mode?: string
          flex_grid_layout?: Json
        }
        Relationships: []
      }
      studio_members: {
        Row: {
          studio_id: string
          user_id: string
          role: Database["public"]["Enums"]["studio_member_role"]
          credit_title: string
          joined_at: string
        }
        Insert: {
          studio_id: string
          user_id: string
          role?: Database["public"]["Enums"]["studio_member_role"]
          credit_title?: string
          joined_at?: string
        }
        Update: {
          studio_id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["studio_member_role"]
          credit_title?: string
          joined_at?: string
        }
        Relationships: []
      }
      studios: {
        Row: {
          id: string
          slug: string
          name: string
          tagline: string
          bio: string
          avatar_url: string
          cover_url: string
          location: string
          website: string
          verified: boolean
          created_by: string
          member_count: number
          created_at: string
          updated_at: string
          logo_url: string
          expertise: string[]
          contact_email: string
          contact_phone: string
          social_links: Json
          available_for_work: boolean
        }
        Insert: {
          id?: string
          slug: string
          name: string
          tagline?: string
          bio?: string
          avatar_url?: string
          cover_url?: string
          location?: string
          website?: string
          verified?: boolean
          created_by: string
          member_count?: number
          created_at?: string
          updated_at?: string
          logo_url?: string
          expertise?: string[]
          contact_email?: string
          contact_phone?: string
          social_links?: Json
          available_for_work?: boolean
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          tagline?: string
          bio?: string
          avatar_url?: string
          cover_url?: string
          location?: string
          website?: string
          verified?: boolean
          created_by?: string
          member_count?: number
          created_at?: string
          updated_at?: string
          logo_url?: string
          expertise?: string[]
          contact_email?: string
          contact_phone?: string
          social_links?: Json
          available_for_work?: boolean
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocker_id: string
          blocked_id: string
          created_at: string
        }
        Insert: {
          blocker_id: string
          blocked_id: string
          created_at?: string
        }
        Update: {
          blocker_id?: string
          blocked_id?: string
          created_at?: string
        }
        Relationships: []
      }
      ux_research_submissions: {
        Row: {
          id: string
          reviewer_name: string
          persona: string
          devices: string[]
          tasks_done: string[]
          sections_done: string[]
          scores: Json
          answers: Json
          viewport: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          reviewer_name: string
          persona: string
          devices?: string[]
          tasks_done?: string[]
          sections_done?: string[]
          scores?: Json
          answers?: Json
          viewport?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          reviewer_name?: string
          persona?: string
          devices?: string[]
          tasks_done?: string[]
          sections_done?: string[]
          scores?: Json
          answers?: Json
          viewport?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: []
      }
      work_reviews: {
        Row: {
          id: string
          kind: string
          subject_user_id: string
          author_user_id: string
          hire_request_id: string | null
          collab_request_id: string | null
          rating: number
          tags: string[]
          body: string | null
          project_id: string | null
          visibility: string
          created_at: string
          updated_at: string
          reply_body: string | null
          reply_at: string | null
          rating_punctuality: number | null
          rating_quality: number | null
          rating_coop: number | null
          rating_brief: number | null
          rating_value: number | null
          service_id: string | null
        }
        Insert: {
          id?: string
          kind: string
          subject_user_id: string
          author_user_id: string
          hire_request_id?: string | null
          collab_request_id?: string | null
          rating: number
          tags?: string[]
          body?: string | null
          project_id?: string | null
          visibility?: string
          created_at?: string
          updated_at?: string
          reply_body?: string | null
          reply_at?: string | null
          rating_punctuality?: number | null
          rating_quality?: number | null
          rating_coop?: number | null
          rating_brief?: number | null
          rating_value?: number | null
          service_id?: string | null
        }
        Update: {
          id?: string
          kind?: string
          subject_user_id?: string
          author_user_id?: string
          hire_request_id?: string | null
          collab_request_id?: string | null
          rating?: number
          tags?: string[]
          body?: string | null
          project_id?: string | null
          visibility?: string
          created_at?: string
          updated_at?: string
          reply_body?: string | null
          reply_at?: string | null
          rating_punctuality?: number | null
          rating_quality?: number | null
          rating_coop?: number | null
          rating_brief?: number | null
          rating_value?: number | null
          service_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {

    }
    Functions: {
      admin_ad_overview: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      admin_dismiss_notification: {
        Args: { _id: string }
        Returns: undefined
      }
      admin_gift_overview: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      admin_list_cashouts: {
        Args: { _limit?: number }
        Returns: { id: string; created_at: string; processed_at: string | null; status: string; gross_px: number; fee_px: number; net_px: number; bank_info: Json; user_id: string; user_name: string | null; user_avatar: string | null }[]
      }
      admin_list_topups: {
        Args: { _limit?: number }
        Returns: { id: string; created_at: string; amount_px: number; method: string; status: string; user_id: string; user_name: string | null; user_avatar: string | null }[]
      }
      admin_mark_cashout_paid: {
        Args: { _id: string }
        Returns: Database["shared"]["Tables"]["cashout_requests"]["Row"]
      }
      admin_recent_gifts: {
        Args: { _limit?: number; _days?: number }
        Returns: { id: string; created_at: string; price_px: number; message: string | null; sender_id: string; sender_name: string | null; sender_avatar: string | null; recipient_id: string; recipient_name: string | null; recipient_avatar: string | null; gift_name: string | null; gift_icon: string | null; project_id: string | null; project_title: string | null }[]
      }
      admin_reject_cashout: {
        Args: { _id: string; _note?: string }
        Returns: Database["shared"]["Tables"]["cashout_requests"]["Row"]
      }
      admin_set_user_role: {
        Args: { _user_id: string; _role: string; _grant: boolean }
        Returns: undefined
      }
      admin_top_gift_projects: {
        Args: { _limit?: number }
        Returns: { project_id: string; title: string | null; cover_url: string | null; owner_id: string; owner_name: string | null; total_px: number; gift_count: number }[]
      }
      admin_top_gift_recipients: {
        Args: { _limit?: number }
        Returns: { user_id: string; display_name: string | null; username: string | null; avatar_url: string | null; total_px: number; gift_count: number }[]
      }
      admin_top_gift_senders: {
        Args: { _limit?: number }
        Returns: { user_id: string; display_name: string | null; username: string | null; avatar_url: string | null; total_px: number; gift_count: number }[]
      }
      admin_update_gift: {
        Args: { _id: string; _active: boolean; _price_px?: number }
        Returns: Database["shared"]["Tables"]["gifts"]["Row"]
      }
      admin_update_gift_limits: {
        Args: { _daily_unverified: number; _daily_verified: number; _velocity: number; _hold_hours: number; _max_topup: number }
        Returns: Database["shared"]["Tables"]["gift_limits_config"]["Row"]
      }
      daily_gift_total: {
        Args: { _uid: string }
        Returns: number
      }
      image_like_count: {
        Args: { _project_id: string; _image_url: string }
        Returns: number
      }
      image_share_count: {
        Args: { _project_id: string; _image_url: string }
        Returns: number
      }
      log_ad_event_v2: {
        Args: { _ad_id: string; _event_type: Database["public"]["Enums"]["ad_event_type"]; _placement?: string; _session_id?: string }
        Returns: undefined
      }
      request_cashout: {
        Args: { _amount_px: number; _bank_info: Json }
        Returns: Database["shared"]["Tables"]["cashout_requests"]["Row"]
      }
      submit_feedback: {
        Args: { _feature: string; _route: string; _rating?: number; _message?: string; _project_id?: string; _user_agent?: string; _viewport?: string; _kind?: string; _screenshot_path?: string; _annotation_json?: Json }
        Returns: Database["anthem"]["Tables"]["app_feedback"]["Row"]
      }
      submit_ux_research: {
        Args: { payload: Json }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  shared: {
    Tables: {
      account_balances: {
        Row: {
          user_id: string
          pending_satang: number
          available_satang: number
          payout_reserved_satang: number
          paid_out_satang: number
          disputed_satang: number
          updated_at: string
        }
        Insert: {
          user_id: string
          pending_satang?: number
          available_satang?: number
          payout_reserved_satang?: number
          paid_out_satang?: number
          disputed_satang?: number
          updated_at?: string
        }
        Update: {
          user_id?: string
          pending_satang?: number
          available_satang?: number
          payout_reserved_satang?: number
          paid_out_satang?: number
          disputed_satang?: number
          updated_at?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          id: string
          actor_id: string
          action: string
          target_type: string
          target_id: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          actor_id: string
          action: string
          target_type?: string
          target_id?: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string
          action?: string
          target_type?: string
          target_id?: string
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      aplus1_fee_configs: {
        Row: {
          id: string
          version: string
          platform_fee_percent: number
          card_fee_passed_to_buyer: boolean
          card_surcharge_percent: number
          promptpay_buyer_pays_job_only: boolean
          effective_from: string
          effective_to: string | null
          created_at: string
        }
        Insert: {
          id?: string
          version: string
          platform_fee_percent?: number
          card_fee_passed_to_buyer?: boolean
          card_surcharge_percent?: number
          promptpay_buyer_pays_job_only?: boolean
          effective_from?: string
          effective_to?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          version?: string
          platform_fee_percent?: number
          card_fee_passed_to_buyer?: boolean
          card_surcharge_percent?: number
          promptpay_buyer_pays_job_only?: boolean
          effective_from?: string
          effective_to?: string | null
          created_at?: string
        }
        Relationships: []
      }
      aplus1_payment_flags: {
        Row: {
          id: number
          omise_payments_enabled: boolean
          omise_promptpay_enabled: boolean
          omise_card_enabled: boolean
          bank_transfer_enabled: boolean
          manual_payout_enabled: boolean
          auto_payout_enabled: boolean
          end_of_month_sweep_enabled: boolean
          live_marketplace_payments_enabled: boolean
          card_fee_passed_to_buyer: boolean
          display_currency_enabled: boolean
          updated_at: string
        }
        Insert: {
          id?: number
          omise_payments_enabled?: boolean
          omise_promptpay_enabled?: boolean
          omise_card_enabled?: boolean
          bank_transfer_enabled?: boolean
          manual_payout_enabled?: boolean
          auto_payout_enabled?: boolean
          end_of_month_sweep_enabled?: boolean
          live_marketplace_payments_enabled?: boolean
          card_fee_passed_to_buyer?: boolean
          display_currency_enabled?: boolean
          updated_at?: string
        }
        Update: {
          id?: number
          omise_payments_enabled?: boolean
          omise_promptpay_enabled?: boolean
          omise_card_enabled?: boolean
          bank_transfer_enabled?: boolean
          manual_payout_enabled?: boolean
          auto_payout_enabled?: boolean
          end_of_month_sweep_enabled?: boolean
          live_marketplace_payments_enabled?: boolean
          card_fee_passed_to_buyer?: boolean
          display_currency_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      cashout_requests: {
        Row: {
          id: string
          user_id: string
          gross_px: number
          fee_px: number
          net_px: number
          bank_info: Json
          status: string
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          gross_px: number
          fee_px?: number
          net_px: number
          bank_info?: Json
          status?: string
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          gross_px?: number
          fee_px?: number
          net_px?: number
          bank_info?: Json
          status?: string
          created_at?: string
          processed_at?: string | null
        }
        Relationships: []
      }
      collab_end_request_events: {
        Row: {
          id: string
          end_request_id: string
          actor_id: string | null
          event_type: string
          snapshot: Json
          diff_summary: string | null
          created_at: string
        }
        Insert: {
          id?: string
          end_request_id: string
          actor_id?: string | null
          event_type: string
          snapshot?: Json
          diff_summary?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          end_request_id?: string
          actor_id?: string | null
          event_type?: string
          snapshot?: Json
          diff_summary?: string | null
          created_at?: string
        }
        Relationships: []
      }
      collab_end_requests: {
        Row: {
          id: string
          collab_request_id: string
          conversation_id: string
          initiator_id: string
          status: string
          tier: string
          handoff_terms: string
          reason_id: string | null
          reason_note: string | null
          plan_step: string | null
          response_reason_id: string | null
          response_note: string | null
          responder_id: string | null
          responded_at: string | null
          first_submitted_at: string
          last_edited_at: string | null
          respond_deadline_at: string
          edit_until_at: string
          reminder_near_sent_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          collab_request_id: string
          conversation_id: string
          initiator_id: string
          status?: string
          tier?: string
          handoff_terms?: string
          reason_id?: string | null
          reason_note?: string | null
          plan_step?: string | null
          response_reason_id?: string | null
          response_note?: string | null
          responder_id?: string | null
          responded_at?: string | null
          first_submitted_at?: string
          last_edited_at?: string | null
          respond_deadline_at: string
          edit_until_at: string
          reminder_near_sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          collab_request_id?: string
          conversation_id?: string
          initiator_id?: string
          status?: string
          tier?: string
          handoff_terms?: string
          reason_id?: string | null
          reason_note?: string | null
          plan_step?: string | null
          response_reason_id?: string | null
          response_note?: string | null
          responder_id?: string | null
          responded_at?: string | null
          first_submitted_at?: string
          last_edited_at?: string | null
          respond_deadline_at?: string
          edit_until_at?: string
          reminder_near_sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      collab_plan_activity_log: {
        Row: {
          id: string
          conversation_id: string
          actor_id: string | null
          action: string
          detail: Json
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          actor_id?: string | null
          action: string
          detail?: Json
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          actor_id?: string | null
          action?: string
          detail?: Json
          created_at?: string
        }
        Relationships: []
      }
      collab_plan_change_requests: {
        Row: {
          id: string
          conversation_id: string
          requested_by: string
          step: string
          reason: string | null
          status: string
          approvals: Json
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          conversation_id: string
          requested_by: string
          step?: string
          reason?: string | null
          status?: string
          approvals?: Json
          created_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          conversation_id?: string
          requested_by?: string
          step?: string
          reason?: string | null
          status?: string
          approvals?: Json
          created_at?: string
          resolved_at?: string | null
        }
        Relationships: []
      }
      collab_plans: {
        Row: {
          conversation_id: string
          stages: Json
          updated_by: string | null
          updated_at: string
          created_at: string
          status: string
          current_step: string
          payload: Json
          acks: Json
          version: number
        }
        Insert: {
          conversation_id: string
          stages?: Json
          updated_by?: string | null
          updated_at?: string
          created_at?: string
          status?: string
          current_step?: string
          payload?: Json
          acks?: Json
          version?: number
        }
        Update: {
          conversation_id?: string
          stages?: Json
          updated_by?: string | null
          updated_at?: string
          created_at?: string
          status?: string
          current_step?: string
          payload?: Json
          acks?: Json
          version?: number
        }
        Relationships: []
      }
      conversation_hides: {
        Row: {
          user_id: string
          conversation_id: string
          hidden_at: string
        }
        Insert: {
          user_id: string
          conversation_id: string
          hidden_at?: string
        }
        Update: {
          user_id?: string
          conversation_id?: string
          hidden_at?: string
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          user_id: string
          role: string
          joined_at: string
        }
        Insert: {
          conversation_id: string
          user_id: string
          role?: string
          joined_at?: string
        }
        Update: {
          conversation_id?: string
          user_id?: string
          role?: string
          joined_at?: string
        }
        Relationships: []
      }
      conversation_pins: {
        Row: {
          user_id: string
          conversation_id: string
          pinned_at: string
        }
        Insert: {
          user_id: string
          conversation_id: string
          pinned_at?: string
        }
        Update: {
          user_id?: string
          conversation_id?: string
          pinned_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          id: string
          kind: string
          request_id: string | null
          client_id: string
          freelancer_id: string
          project_id: string | null
          project_title: string
          last_message_at: string
          created_at: string
          conversation_type: string
          title: string | null
          created_by: string | null
          studio_id: string | null
          announced_message_id: string | null
          announced_text: string | null
          group_tag: string | null
          service_id: string | null
        }
        Insert: {
          id?: string
          kind: string
          request_id?: string | null
          client_id: string
          freelancer_id: string
          project_id?: string | null
          project_title?: string
          last_message_at?: string
          created_at?: string
          conversation_type?: string
          title?: string | null
          created_by?: string | null
          studio_id?: string | null
          announced_message_id?: string | null
          announced_text?: string | null
          group_tag?: string | null
          service_id?: string | null
        }
        Update: {
          id?: string
          kind?: string
          request_id?: string | null
          client_id?: string
          freelancer_id?: string
          project_id?: string | null
          project_title?: string
          last_message_at?: string
          created_at?: string
          conversation_type?: string
          title?: string | null
          created_by?: string | null
          studio_id?: string | null
          announced_message_id?: string | null
          announced_text?: string | null
          group_tag?: string | null
          service_id?: string | null
        }
        Relationships: []
      }
      daily_px_claims: {
        Row: {
          id: string
          user_id: string
          claim_date: string
          reward_px: number
          created_at: string
          wallet_applied: boolean
        }
        Insert: {
          id?: string
          user_id: string
          claim_date: string
          reward_px?: number
          created_at?: string
          wallet_applied?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          claim_date?: string
          reward_px?: number
          created_at?: string
          wallet_applied?: boolean
        }
        Relationships: []
      }
      doc_number_counters: {
        Row: {
          kind: string
          year: number
          last_n: number
        }
        Insert: {
          kind: string
          year: number
          last_n?: number
        }
        Update: {
          kind?: string
          year?: number
          last_n?: number
        }
        Relationships: []
      }
      fx_rate_snapshots: {
        Row: {
          id: string
          quote_currency: string
          rate: number
          source: string
          as_of: string
          created_at: string
        }
        Insert: {
          id?: string
          quote_currency: string
          rate: number
          source: string
          as_of: string
          created_at?: string
        }
        Update: {
          id?: string
          quote_currency?: string
          rate?: number
          source?: string
          as_of?: string
          created_at?: string
        }
        Relationships: []
      }
      fx_rates: {
        Row: {
          id: string
          base_currency: string
          quote_currency: string
          rate: number
          source: string
          as_of: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          base_currency?: string
          quote_currency: string
          rate: number
          source?: string
          as_of?: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          base_currency?: string
          quote_currency?: string
          rate?: number
          source?: string
          as_of?: string
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      gift_limits_config: {
        Row: {
          id: number
          daily_limit_unverified: number
          daily_limit_verified: number
          velocity_per_hour: number
          hold_hours: number
          min_account_age_hours: number
          max_topup_per_tx: number
          updated_at: string
          welcome_px_cap: number
          cashout_fee_free: number
          cashout_fee_pro: number
          escrow_fee_free: number
          escrow_fee_pro: number
        }
        Insert: {
          id?: number
          daily_limit_unverified?: number
          daily_limit_verified?: number
          velocity_per_hour?: number
          hold_hours?: number
          min_account_age_hours?: number
          max_topup_per_tx?: number
          updated_at?: string
          welcome_px_cap?: number
          cashout_fee_free?: number
          cashout_fee_pro?: number
          escrow_fee_free?: number
          escrow_fee_pro?: number
        }
        Update: {
          id?: number
          daily_limit_unverified?: number
          daily_limit_verified?: number
          velocity_per_hour?: number
          hold_hours?: number
          min_account_age_hours?: number
          max_topup_per_tx?: number
          updated_at?: string
          welcome_px_cap?: number
          cashout_fee_free?: number
          cashout_fee_pro?: number
          escrow_fee_free?: number
          escrow_fee_pro?: number
        }
        Relationships: []
      }
      gift_transactions: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string
          gift_id: string
          price_px: number
          message: string
          project_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          recipient_id: string
          gift_id: string
          price_px: number
          message?: string
          project_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          recipient_id?: string
          gift_id?: string
          price_px?: number
          message?: string
          project_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      gifts: {
        Row: {
          id: string
          code: string
          name_th: string
          name_en: string
          price_px: number
          icon: string
          display_order: number
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          name_th: string
          name_en: string
          price_px: number
          icon: string
          display_order?: number
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          name_th?: string
          name_en?: string
          price_px?: number
          icon?: string
          display_order?: number
          active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      hire_deliveries: {
        Row: {
          id: string
          hire_order_id: string
          links: string[]
          files: Json
          note: string | null
          revision: number
          submitted_by: string
          submitted_at: string
        }
        Insert: {
          id?: string
          hire_order_id: string
          links?: string[]
          files?: Json
          note?: string | null
          revision?: number
          submitted_by: string
          submitted_at?: string
        }
        Update: {
          id?: string
          hire_order_id?: string
          links?: string[]
          files?: Json
          note?: string | null
          revision?: number
          submitted_by?: string
          submitted_at?: string
        }
        Relationships: []
      }
      hire_documents: {
        Row: {
          id: string
          hire_order_id: string | null
          quote_id: string | null
          kind: string
          doc_number: string
          snapshot: Json
          file_url: string | null
          issued_at: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          hire_order_id?: string | null
          quote_id?: string | null
          kind: string
          doc_number: string
          snapshot?: Json
          file_url?: string | null
          issued_at?: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          hire_order_id?: string | null
          quote_id?: string | null
          kind?: string
          doc_number?: string
          snapshot?: Json
          file_url?: string | null
          issued_at?: string
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      hire_orders: {
        Row: {
          id: string
          hiring_request_id: string | null
          conversation_id: string | null
          buyer_id: string
          seller_id: string
          status: string
          job_price_satang: number
          buyer_pays_satang: number
          seller_net_satang: number
          platform_fee_percent: number
          platform_fee_satang: number
          card_surcharge_satang: number
          fee_version: string
          payment_method: string | null
          display_currency: string | null
          fx_snapshot_id: string | null
          currency: string
          paid_at: string | null
          approved_at: string | null
          available_at: string | null
          cancelled_at: string | null
          metadata: Json
          created_at: string
          updated_at: string
          quote_id: string | null
          amount_paid_satang: number
          balance_due_satang: number
          wht_satang: number
          deposit_percent: number | null
          auto_dispute_at: string | null
          work_submitted_at: string | null
          wht_status: string | null
        }
        Insert: {
          id?: string
          hiring_request_id?: string | null
          conversation_id?: string | null
          buyer_id: string
          seller_id: string
          status?: string
          job_price_satang: number
          buyer_pays_satang: number
          seller_net_satang: number
          platform_fee_percent: number
          platform_fee_satang: number
          card_surcharge_satang?: number
          fee_version: string
          payment_method?: string | null
          display_currency?: string | null
          fx_snapshot_id?: string | null
          currency?: string
          paid_at?: string | null
          approved_at?: string | null
          available_at?: string | null
          cancelled_at?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
          quote_id?: string | null
          amount_paid_satang?: number
          balance_due_satang?: number
          wht_satang?: number
          deposit_percent?: number | null
          auto_dispute_at?: string | null
          work_submitted_at?: string | null
          wht_status?: string | null
        }
        Update: {
          id?: string
          hiring_request_id?: string | null
          conversation_id?: string | null
          buyer_id?: string
          seller_id?: string
          status?: string
          job_price_satang?: number
          buyer_pays_satang?: number
          seller_net_satang?: number
          platform_fee_percent?: number
          platform_fee_satang?: number
          card_surcharge_satang?: number
          fee_version?: string
          payment_method?: string | null
          display_currency?: string | null
          fx_snapshot_id?: string | null
          currency?: string
          paid_at?: string | null
          approved_at?: string | null
          available_at?: string | null
          cancelled_at?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
          quote_id?: string | null
          amount_paid_satang?: number
          balance_due_satang?: number
          wht_satang?: number
          deposit_percent?: number | null
          auto_dispute_at?: string | null
          work_submitted_at?: string | null
          wht_status?: string | null
        }
        Relationships: []
      }
      hire_quote_policy_acceptances: {
        Row: {
          id: string
          quote_id: string
          buyer_id: string
          terms_version: string
          payment_version: string
          hire_policy_version: string | null
          accepted_at: string
          ip: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          quote_id: string
          buyer_id: string
          terms_version: string
          payment_version: string
          hire_policy_version?: string | null
          accepted_at?: string
          ip?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          quote_id?: string
          buyer_id?: string
          terms_version?: string
          payment_version?: string
          hire_policy_version?: string | null
          accepted_at?: string
          ip?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      hire_quotes: {
        Row: {
          id: string
          hiring_request_id: string
          conversation_id: string | null
          version: number
          status: string
          payload: Json
          deposit_percent: number
          wht_enabled: boolean
          amount_satang: number
          currency: string
          doc_number: string | null
          expires_at: string
          decline_reason: string | null
          decline_note: string | null
          created_by: string
          accepted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          hiring_request_id: string
          conversation_id?: string | null
          version?: number
          status?: string
          payload?: Json
          deposit_percent?: number
          wht_enabled?: boolean
          amount_satang?: number
          currency?: string
          doc_number?: string | null
          expires_at: string
          decline_reason?: string | null
          decline_note?: string | null
          created_by: string
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          hiring_request_id?: string
          conversation_id?: string | null
          version?: number
          status?: string
          payload?: Json
          deposit_percent?: number
          wht_enabled?: boolean
          amount_satang?: number
          currency?: string
          doc_number?: string | null
          expires_at?: string
          decline_reason?: string | null
          decline_note?: string | null
          created_by?: string
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      hire_wht_docs: {
        Row: {
          id: string
          hire_order_id: string
          method: string
          file_url: string | null
          uploaded_by: string | null
          received_confirmed_at: string | null
          received_confirmed_by: string | null
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          hire_order_id: string
          method?: string
          file_url?: string | null
          uploaded_by?: string | null
          received_confirmed_at?: string | null
          received_confirmed_by?: string | null
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          hire_order_id?: string
          method?: string
          file_url?: string | null
          uploaded_by?: string | null
          received_confirmed_at?: string | null
          received_confirmed_by?: string | null
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      kuy_businesses: {
        Row: {
          id: string
          owner_id: string
          business_name: string
          category: string
          product_service: string | null
          target_customer: string | null
          location: string | null
          language: string
          main_keyword: string | null
          pain_points: string[] | null
          goals: string[] | null
          preferred_platforms: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          business_name: string
          category?: string
          product_service?: string | null
          target_customer?: string | null
          location?: string | null
          language?: string
          main_keyword?: string | null
          pain_points?: string[] | null
          goals?: string[] | null
          preferred_platforms?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          business_name?: string
          category?: string
          product_service?: string | null
          target_customer?: string | null
          location?: string | null
          language?: string
          main_keyword?: string | null
          pain_points?: string[] | null
          goals?: string[] | null
          preferred_platforms?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      kuy_campaigns: {
        Row: {
          id: string
          business_id: string
          name: string
          campaign_type: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          campaign_type?: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          name?: string
          campaign_type?: string
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      kuy_competitors: {
        Row: {
          id: string
          business_id: string
          competitor_name: string
          platform: string
          profile_url: string
          category: string | null
          followers: number | null
          engagement: number | null
          posting_frequency: string | null
          top_content_angle: string | null
          main_offer: string | null
          price_signal: string | null
          strength: string | null
          weakness: string | null
          opportunity_gap: string | null
          threat_level: string | null
          recommended_action: string | null
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          competitor_name: string
          platform: string
          profile_url: string
          category?: string | null
          followers?: number | null
          engagement?: number | null
          posting_frequency?: string | null
          top_content_angle?: string | null
          main_offer?: string | null
          price_signal?: string | null
          strength?: string | null
          weakness?: string | null
          opportunity_gap?: string | null
          threat_level?: string | null
          recommended_action?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          competitor_name?: string
          platform?: string
          profile_url?: string
          category?: string | null
          followers?: number | null
          engagement?: number | null
          posting_frequency?: string | null
          top_content_angle?: string | null
          main_offer?: string | null
          price_signal?: string | null
          strength?: string | null
          weakness?: string | null
          opportunity_gap?: string | null
          threat_level?: string | null
          recommended_action?: string | null
          created_at?: string
        }
        Relationships: []
      }
      kuy_content_items: {
        Row: {
          id: string
          business_id: string
          competitor_id: string | null
          platform: string
          content_url: string
          content_type: string | null
          title: string | null
          caption: string | null
          hook: string | null
          cta: string | null
          engagement: number | null
          hashtags: string[] | null
          sentiment: string | null
          ai_summary: string | null
          why_it_worked: string | null
          suggested_adaptation: string | null
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          competitor_id?: string | null
          platform: string
          content_url: string
          content_type?: string | null
          title?: string | null
          caption?: string | null
          hook?: string | null
          cta?: string | null
          engagement?: number | null
          hashtags?: string[] | null
          sentiment?: string | null
          ai_summary?: string | null
          why_it_worked?: string | null
          suggested_adaptation?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          competitor_id?: string | null
          platform?: string
          content_url?: string
          content_type?: string | null
          title?: string | null
          caption?: string | null
          hook?: string | null
          cta?: string | null
          engagement?: number | null
          hashtags?: string[] | null
          sentiment?: string | null
          ai_summary?: string | null
          why_it_worked?: string | null
          suggested_adaptation?: string | null
          created_at?: string
        }
        Relationships: []
      }
      kuy_export_audit_log: {
        Row: {
          id: string
          business_id: string | null
          actor_id: string
          export_format: string
          report_type: string
          row_count: number
          compliance_confirmed: boolean
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          business_id?: string | null
          actor_id: string
          export_format: string
          report_type: string
          row_count?: number
          compliance_confirmed?: boolean
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string | null
          actor_id?: string
          export_format?: string
          report_type?: string
          row_count?: number
          compliance_confirmed?: boolean
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      kuy_insights: {
        Row: {
          id: string
          business_id: string
          insight_type: string
          title: string
          summary: string
          key_findings: string[]
          recommendation: string | null
          confidence_score: number | null
          compliance_note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          insight_type: string
          title: string
          summary: string
          key_findings?: string[]
          recommendation?: string | null
          confidence_score?: number | null
          compliance_note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          insight_type?: string
          title?: string
          summary?: string
          key_findings?: string[]
          recommendation?: string | null
          confidence_score?: number | null
          compliance_note?: string | null
          created_at?: string
        }
        Relationships: []
      }
      kuy_keywords: {
        Row: {
          id: string
          business_id: string
          keyword: string
          keyword_type: string
          intent: string | null
          platform: string | null
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          keyword: string
          keyword_type?: string
          intent?: string | null
          platform?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          keyword?: string
          keyword_type?: string
          intent?: string | null
          platform?: string | null
          created_at?: string
        }
        Relationships: []
      }
      kuy_leads: {
        Row: {
          id: string
          business_id: string
          platform: string
          source_url: string
          lead_name: string
          matched_keyword: string | null
          intent: string | null
          pain_point: string | null
          post_summary: string | null
          engagement: number
          lead_score: number | null
          urgency_level: string | null
          buying_signal: string | null
          suggested_offer: string | null
          outreach_message: string | null
          status: string
          tags: string[] | null
          created_at: string
          lead_origin: string
        }
        Insert: {
          id?: string
          business_id: string
          platform: string
          source_url: string
          lead_name: string
          matched_keyword?: string | null
          intent?: string | null
          pain_point?: string | null
          post_summary?: string | null
          engagement?: number
          lead_score?: number | null
          urgency_level?: string | null
          buying_signal?: string | null
          suggested_offer?: string | null
          outreach_message?: string | null
          status?: string
          tags?: string[] | null
          created_at?: string
          lead_origin?: string
        }
        Update: {
          id?: string
          business_id?: string
          platform?: string
          source_url?: string
          lead_name?: string
          matched_keyword?: string | null
          intent?: string | null
          pain_point?: string | null
          post_summary?: string | null
          engagement?: number
          lead_score?: number | null
          urgency_level?: string | null
          buying_signal?: string | null
          suggested_offer?: string | null
          outreach_message?: string | null
          status?: string
          tags?: string[] | null
          created_at?: string
          lead_origin?: string
        }
        Relationships: []
      }
      kuy_outreach_messages: {
        Row: {
          id: string
          business_id: string
          lead_id: string | null
          channel: string
          message_body: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          lead_id?: string | null
          channel?: string
          message_body: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          lead_id?: string | null
          channel?: string
          message_body?: string
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      kuy_reports: {
        Row: {
          id: string
          business_id: string
          report_type: string
          language: string
          file_url: string | null
          export_format: string
          compliance_confirmed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          report_type: string
          language?: string
          file_url?: string | null
          export_format: string
          compliance_confirmed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          report_type?: string
          language?: string
          file_url?: string | null
          export_format?: string
          compliance_confirmed?: boolean
          created_at?: string
        }
        Relationships: []
      }
      kuy_settings: {
        Row: {
          id: string
          business_id: string | null
          owner_id: string
          default_language: string
          timezone: string
          data_retention_days: number
          export_default_format: string
          ai_mock_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id?: string | null
          owner_id: string
          default_language?: string
          timezone?: string
          data_retention_days?: number
          export_default_format?: string
          ai_mock_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string | null
          owner_id?: string
          default_language?: string
          timezone?: string
          data_retention_days?: number
          export_default_format?: string
          ai_mock_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      kyc_documents: {
        Row: {
          id: string
          request_id: string
          user_id: string
          doc_type: string
          storage_path: string
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          user_id: string
          doc_type: string
          storage_path: string
          created_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          user_id?: string
          doc_type?: string
          storage_path?: string
          created_at?: string
        }
        Relationships: []
      }
      kyc_requests: {
        Row: {
          id: string
          user_id: string
          status: string
          contact_note: string
          admin_note: string
          submitted_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          legal_name: string | null
          id_type: string | null
          bank_name: string | null
          account_number: string | null
          account_name: string | null
          bank_book_path: string | null
          ai_risk_score: number | null
          ai_summary: string | null
          ai_recommendation: string | null
          ai_reviewed_at: string | null
          pdpa_consent_at: string | null
          pdpa_consent_version: string | null
          national_id_number: string | null
          phone: string | null
          contact_email: string | null
          address_json: Json
          user_attestation_at: string | null
          reject_reason_code: string | null
          reject_reason_label: string | null
          date_of_birth: string | null
          nationality: string | null
          pep_declaration: boolean | null
          sanctions_declaration: boolean | null
          submission_meta: Json
          kyc_expires_at: string | null
          reject_reason_codes: string[] | null
        }
        Insert: {
          id?: string
          user_id: string
          status?: string
          contact_note?: string
          admin_note?: string
          submitted_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          legal_name?: string | null
          id_type?: string | null
          bank_name?: string | null
          account_number?: string | null
          account_name?: string | null
          bank_book_path?: string | null
          ai_risk_score?: number | null
          ai_summary?: string | null
          ai_recommendation?: string | null
          ai_reviewed_at?: string | null
          pdpa_consent_at?: string | null
          pdpa_consent_version?: string | null
          national_id_number?: string | null
          phone?: string | null
          contact_email?: string | null
          address_json?: Json
          user_attestation_at?: string | null
          reject_reason_code?: string | null
          reject_reason_label?: string | null
          date_of_birth?: string | null
          nationality?: string | null
          pep_declaration?: boolean | null
          sanctions_declaration?: boolean | null
          submission_meta?: Json
          kyc_expires_at?: string | null
          reject_reason_codes?: string[] | null
        }
        Update: {
          id?: string
          user_id?: string
          status?: string
          contact_note?: string
          admin_note?: string
          submitted_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          legal_name?: string | null
          id_type?: string | null
          bank_name?: string | null
          account_number?: string | null
          account_name?: string | null
          bank_book_path?: string | null
          ai_risk_score?: number | null
          ai_summary?: string | null
          ai_recommendation?: string | null
          ai_reviewed_at?: string | null
          pdpa_consent_at?: string | null
          pdpa_consent_version?: string | null
          national_id_number?: string | null
          phone?: string | null
          contact_email?: string | null
          address_json?: Json
          user_attestation_at?: string | null
          reject_reason_code?: string | null
          reject_reason_label?: string | null
          date_of_birth?: string | null
          nationality?: string | null
          pep_declaration?: boolean | null
          sanctions_declaration?: boolean | null
          submission_meta?: Json
          kyc_expires_at?: string | null
          reject_reason_codes?: string[] | null
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          id: string
          user_id: string
          hire_order_id: string | null
          payment_id: string | null
          payout_request_id: string | null
          entry_type: string
          amount_satang: number
          direction: number
          currency: string
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          hire_order_id?: string | null
          payment_id?: string | null
          payout_request_id?: string | null
          entry_type: string
          amount_satang: number
          direction: number
          currency?: string
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          hire_order_id?: string | null
          payment_id?: string | null
          payout_request_id?: string | null
          entry_type?: string
          amount_satang?: number
          direction?: number
          currency?: string
          note?: string | null
          created_at?: string
        }
        Relationships: []
      }
      marketplace_escrows: {
        Row: {
          id: string
          freelancer_user_id: string
          hiring_request_id: string | null
          quotation_id: string | null
          client_name: string
          client_email: string
          title: string
          amount_thb: number
          platform_fee_pct: number
          platform_fee_thb: number
          net_payout_thb: number
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
          portal_token: string
          status: string
          funded_at: string | null
          approved_at: string | null
          released_at: string | null
          disputed_at: string | null
          dispute_reason: string | null
          admin_note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          freelancer_user_id: string
          hiring_request_id?: string | null
          quotation_id?: string | null
          client_name?: string
          client_email?: string
          title?: string
          amount_thb: number
          platform_fee_pct: number
          platform_fee_thb?: number
          net_payout_thb: number
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          portal_token?: string
          status?: string
          funded_at?: string | null
          approved_at?: string | null
          released_at?: string | null
          disputed_at?: string | null
          dispute_reason?: string | null
          admin_note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          freelancer_user_id?: string
          hiring_request_id?: string | null
          quotation_id?: string | null
          client_name?: string
          client_email?: string
          title?: string
          amount_thb?: number
          platform_fee_pct?: number
          platform_fee_thb?: number
          net_payout_thb?: number
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          portal_token?: string
          status?: string
          funded_at?: string | null
          approved_at?: string | null
          released_at?: string | null
          disputed_at?: string | null
          dispute_reason?: string | null
          admin_note?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          attachment_url: string | null
          read_at: string | null
          created_at: string
          reply_to_id: string | null
          deleted_at: string | null
          message_type: string
          project_id: string | null
          profile_user_id: string | null
          service_id: string | null
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content?: string
          attachment_url?: string | null
          read_at?: string | null
          created_at?: string
          reply_to_id?: string | null
          deleted_at?: string | null
          message_type?: string
          project_id?: string | null
          profile_user_id?: string | null
          service_id?: string | null
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string
          attachment_url?: string | null
          read_at?: string | null
          created_at?: string
          reply_to_id?: string | null
          deleted_at?: string | null
          message_type?: string
          project_id?: string | null
          profile_user_id?: string | null
          service_id?: string | null
        }
        Relationships: []
      }
      moderation_actions: {
        Row: {
          id: string
          user_id: string
          actor_id: string | null
          action_type: string
          source: string
          reason: string
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          actor_id?: string | null
          action_type: string
          source?: string
          reason?: string
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          actor_id?: string | null
          action_type?: string
          source?: string
          reason?: string
          expires_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          app: string
          kind: string
          title: string
          body: string
          link: string
          metadata: Json
          is_read: boolean
          is_dismissed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          app: string
          kind: string
          title: string
          body?: string
          link?: string
          metadata?: Json
          is_read?: boolean
          is_dismissed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          app?: string
          kind?: string
          title?: string
          body?: string
          link?: string
          metadata?: Json
          is_read?: boolean
          is_dismissed?: boolean
          created_at?: string
        }
        Relationships: []
      }
      payment_attempts: {
        Row: {
          id: string
          payment_id: string
          attempt_no: number
          status: string
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          payment_id: string
          attempt_no?: number
          status: string
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          payment_id?: string
          attempt_no?: number
          status?: string
          error_message?: string | null
          created_at?: string
        }
        Relationships: []
      }
      payment_audit_logs: {
        Row: {
          id: string
          actor_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          detail: Json
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          detail?: Json
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          detail?: Json
          created_at?: string
        }
        Relationships: []
      }
      payment_disputes: {
        Row: {
          id: string
          hire_order_id: string
          status: string
          reason: string | null
          resolution: string | null
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          hire_order_id: string
          status?: string
          reason?: string | null
          resolution?: string | null
          created_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          hire_order_id?: string
          status?: string
          reason?: string | null
          resolution?: string | null
          created_at?: string
          resolved_at?: string | null
        }
        Relationships: []
      }
      payment_recipients: {
        Row: {
          id: string
          user_id: string
          provider: string
          provider_recipient_id: string | null
          bank_code: string | null
          account_name: string | null
          account_last4: string | null
          account_encrypted: string | null
          verified: boolean
          verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider?: string
          provider_recipient_id?: string | null
          bank_code?: string | null
          account_name?: string | null
          account_last4?: string | null
          account_encrypted?: string | null
          verified?: boolean
          verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          provider_recipient_id?: string | null
          bank_code?: string | null
          account_name?: string | null
          account_last4?: string | null
          account_encrypted?: string | null
          verified?: boolean
          verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          hire_order_id: string
          provider: string
          provider_charge_id: string | null
          method: string
          status: string
          amount_satang: number
          currency: string
          idempotency_key: string
          paid_at: string | null
          failed_at: string | null
          raw: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          hire_order_id: string
          provider?: string
          provider_charge_id?: string | null
          method: string
          status?: string
          amount_satang: number
          currency?: string
          idempotency_key: string
          paid_at?: string | null
          failed_at?: string | null
          raw?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          hire_order_id?: string
          provider?: string
          provider_charge_id?: string | null
          method?: string
          status?: string
          amount_satang?: number
          currency?: string
          idempotency_key?: string
          paid_at?: string | null
          failed_at?: string | null
          raw?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payout_items: {
        Row: {
          id: string
          payout_request_id: string
          hire_order_id: string
          amount_satang: number
          created_at: string
        }
        Insert: {
          id?: string
          payout_request_id: string
          hire_order_id: string
          amount_satang: number
          created_at?: string
        }
        Update: {
          id?: string
          payout_request_id?: string
          hire_order_id?: string
          amount_satang?: number
          created_at?: string
        }
        Relationships: []
      }
      payout_profiles: {
        Row: {
          user_id: string
          bank_name: string
          account_number: string
          account_name: string
          bank_book_path: string | null
          verified_at: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          bank_name: string
          account_number: string
          account_name: string
          bank_book_path?: string | null
          verified_at?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          bank_name?: string
          account_number?: string
          account_name?: string
          bank_book_path?: string | null
          verified_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          id: string
          user_id: string
          recipient_id: string | null
          status: string
          kind: string
          amount_satang: number
          fee_satang: number
          transfer_satang: number
          provider_transfer_id: string | null
          idempotency_key: string
          failure_reason: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          recipient_id?: string | null
          status?: string
          kind?: string
          amount_satang: number
          fee_satang?: number
          transfer_satang: number
          provider_transfer_id?: string | null
          idempotency_key: string
          failure_reason?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          recipient_id?: string | null
          status?: string
          kind?: string
          amount_satang?: number
          fee_satang?: number
          transfer_satang?: number
          provider_transfer_id?: string | null
          idempotency_key?: string
          failure_reason?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Relationships: []
      }
      provider_events: {
        Row: {
          id: string
          provider: string
          provider_event_id: string
          event_type: string
          payload: Json
          processed_at: string | null
          process_error: string | null
          created_at: string
        }
        Insert: {
          id?: string
          provider?: string
          provider_event_id: string
          event_type: string
          payload: Json
          processed_at?: string | null
          process_error?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          provider?: string
          provider_event_id?: string
          event_type?: string
          payload?: Json
          processed_at?: string | null
          process_error?: string | null
          created_at?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          user_id: string
          code: string
          active: boolean
          created_at: string
        }
        Insert: {
          user_id: string
          code: string
          active?: boolean
          created_at?: string
        }
        Update: {
          user_id?: string
          code?: string
          active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      referral_program_config: {
        Row: {
          id: number
          signup_reward_px: number
          activation_reward_px: number
          referrer_reward_px: number
          registration_window_days: number
          enabled: boolean
          updated_at: string
        }
        Insert: {
          id?: number
          signup_reward_px?: number
          activation_reward_px?: number
          referrer_reward_px?: number
          registration_window_days?: number
          enabled?: boolean
          updated_at?: string
        }
        Update: {
          id?: number
          signup_reward_px?: number
          activation_reward_px?: number
          referrer_reward_px?: number
          registration_window_days?: number
          enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      referral_reward_ledger: {
        Row: {
          id: string
          referral_id: string
          user_id: string
          reward_kind: string
          wallet_bucket: string
          amount_px: number
          created_at: string
        }
        Insert: {
          id?: string
          referral_id: string
          user_id: string
          reward_kind: string
          wallet_bucket: string
          amount_px: number
          created_at?: string
        }
        Update: {
          id?: string
          referral_id?: string
          user_id?: string
          reward_kind?: string
          wallet_bucket?: string
          amount_px?: number
          created_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          id: string
          referrer_id: string
          referred_user_id: string
          referral_code: string
          status: string
          signup_reward_px: number
          activation_reward_px: number
          referrer_reward_px: number
          registered_at: string
          qualified_at: string | null
          qualification_kind: string | null
          qualification_id: string | null
          rejected_reason: string | null
        }
        Insert: {
          id?: string
          referrer_id: string
          referred_user_id: string
          referral_code: string
          status?: string
          signup_reward_px?: number
          activation_reward_px?: number
          referrer_reward_px?: number
          registered_at?: string
          qualified_at?: string | null
          qualification_kind?: string | null
          qualification_id?: string | null
          rejected_reason?: string | null
        }
        Update: {
          id?: string
          referrer_id?: string
          referred_user_id?: string
          referral_code?: string
          status?: string
          signup_reward_px?: number
          activation_reward_px?: number
          referrer_reward_px?: number
          registered_at?: string
          qualified_at?: string | null
          qualification_kind?: string | null
          qualification_id?: string | null
          rejected_reason?: string | null
        }
        Relationships: []
      }
      refunds: {
        Row: {
          id: string
          hire_order_id: string
          payment_id: string | null
          cancel_request_id: string | null
          amount_satang: number
          status: string
          provider_refund_id: string | null
          money_terms: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          hire_order_id: string
          payment_id?: string | null
          cancel_request_id?: string | null
          amount_satang: number
          status?: string
          provider_refund_id?: string | null
          money_terms?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          hire_order_id?: string
          payment_id?: string | null
          cancel_request_id?: string | null
          amount_satang?: number
          status?: string
          provider_refund_id?: string | null
          money_terms?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_display_currency: {
        Row: {
          user_id: string
          display_currency: string
          updated_at: string
        }
        Insert: {
          user_id: string
          display_currency?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          display_currency?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_moderation_state: {
        Row: {
          user_id: string
          strikes: number
          muted_until: string | null
          banned_until: string | null
          reason: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          strikes?: number
          muted_until?: string | null
          banned_until?: string | null
          reason?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          strikes?: number
          muted_until?: string | null
          banned_until?: string | null
          reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      wallet_topups: {
        Row: {
          id: string
          user_id: string
          amount_px: number
          method: string
          status: string
          created_at: string
          stripe_session_id: string | null
          payment_provider: string | null
          amount_cents: number | null
        }
        Insert: {
          id?: string
          user_id: string
          amount_px: number
          method?: string
          status?: string
          created_at?: string
          stripe_session_id?: string | null
          payment_provider?: string | null
          amount_cents?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          amount_px?: number
          method?: string
          status?: string
          created_at?: string
          stripe_session_id?: string | null
          payment_provider?: string | null
          amount_cents?: number | null
        }
        Relationships: []
      }
      wallets: {
        Row: {
          user_id: string
          lifetime_earned_px: number | null
          lifetime_spent_px: number | null
          updated_at: string | null
          purchased_px: number | null
          earned_px: number | null
          welcome_px: number | null
          lifetime_welcome_px: number | null
          balance_px: number | null
        }
        Insert: {
          user_id: string
          lifetime_earned_px?: number | null
          lifetime_spent_px?: number | null
          updated_at?: string | null
          purchased_px?: number | null
          earned_px?: number | null
          welcome_px?: number | null
          lifetime_welcome_px?: number | null
          balance_px?: never
        }
        Update: {
          user_id?: string
          lifetime_earned_px?: number | null
          lifetime_spent_px?: number | null
          updated_at?: string | null
          purchased_px?: number | null
          earned_px?: number | null
          welcome_px?: number | null
          lifetime_welcome_px?: number | null
          balance_px?: never
        }
        Relationships: []
      }
    }
    Views: {

    }
    Functions: {
      next_doc_number: {
        Args: { p_kind: string }
        Returns: string
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
      annotations: {
        Row: {
          comment: string | null
          created_at: string
          created_by: string
          height: number
          id: string
          issue_id: string | null
          project_id: string
          review_round_id: string
          type: string
          updated_at: string
          width: number
          x: number
          y: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          created_by?: string
          height: number
          id?: string
          issue_id?: string | null
          project_id: string
          review_round_id: string
          type: string
          updated_at?: string
          width: number
          x: number
          y: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          created_by?: string
          height?: number
          id?: string
          issue_id?: string | null
          project_id?: string
          review_round_id?: string
          type?: string
          updated_at?: string
          width?: number
          x?: number
          y?: number
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
      avatar_pool: {
        Row: {
          active: boolean
          created_at: string
          id: number
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: number
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: number
          url?: string
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
      consent_events: {
        Row: {
          anon_id: string | null
          created_at: string
          granted: boolean
          id: number
          policy_version: string
          purpose: string
          user_id: string | null
        }
        Insert: {
          anon_id?: string | null
          created_at?: string
          granted: boolean
          id?: never
          policy_version: string
          purpose: string
          user_id?: string | null
        }
        Update: {
          anon_id?: string | null
          created_at?: string
          granted?: boolean
          id?: never
          policy_version?: string
          purpose?: string
          user_id?: string | null
        }
        Relationships: []
      }
      creator_submissions: {
        Row: {
          asset_path: string
          created_at: string
          credit_name: string
          discover_item_id: string | null
          id: string
          license: string
          link_url: string | null
          owner_confirmed: boolean
          reject_reason: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_path: string
          created_at?: string
          credit_name: string
          discover_item_id?: string | null
          id?: string
          license?: string
          link_url?: string | null
          owner_confirmed: boolean
          reject_reason?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_path?: string
          created_at?: string
          credit_name?: string
          discover_item_id?: string | null
          id?: string
          license?: string
          link_url?: string | null
          owner_confirmed?: boolean
          reject_reason?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_submissions_discover_item_id_fkey"
            columns: ["discover_item_id"]
            isOneToOne: false
            referencedRelation: "discover_items"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: []
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
      dead_letters: {
        Row: {
          attempts: number
          created_at: string
          error: string | null
          id: number
          job: string
          payload: Json | null
          resolved_at: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          error?: string | null
          id?: never
          job: string
          payload?: Json | null
          resolved_at?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          error?: string | null
          id?: never
          job?: string
          payload?: Json | null
          resolved_at?: string | null
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
      digest_prefs: {
        Row: {
          opted_in: boolean
          opted_in_at: string | null
          unsubscribed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          opted_in?: boolean
          opted_in_at?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          opted_in?: boolean
          opted_in_at?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      discover_items: {
        Row: {
          ai_category: string | null
          alt_text_en: string | null
          alt_text_th: string | null
          attribution: string
          attribution_json: Json
          blurhash: string | null
          category: string
          check_fail_count: number
          colors: string[]
          created_at: string
          culture_region: string | null
          delivery_mode: string
          duplicate_of: string | null
          enrich_level: number
          era: string | null
          height: number | null
          id: string
          image_lg_path: string | null
          image_md_path: string | null
          image_sm_path: string | null
          institution: string | null
          last_checked_at: string | null
          legacy_published: boolean
          license: string
          license_url: string | null
          medium: string | null
          metrics: Json | null
          original_image_url: string
          palette: Json | null
          phash: unknown
          published_at: string | null
          quality_score: number | null
          reject_reason: string | null
          search_text: string | null
          sha256: string | null
          source: string
          source_id: string
          source_meta: Json
          source_url: string
          status: string
          status_reason: string | null
          style: string | null
          tags: string[]
          tags_ids: string[]
          tags_json: Json
          title: string
          updated_at: string
          width: number | null
          year: number | null
        }
        Insert: {
          ai_category?: string | null
          alt_text_en?: string | null
          alt_text_th?: string | null
          attribution?: string
          attribution_json?: Json
          blurhash?: string | null
          category: string
          check_fail_count?: number
          colors?: string[]
          created_at?: string
          culture_region?: string | null
          delivery_mode?: string
          duplicate_of?: string | null
          enrich_level?: number
          era?: string | null
          height?: number | null
          id?: string
          image_lg_path?: string | null
          image_md_path?: string | null
          image_sm_path?: string | null
          institution?: string | null
          last_checked_at?: string | null
          legacy_published?: boolean
          license: string
          license_url?: string | null
          medium?: string | null
          metrics?: Json | null
          original_image_url: string
          palette?: Json | null
          phash?: unknown
          published_at?: string | null
          quality_score?: number | null
          reject_reason?: string | null
          search_text?: string | null
          sha256?: string | null
          source: string
          source_id: string
          source_meta?: Json
          source_url: string
          status?: string
          status_reason?: string | null
          style?: string | null
          tags?: string[]
          tags_ids?: string[]
          tags_json?: Json
          title?: string
          updated_at?: string
          width?: number | null
          year?: number | null
        }
        Update: {
          ai_category?: string | null
          alt_text_en?: string | null
          alt_text_th?: string | null
          attribution?: string
          attribution_json?: Json
          blurhash?: string | null
          category?: string
          check_fail_count?: number
          colors?: string[]
          created_at?: string
          culture_region?: string | null
          delivery_mode?: string
          duplicate_of?: string | null
          enrich_level?: number
          era?: string | null
          height?: number | null
          id?: string
          image_lg_path?: string | null
          image_md_path?: string | null
          image_sm_path?: string | null
          institution?: string | null
          last_checked_at?: string | null
          legacy_published?: boolean
          license?: string
          license_url?: string | null
          medium?: string | null
          metrics?: Json | null
          original_image_url?: string
          palette?: Json | null
          phash?: unknown
          published_at?: string | null
          quality_score?: number | null
          reject_reason?: string | null
          search_text?: string | null
          sha256?: string | null
          source?: string
          source_id?: string
          source_meta?: Json
          source_url?: string
          status?: string
          status_reason?: string | null
          style?: string | null
          tags?: string[]
          tags_ids?: string[]
          tags_json?: Json
          title?: string
          updated_at?: string
          width?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "discover_items_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "discover_items"
            referencedColumns: ["id"]
          },
        ]
      }
      discover_reports: {
        Row: {
          created_at: string
          details: string
          email: string | null
          id: string
          item_id: string
          reason: string
          replied_at: string | null
          resolution_note: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: string
          email?: string | null
          id?: string
          item_id: string
          reason: string
          replied_at?: string | null
          resolution_note?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: string
          email?: string | null
          id?: string
          item_id?: string
          reason?: string
          replied_at?: string | null
          resolution_note?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discover_reports_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "discover_items"
            referencedColumns: ["id"]
          },
        ]
      }
      dsar_requests: {
        Row: {
          created_at: string
          details: string
          due_at: string
          email: string | null
          id: string
          resolved_at: string | null
          status: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: string
          due_at?: string
          email?: string | null
          id?: string
          resolved_at?: string | null
          status?: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: string
          due_at?: string
          email?: string | null
          id?: string
          resolved_at?: string | null
          status?: string
          type?: string
          user_id?: string | null
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
      eval_queries: {
        Row: {
          created_at: string
          expected_tag_ids: string[]
          id: string
          notes: string
          text: string
        }
        Insert: {
          created_at?: string
          expected_tag_ids?: string[]
          id?: string
          notes?: string
          text: string
        }
        Update: {
          created_at?: string
          expected_tag_ids?: string[]
          id?: string
          notes?: string
          text?: string
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
      heatmap_hotspots: {
        Row: {
          created_at: string
          explanation: string | null
          heatmap_id: string
          height: number
          id: string
          intensity: number
          label: string
          project_id: string
          recommendation: string | null
          review_round_id: string
          type: string
          width: number
          x: number
          y: number
        }
        Insert: {
          created_at?: string
          explanation?: string | null
          heatmap_id: string
          height: number
          id?: string
          intensity: number
          label: string
          project_id: string
          recommendation?: string | null
          review_round_id: string
          type: string
          width: number
          x: number
          y: number
        }
        Update: {
          created_at?: string
          explanation?: string | null
          heatmap_id?: string
          height?: number
          id?: string
          intensity?: number
          label?: string
          project_id?: string
          recommendation?: string | null
          review_round_id?: string
          type?: string
          width?: number
          x?: number
          y?: number
        }
        Relationships: []
      }
      heatmaps: {
        Row: {
          attention_score: number | null
          clutter_feedback: string | null
          competing_attention_elements: Json | null
          created_at: string
          cta_feedback: string | null
          cta_visibility_score: number | null
          id: string
          missed_important_areas: Json | null
          primary_attention_area: string | null
          project_id: string
          recommendations: Json | null
          review_round_id: string
          summary: string | null
          visual_clutter_score: number | null
        }
        Insert: {
          attention_score?: number | null
          clutter_feedback?: string | null
          competing_attention_elements?: Json | null
          created_at?: string
          cta_feedback?: string | null
          cta_visibility_score?: number | null
          id?: string
          missed_important_areas?: Json | null
          primary_attention_area?: string | null
          project_id: string
          recommendations?: Json | null
          review_round_id: string
          summary?: string | null
          visual_clutter_score?: number | null
        }
        Update: {
          attention_score?: number | null
          clutter_feedback?: string | null
          competing_attention_elements?: Json | null
          created_at?: string
          cta_feedback?: string | null
          cta_visibility_score?: number | null
          id?: string
          missed_important_areas?: Json | null
          primary_attention_area?: string | null
          project_id?: string
          recommendations?: Json | null
          review_round_id?: string
          summary?: string | null
          visual_clutter_score?: number | null
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      image_blocks: {
        Row: {
          created_at: string
          id: string
          item_id: string | null
          phash: unknown
          reason: string
          report_id: string | null
          sha256: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id?: string | null
          phash?: unknown
          reason?: string
          report_id?: string | null
          sha256?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string | null
          phash?: unknown
          reason?: string
          report_id?: string | null
          sha256?: string | null
        }
        Relationships: []
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
            foreignKeyName: "inhouse_activity_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
            foreignKeyName: "inhouse_canvases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
            foreignKeyName: "inhouse_canvases_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
            foreignKeyName: "inhouse_invites_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
            foreignKeyName: "inhouse_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
          {
            foreignKeyName: "inhouse_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
            foreignKeyName: "inhouse_org_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
          {
            foreignKeyName: "inhouse_org_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      inhouse_orgs: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          seat_limit: number
          settings: Json
          slug: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
          seat_limit?: number
          settings?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          seat_limit?: number
          settings?: Json
          slug?: string
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
          {
            foreignKeyName: "inhouse_orgs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles_public"
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
            foreignKeyName: "inhouse_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
            foreignKeyName: "inhouse_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
            foreignKeyName: "inhouse_workspaces_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
      issues: {
        Row: {
          category: string
          created_at: string
          description: string | null
          effort: string | null
          fix_prompt: string | null
          id: string
          impact: string | null
          location_height: number | null
          location_width: number | null
          location_x: number | null
          location_y: number | null
          project_id: string
          review_round_id: string
          severity: string
          status: string
          suggested_fix: string | null
          title: string
          updated_at: string
          user_comment: string | null
          why_it_matters: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          effort?: string | null
          fix_prompt?: string | null
          id?: string
          impact?: string | null
          location_height?: number | null
          location_width?: number | null
          location_x?: number | null
          location_y?: number | null
          project_id: string
          review_round_id: string
          severity: string
          status?: string
          suggested_fix?: string | null
          title: string
          updated_at?: string
          user_comment?: string | null
          why_it_matters?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          effort?: string | null
          fix_prompt?: string | null
          id?: string
          impact?: string | null
          location_height?: number | null
          location_width?: number | null
          location_x?: number | null
          location_y?: number | null
          project_id?: string
          review_round_id?: string
          severity?: string
          status?: string
          suggested_fix?: string | null
          title?: string
          updated_at?: string
          user_comment?: string | null
          why_it_matters?: string | null
        }
        Relationships: []
      }
      item_signals: {
        Row: {
          created_at: string
          id: number
          item_id: string
          position: number | null
          search_event_id: number | null
          tag_ids: string[] | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: never
          item_id: string
          position?: number | null
          search_event_id?: number | null
          tag_ids?: string[] | null
          type: string
        }
        Update: {
          created_at?: string
          id?: never
          item_id?: string
          position?: number | null
          search_event_id?: number | null
          tag_ids?: string[] | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_signals_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "discover_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_signals_search_event_id_fkey"
            columns: ["search_event_id"]
            isOneToOne: false
            referencedRelation: "search_events"
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
      learning_changelog: {
        Row: {
          after: Json | null
          at: string
          before: Json | null
          id: number
          reason: string | null
          what: string
        }
        Insert: {
          after?: Json | null
          at?: string
          before?: Json | null
          id?: never
          reason?: string | null
          what: string
        }
        Update: {
          after?: Json | null
          at?: string
          before?: Json | null
          id?: never
          reason?: string | null
          what?: string
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      ops_events: {
        Row: {
          created_at: string
          detail: Json
          id: number
          kind: string
          severity: string
        }
        Insert: {
          created_at?: string
          detail?: Json
          id?: never
          kind: string
          severity?: string
        }
        Update: {
          created_at?: string
          detail?: Json
          id?: never
          kind?: string
          severity?: string
        }
        Relationships: []
      }
      ops_reports: {
        Row: {
          body: Json
          created_at: string
          day: string
          emailed_at: string | null
        }
        Insert: {
          body: Json
          created_at?: string
          day: string
          emailed_at?: string | null
        }
        Update: {
          body?: Json
          created_at?: string
          day?: string
          emailed_at?: string | null
        }
        Relationships: []
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
        Relationships: []
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
      persona_group_members: {
        Row: {
          group_id: string
          id: string
          persona_id: string
          sort_order: number
        }
        Insert: {
          group_id: string
          id?: string
          persona_id: string
          sort_order?: number
        }
        Update: {
          group_id?: string
          id?: string
          persona_id?: string
          sort_order?: number
        }
        Relationships: []
      }
      persona_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personas: {
        Row: {
          accessibility_needs: Json | null
          age_range: string | null
          analytical_score: number | null
          avatar_preset: string | null
          avatar_url: string | null
          cautious_score: number | null
          context_of_use: string | null
          created_at: string
          curious_score: number | null
          custom_notes: string | null
          deal_breakers: Json | null
          decision_criteria: Json | null
          device_preference: string | null
          emotional_state: string | null
          id: string
          income_range: string | null
          is_default: boolean
          job_to_be_done: string | null
          language_style: string | null
          location: string | null
          main_goal: string | null
          motivation: string | null
          name: string
          objections: Json | null
          occupation: string | null
          pain_points: Json | null
          preferred_channels: Json | null
          price_sensitivity_score: number | null
          role: string | null
          scenario: string | null
          source_template_id: string | null
          success_criteria: Json | null
          tech_literacy: string | null
          time_pressure: string | null
          trust_triggers: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accessibility_needs?: Json | null
          age_range?: string | null
          analytical_score?: number | null
          avatar_preset?: string | null
          avatar_url?: string | null
          cautious_score?: number | null
          context_of_use?: string | null
          created_at?: string
          curious_score?: number | null
          custom_notes?: string | null
          deal_breakers?: Json | null
          decision_criteria?: Json | null
          device_preference?: string | null
          emotional_state?: string | null
          id?: string
          income_range?: string | null
          is_default?: boolean
          job_to_be_done?: string | null
          language_style?: string | null
          location?: string | null
          main_goal?: string | null
          motivation?: string | null
          name: string
          objections?: Json | null
          occupation?: string | null
          pain_points?: Json | null
          preferred_channels?: Json | null
          price_sensitivity_score?: number | null
          role?: string | null
          scenario?: string | null
          source_template_id?: string | null
          success_criteria?: Json | null
          tech_literacy?: string | null
          time_pressure?: string | null
          trust_triggers?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accessibility_needs?: Json | null
          age_range?: string | null
          analytical_score?: number | null
          avatar_preset?: string | null
          avatar_url?: string | null
          cautious_score?: number | null
          context_of_use?: string | null
          created_at?: string
          curious_score?: number | null
          custom_notes?: string | null
          deal_breakers?: Json | null
          decision_criteria?: Json | null
          device_preference?: string | null
          emotional_state?: string | null
          id?: string
          income_range?: string | null
          is_default?: boolean
          job_to_be_done?: string | null
          language_style?: string | null
          location?: string | null
          main_goal?: string | null
          motivation?: string | null
          name?: string
          objections?: Json | null
          occupation?: string | null
          pain_points?: Json | null
          preferred_channels?: Json | null
          price_sensitivity_score?: number | null
          role?: string | null
          scenario?: string | null
          source_template_id?: string | null
          success_criteria?: Json | null
          tech_literacy?: string | null
          time_pressure?: string | null
          trust_triggers?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planner_posts: {
        Row: {
          approval_status: string | null
          caption: string | null
          client_feedback: string | null
          client_id: string | null
          created_at: string | null
          custom_platforms: string[] | null
          id: string | null
          image_url: string | null
          link: string | null
          meta: Json | null
          platforms: string[] | null
          post_date: string | null
          post_time: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          vision_canvas_id: string | null
        }
        Insert: {
          approval_status?: string | null
          caption?: string | null
          client_feedback?: string | null
          client_id?: string | null
          created_at?: string | null
          custom_platforms?: string[] | null
          id?: string | null
          image_url?: string | null
          link?: string | null
          meta?: Json | null
          platforms?: string[] | null
          post_date?: string | null
          post_time?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          vision_canvas_id?: string | null
        }
        Update: {
          approval_status?: string | null
          caption?: string | null
          client_feedback?: string | null
          client_id?: string | null
          created_at?: string | null
          custom_platforms?: string[] | null
          id?: string | null
          image_url?: string | null
          link?: string | null
          meta?: Json | null
          platforms?: string[] | null
          post_date?: string | null
          post_time?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
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
      product_events: {
        Row: {
          app: string
          created_at: string
          event_name: string
          id: string
          path: string | null
          props: Json
          referrer: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          app?: string
          created_at?: string
          event_name: string
          id?: string
          path?: string | null
          props?: Json
          referrer?: string | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          app?: string
          created_at?: string
          event_name?: string
          id?: string
          path?: string | null
          props?: Json
          referrer?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string | null
          active_studio_id: string | null
          address: string | null
          archetype: string | null
          archetype_secondary: string | null
          availability_status: string | null
          avatar_url: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          billing_address: string | null
          billing_type: string | null
          bio: string | null
          branch: string | null
          brand_name: string | null
          company_name: string | null
          connect_onboarding_complete: boolean | null
          connect_payouts_enabled: boolean | null
          contact_person: string | null
          contact_role: string | null
          cover_original_url: string | null
          cover_url: string | null
          created_at: string | null
          currency: string | null
          cv: Json
          cv_photo_url: string | null
          daily_rate_min: number | null
          date_of_birth: string | null
          deactivated_at: string | null
          deactivated_by: string | null
          display_name: string | null
          display_name_changed_at: string | null
          document_theme: Json | null
          email: string | null
          esign_acknowledged_at: string | null
          experience: Json | null
          facebook: string | null
          feed_interests: string[] | null
          feed_interests_at: string | null
          freelance_field: string | null
          frozen_at: string | null
          frozen_reason: string | null
          hourly_rate_min: number | null
          id: string
          instagram: string | null
          is_active: boolean | null
          is_verified: boolean | null
          kyc_expires_at: string | null
          kyc_verified_at: string | null
          last_active_at: string | null
          legal_name: string | null
          line_id: string | null
          line_linked_at: string | null
          line_messaging_user_id: string | null
          line_notify_enabled: boolean | null
          line_notify_prefs: Json | null
          locale: string | null
          location: string | null
          logo_url: string | null
          notify_collab: boolean
          notify_email: boolean | null
          notify_hire: boolean | null
          notify_job_match: boolean | null
          onboarding_completed: boolean | null
          onboarding_data: Json | null
          onboarding_visits: Json | null
          open_for_work: boolean
          open_for_work_badge: string | null
          opportunity_note: string | null
          opportunity_status: string
          opportunity_types: string[]
          payment_qr_url: string | null
          persona: string | null
          phone: string | null
          preferred_categories: string[] | null
          preferred_employment_types: string[] | null
          profile_address: Json
          profile_faq: Json | null
          profile_onboarding_at: string | null
          project_rate_note: string | null
          purge_after: string | null
          purged_at: string | null
          risk_score: number | null
          role: string | null
          signature_url: string | null
          skills: string[] | null
          social_link: string | null
          social_links: Json
          stripe_client_payments_enabled: boolean | null
          stripe_connect_account_id: string | null
          subscription_seats: number | null
          subscription_tier: string | null
          tagline: string | null
          tax_id: string | null
          terms: string | null
          tester_applied_at: string | null
          tester_approved: boolean | null
          updated_at: string | null
          user_id: string | null
          username: string | null
          username_changed_at: string | null
          vat_registered: boolean | null
          verified_at: string | null
          verified_by: string | null
          website: string | null
        }
        Insert: {
          account_status?: string | null
          active_studio_id?: string | null
          address?: string | null
          archetype?: string | null
          archetype_secondary?: string | null
          availability_status?: string | null
          avatar_url?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          billing_address?: string | null
          billing_type?: string | null
          bio?: string | null
          branch?: string | null
          brand_name?: string | null
          company_name?: string | null
          connect_onboarding_complete?: boolean | null
          connect_payouts_enabled?: boolean | null
          contact_person?: string | null
          contact_role?: string | null
          cover_original_url?: string | null
          cover_url?: string | null
          created_at?: string | null
          currency?: string | null
          cv?: Json
          cv_photo_url?: string | null
          daily_rate_min?: number | null
          date_of_birth?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          display_name?: string | null
          display_name_changed_at?: string | null
          document_theme?: Json | null
          email?: string | null
          esign_acknowledged_at?: string | null
          experience?: Json | null
          facebook?: string | null
          feed_interests?: string[] | null
          feed_interests_at?: string | null
          freelance_field?: string | null
          frozen_at?: string | null
          frozen_reason?: string | null
          hourly_rate_min?: number | null
          id: string
          instagram?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          kyc_expires_at?: string | null
          kyc_verified_at?: string | null
          last_active_at?: string | null
          legal_name?: string | null
          line_id?: string | null
          line_linked_at?: string | null
          line_messaging_user_id?: string | null
          line_notify_enabled?: boolean | null
          line_notify_prefs?: Json | null
          locale?: string | null
          location?: string | null
          logo_url?: string | null
          notify_collab?: boolean
          notify_email?: boolean | null
          notify_hire?: boolean | null
          notify_job_match?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_data?: Json | null
          onboarding_visits?: Json | null
          open_for_work?: boolean
          open_for_work_badge?: string | null
          opportunity_note?: string | null
          opportunity_status?: string
          opportunity_types?: string[]
          payment_qr_url?: string | null
          persona?: string | null
          phone?: string | null
          preferred_categories?: string[] | null
          preferred_employment_types?: string[] | null
          profile_address?: Json
          profile_faq?: Json | null
          profile_onboarding_at?: string | null
          project_rate_note?: string | null
          purge_after?: string | null
          purged_at?: string | null
          risk_score?: number | null
          role?: string | null
          signature_url?: string | null
          skills?: string[] | null
          social_link?: string | null
          social_links?: Json
          stripe_client_payments_enabled?: boolean | null
          stripe_connect_account_id?: string | null
          subscription_seats?: number | null
          subscription_tier?: string | null
          tagline?: string | null
          tax_id?: string | null
          terms?: string | null
          tester_applied_at?: string | null
          tester_approved?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          username_changed_at?: string | null
          vat_registered?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
        }
        Update: {
          account_status?: string | null
          active_studio_id?: string | null
          address?: string | null
          archetype?: string | null
          archetype_secondary?: string | null
          availability_status?: string | null
          avatar_url?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          billing_address?: string | null
          billing_type?: string | null
          bio?: string | null
          branch?: string | null
          brand_name?: string | null
          company_name?: string | null
          connect_onboarding_complete?: boolean | null
          connect_payouts_enabled?: boolean | null
          contact_person?: string | null
          contact_role?: string | null
          cover_original_url?: string | null
          cover_url?: string | null
          created_at?: string | null
          currency?: string | null
          cv?: Json
          cv_photo_url?: string | null
          daily_rate_min?: number | null
          date_of_birth?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          display_name?: string | null
          display_name_changed_at?: string | null
          document_theme?: Json | null
          email?: string | null
          esign_acknowledged_at?: string | null
          experience?: Json | null
          facebook?: string | null
          feed_interests?: string[] | null
          feed_interests_at?: string | null
          freelance_field?: string | null
          frozen_at?: string | null
          frozen_reason?: string | null
          hourly_rate_min?: number | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          kyc_expires_at?: string | null
          kyc_verified_at?: string | null
          last_active_at?: string | null
          legal_name?: string | null
          line_id?: string | null
          line_linked_at?: string | null
          line_messaging_user_id?: string | null
          line_notify_enabled?: boolean | null
          line_notify_prefs?: Json | null
          locale?: string | null
          location?: string | null
          logo_url?: string | null
          notify_collab?: boolean
          notify_email?: boolean | null
          notify_hire?: boolean | null
          notify_job_match?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_data?: Json | null
          onboarding_visits?: Json | null
          open_for_work?: boolean
          open_for_work_badge?: string | null
          opportunity_note?: string | null
          opportunity_status?: string
          opportunity_types?: string[]
          payment_qr_url?: string | null
          persona?: string | null
          phone?: string | null
          preferred_categories?: string[] | null
          preferred_employment_types?: string[] | null
          profile_address?: Json
          profile_faq?: Json | null
          profile_onboarding_at?: string | null
          project_rate_note?: string | null
          purge_after?: string | null
          purged_at?: string | null
          risk_score?: number | null
          role?: string | null
          signature_url?: string | null
          skills?: string[] | null
          social_link?: string | null
          social_links?: Json
          stripe_client_payments_enabled?: boolean | null
          stripe_connect_account_id?: string | null
          subscription_seats?: number | null
          subscription_tier?: string | null
          tagline?: string | null
          tax_id?: string | null
          terms?: string | null
          tester_applied_at?: string | null
          tester_approved?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          username_changed_at?: string | null
          vat_registered?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
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
        Relationships: []
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
        Relationships: []
      }
      projects: {
        Row: {
          ai_assisted: boolean
          ai_disclosure_note: string
          brand_tone: string | null
          brief: string | null
          client_permission_confirmed: boolean
          content_blocks: Json
          created_at: string
          creator_role: string | null
          default_persona_group_id: string | null
          deliverables: string | null
          description: string | null
          duration_label: string | null
          editor_mode: string
          external_links: Json
          flex_grid_layout: Json
          gallery_display_mode: string
          grid_layout: string
          id: string
          main_goal: string | null
          name: string
          opportunity_note: string | null
          opportunity_types: string[] | null
          outcome_note: string | null
          process_note: string | null
          project_assets: Json
          project_type: string
          status: string
          target_user: string | null
          updated_at: string
          user_id: string
          video_urls: string[]
        }
        Insert: {
          ai_assisted?: boolean
          ai_disclosure_note?: string
          brand_tone?: string | null
          brief?: string | null
          client_permission_confirmed?: boolean
          content_blocks?: Json
          created_at?: string
          creator_role?: string | null
          default_persona_group_id?: string | null
          deliverables?: string | null
          description?: string | null
          duration_label?: string | null
          editor_mode?: string
          external_links?: Json
          flex_grid_layout?: Json
          gallery_display_mode?: string
          grid_layout?: string
          id?: string
          main_goal?: string | null
          name: string
          opportunity_note?: string | null
          opportunity_types?: string[] | null
          outcome_note?: string | null
          process_note?: string | null
          project_assets?: Json
          project_type: string
          status?: string
          target_user?: string | null
          updated_at?: string
          user_id: string
          video_urls?: string[]
        }
        Update: {
          ai_assisted?: boolean
          ai_disclosure_note?: string
          brand_tone?: string | null
          brief?: string | null
          client_permission_confirmed?: boolean
          content_blocks?: Json
          created_at?: string
          creator_role?: string | null
          default_persona_group_id?: string | null
          deliverables?: string | null
          description?: string | null
          duration_label?: string | null
          editor_mode?: string
          external_links?: Json
          flex_grid_layout?: Json
          gallery_display_mode?: string
          grid_layout?: string
          id?: string
          main_goal?: string | null
          name?: string
          opportunity_note?: string | null
          opportunity_types?: string[] | null
          outcome_note?: string | null
          process_note?: string | null
          project_assets?: Json
          project_type?: string
          status?: string
          target_user?: string | null
          updated_at?: string
          user_id?: string
          video_urls?: string[]
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
      review_rounds: {
        Row: {
          accessibility_notes: Json | null
          conversion_notes: Json | null
          created_at: string
          device_type: string
          final_recommendation: string | null
          first_impression: string | null
          grade: string | null
          id: string
          main_risks: Json | null
          page_type: string
          persona_id: string | null
          persona_simulation: Json | null
          persona_snapshot: Json | null
          project_id: string
          quick_wins: Json | null
          review_quality: string
          round_number: number
          screenshot_url: string | null
          source_type: string
          source_url: string | null
          specific_goal: string | null
          status: string
          summary: string | null
          test_type: string
          top_priority_fixes: Json | null
          user_id: string
          ux_score: number | null
          what_works_well: Json | null
        }
        Insert: {
          accessibility_notes?: Json | null
          conversion_notes?: Json | null
          created_at?: string
          device_type: string
          final_recommendation?: string | null
          first_impression?: string | null
          grade?: string | null
          id?: string
          main_risks?: Json | null
          page_type: string
          persona_id?: string | null
          persona_simulation?: Json | null
          persona_snapshot?: Json | null
          project_id: string
          quick_wins?: Json | null
          review_quality?: string
          round_number: number
          screenshot_url?: string | null
          source_type: string
          source_url?: string | null
          specific_goal?: string | null
          status?: string
          summary?: string | null
          test_type: string
          top_priority_fixes?: Json | null
          user_id: string
          ux_score?: number | null
          what_works_well?: Json | null
        }
        Update: {
          accessibility_notes?: Json | null
          conversion_notes?: Json | null
          created_at?: string
          device_type?: string
          final_recommendation?: string | null
          first_impression?: string | null
          grade?: string | null
          id?: string
          main_risks?: Json | null
          page_type?: string
          persona_id?: string | null
          persona_simulation?: Json | null
          persona_snapshot?: Json | null
          project_id?: string
          quick_wins?: Json | null
          review_quality?: string
          round_number?: number
          screenshot_url?: string | null
          source_type?: string
          source_url?: string | null
          specific_goal?: string | null
          status?: string
          summary?: string | null
          test_type?: string
          top_priority_fixes?: Json | null
          user_id?: string
          ux_score?: number | null
          what_works_well?: Json | null
        }
        Relationships: []
      }
      round_comparisons: {
        Row: {
          ai_summary: string | null
          attention_score_change: number | null
          created_at: string
          cta_visibility_score_change: number | null
          fixed_issues_count: number | null
          from_round_id: string
          id: string
          ignored_issues_count: number | null
          new_issues_count: number | null
          project_id: string
          remaining_issues_count: number | null
          score_change: number | null
          to_round_id: string
          visual_clutter_score_change: number | null
        }
        Insert: {
          ai_summary?: string | null
          attention_score_change?: number | null
          created_at?: string
          cta_visibility_score_change?: number | null
          fixed_issues_count?: number | null
          from_round_id: string
          id?: string
          ignored_issues_count?: number | null
          new_issues_count?: number | null
          project_id: string
          remaining_issues_count?: number | null
          score_change?: number | null
          to_round_id: string
          visual_clutter_score_change?: number | null
        }
        Update: {
          ai_summary?: string | null
          attention_score_change?: number | null
          created_at?: string
          cta_visibility_score_change?: number | null
          fixed_issues_count?: number | null
          from_round_id?: string
          id?: string
          ignored_issues_count?: number | null
          new_issues_count?: number | null
          project_id?: string
          remaining_issues_count?: number | null
          score_change?: number | null
          to_round_id?: string
          visual_clutter_score_change?: number | null
        }
        Relationships: []
      }
      saved_clients: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          industry: string | null
          line_id: string | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          preferred_channel: string | null
          rate: number | null
          social: string | null
          tags: string[]
          tax_id: string | null
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          line_id?: string | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          preferred_channel?: string | null
          rate?: number | null
          social?: string | null
          tags?: string[]
          tax_id?: string | null
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          line_id?: string | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          preferred_channel?: string | null
          rate?: number | null
          social?: string | null
          tags?: string[]
          tax_id?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      search_daily: {
        Row: {
          day: string
          query_text: string
          relaxed: number
          searches: number
          zero_results: number
        }
        Insert: {
          day: string
          query_text: string
          relaxed?: number
          searches?: number
          zero_results?: number
        }
        Update: {
          day?: string
          query_text?: string
          relaxed?: number
          searches?: number
          zero_results?: number
        }
        Relationships: []
      }
      search_events: {
        Row: {
          created_at: string
          id: number
          lang_mix: string | null
          parsed: Json | null
          query_text: string
          relaxed: boolean
          result_count: number | null
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          lang_mix?: string | null
          parsed?: Json | null
          query_text: string
          relaxed?: boolean
          result_count?: number | null
          session_id: string
        }
        Update: {
          created_at?: string
          id?: never
          lang_mix?: string | null
          parsed?: Json | null
          query_text?: string
          relaxed?: boolean
          result_count?: number | null
          session_id?: string
        }
        Relationships: []
      }
      seed_targets: {
        Row: {
          category: string
          created_at: string
          cursor: number
          enabled: boolean
          exhausted: boolean
          last_run_at: string | null
          query: string
          scanned_count: number
          skipped_count: number
          source: string
          target_count: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          cursor?: number
          enabled?: boolean
          exhausted?: boolean
          last_run_at?: string | null
          query: string
          scanned_count?: number
          skipped_count?: number
          source: string
          target_count: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          cursor?: number
          enabled?: boolean
          exhausted?: boolean
          last_run_at?: string | null
          query?: string
          scanned_count?: number
          skipped_count?: number
          source?: string
          target_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      seeder_control: {
        Row: {
          budget_month: string | null
          id: boolean
          kill_switch: boolean
          month_spend_usd: number
          monthly_budget_usd: number
          paused: boolean
          updated_at: string
        }
        Insert: {
          budget_month?: string | null
          id?: boolean
          kill_switch?: boolean
          month_spend_usd?: number
          monthly_budget_usd?: number
          paused?: boolean
          updated_at?: string
        }
        Update: {
          budget_month?: string | null
          id?: boolean
          kill_switch?: boolean
          month_spend_usd?: number
          monthly_budget_usd?: number
          paused?: boolean
          updated_at?: string
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
      synonym_proposals: {
        Row: {
          created_at: string
          id: string
          lang: string
          status: string
          term: string
          term_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lang?: string
          status?: string
          term: string
          term_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lang?: string
          status?: string
          term?: string
          term_id?: string
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
        Relationships: []
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
        Relationships: []
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
      unknown_terms: {
        Row: {
          count: number
          example_queries: string[]
          lang: string
          last_seen: string
          status: string
          suggested_term_id: string | null
          term: string
        }
        Insert: {
          count?: number
          example_queries?: string[]
          lang?: string
          last_seen?: string
          status?: string
          suggested_term_id?: string | null
          term: string
        }
        Update: {
          count?: number
          example_queries?: string[]
          lang?: string
          last_seen?: string
          status?: string
          suggested_term_id?: string | null
          term?: string
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
      user_ai_keys: {
        Row: {
          created_at: string
          encrypted_api_key: string
          id: string
          is_active: boolean
          key_preview: string
          last_test_status: string | null
          last_tested_at: string | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_api_key: string
          id?: string
          is_active?: boolean
          key_preview: string
          last_test_status?: string | null
          last_tested_at?: string | null
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_api_key?: string
          id?: string
          is_active?: boolean
          key_preview?: string
          last_test_status?: string | null
          last_tested_at?: string | null
          provider?: string
          updated_at?: string
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
      user_ai_settings: {
        Row: {
          ai_usage_mode: string
          created_at: string
          default_provider: string
          default_review_quality: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_usage_mode?: string
          created_at?: string
          default_provider?: string
          default_review_quality?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_usage_mode?: string
          created_at?: string
          default_provider?: string
          default_review_quality?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_ai_usage: {
        Row: {
          count: number
          month: string
          user_id: string
        }
        Insert: {
          count?: number
          month: string
          user_id: string
        }
        Update: {
          count?: number
          month?: string
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
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string | null
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
        Relationships: []
      }
      vault_admin_log: {
        Row: {
          action: string
          admin_email: string
          created_at: string
          detail: Json
          id: number
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          admin_email: string
          created_at?: string
          detail?: Json
          id?: never
          target_id?: string
          target_type?: string
        }
        Update: {
          action?: string
          admin_email?: string
          created_at?: string
          detail?: Json
          id?: never
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      vault_board_objects: {
        Row: {
          board_id: string
          colors: string[]
          created_at: string
          h: number
          id: string
          item_id: string | null
          kind: string
          rotation: number
          sort_order: number
          style: Json
          text_content: string | null
          updated_at: string
          user_id: string
          w: number
          x: number
          y: number
          z_index: number
        }
        Insert: {
          board_id: string
          colors?: string[]
          created_at?: string
          h?: number
          id?: string
          item_id?: string | null
          kind: string
          rotation?: number
          sort_order?: number
          style?: Json
          text_content?: string | null
          updated_at?: string
          user_id: string
          w?: number
          x?: number
          y?: number
          z_index?: number
        }
        Update: {
          board_id?: string
          colors?: string[]
          created_at?: string
          h?: number
          id?: string
          item_id?: string | null
          kind?: string
          rotation?: number
          sort_order?: number
          style?: Json
          text_content?: string | null
          updated_at?: string
          user_id?: string
          w?: number
          x?: number
          y?: number
          z_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "vault_board_objects_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "vault_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_board_objects_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "vault_items"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_board_shares: {
        Row: {
          board_id: string
          created_at: string
          enabled: boolean
          expires_at: string | null
          id: string
          token: string
          user_id: string
        }
        Insert: {
          board_id: string
          created_at?: string
          enabled?: boolean
          expires_at?: string | null
          id?: string
          token?: string
          user_id: string
        }
        Update: {
          board_id?: string
          created_at?: string
          enabled?: boolean
          expires_at?: string | null
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_board_shares_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "vault_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_boards: {
        Row: {
          background: string
          client_key: string | null
          created_at: string
          gap: number
          grid_preset: string
          height: number
          id: string
          layout_mode: string
          name: string
          objects_snapshot: Json
          padding: number
          project_id: string | null
          share_enabled: boolean
          share_token: string | null
          updated_at: string
          user_id: string
          version: number
          visibility: string
          width: number
        }
        Insert: {
          background?: string
          client_key?: string | null
          created_at?: string
          gap?: number
          grid_preset?: string
          height?: number
          id?: string
          layout_mode?: string
          name?: string
          objects_snapshot?: Json
          padding?: number
          project_id?: string | null
          share_enabled?: boolean
          share_token?: string | null
          updated_at?: string
          user_id: string
          version?: number
          visibility?: string
          width?: number
        }
        Update: {
          background?: string
          client_key?: string | null
          created_at?: string
          gap?: number
          grid_preset?: string
          height?: number
          id?: string
          layout_mode?: string
          name?: string
          objects_snapshot?: Json
          padding?: number
          project_id?: string | null
          share_enabled?: boolean
          share_token?: string | null
          updated_at?: string
          user_id?: string
          version?: number
          visibility?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "vault_boards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vault_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_collection_items: {
        Row: {
          collection_id: string
          created_at: string
          item_id: string
          position: number
          user_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          item_id: string
          position?: number
          user_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          item_id?: string
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "vault_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_collection_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "vault_items"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_collections: {
        Row: {
          client_key: string | null
          created_at: string
          id: string
          metadata: Json
          name: string
          system: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          client_key?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          system?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          client_key?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          system?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vault_extension_captures: {
        Row: {
          bearer_hash: string | null
          created_at: string
          dedupe_keys: string[]
          id: string
          item: Json
          object_id: string
          payload: Json | null
          user_id: string | null
        }
        Insert: {
          bearer_hash?: string | null
          created_at?: string
          dedupe_keys?: string[]
          id?: string
          item: Json
          object_id: string
          payload?: Json | null
          user_id?: string | null
        }
        Update: {
          bearer_hash?: string | null
          created_at?: string
          dedupe_keys?: string[]
          id?: string
          item?: Json
          object_id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      vault_extension_collections: {
        Row: {
          bearer_hash: string
          client_key: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bearer_hash: string
          client_key: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bearer_hash?: string
          client_key?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      vault_feedback: {
        Row: {
          admin_note: string
          created_at: string
          feature: string
          id: string
          message: string
          rating: number
          status: string
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          admin_note?: string
          created_at?: string
          feature?: string
          id?: string
          message?: string
          rating: number
          status?: string
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          admin_note?: string
          created_at?: string
          feature?: string
          id?: string
          message?: string
          rating?: number
          status?: string
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      vault_item_analysis: {
        Row: {
          colors: string[]
          created_at: string
          error: string | null
          item_id: string
          ocr_text: string | null
          summary: string | null
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          colors?: string[]
          created_at?: string
          error?: string | null
          item_id: string
          ocr_text?: string | null
          summary?: string | null
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          colors?: string[]
          created_at?: string
          error?: string | null
          item_id?: string
          ocr_text?: string | null
          summary?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_item_analysis_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "vault_items"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_items: {
        Row: {
          asset_path: string | null
          asset_url: string | null
          capture_context: Json
          client_payload: Json
          created_at: string
          deleted_at: string | null
          id: string
          note: string | null
          pinned_at: string | null
          preview_url: string | null
          source_url: string | null
          status: string
          thumbnail_path: string | null
          thumbnail_url: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_path?: string | null
          asset_url?: string | null
          capture_context?: Json
          client_payload?: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          note?: string | null
          pinned_at?: string | null
          preview_url?: string | null
          source_url?: string | null
          status?: string
          thumbnail_path?: string | null
          thumbnail_url?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_path?: string | null
          asset_url?: string | null
          capture_context?: Json
          client_payload?: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          note?: string | null
          pinned_at?: string | null
          preview_url?: string | null
          source_url?: string | null
          status?: string
          thumbnail_path?: string | null
          thumbnail_url?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vault_plans: {
        Row: {
          id: string
          max_boards: number
          max_items: number
          max_shares: number
          max_storage_mb: number
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          id: string
          max_boards?: number
          max_items?: number
          max_shares?: number
          max_storage_mb?: number
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          id?: string
          max_boards?: number
          max_items?: number
          max_shares?: number
          max_storage_mb?: number
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      vault_projects: {
        Row: {
          client_key: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_key?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_key?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vault_user_admin: {
        Row: {
          note: string
          plan_id: string
          suspended: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          note?: string
          plan_id?: string
          suspended?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          note?: string
          plan_id?: string
          suspended?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_user_admin_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "vault_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_waitlist: {
        Row: {
          consent: boolean
          created_at: string
          email: string
          id: string
          source: string
        }
        Insert: {
          consent?: boolean
          created_at?: string
          email: string
          id?: string
          source?: string
        }
        Update: {
          consent?: boolean
          created_at?: string
          email?: string
          id?: string
          source?: string
        }
        Relationships: []
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
        Relationships: []
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
      wunwun_meta: {
        Row: {
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          payload?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wunwun_notes: {
        Row: {
          deleted_at: string | null
          id: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          deleted_at?: string | null
          id: string
          payload?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          deleted_at?: string | null
          id?: string
          payload?: Json
          updated_at?: string
          user_id?: string
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
      profiles_public: {
        Row: {
          availability_status: string | null
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          created_at: string | null
          cv: Json | null
          cv_photo_url: string | null
          daily_rate_min: number | null
          display_name: string | null
          experience: Json | null
          facebook: string | null
          hourly_rate_min: number | null
          id: string | null
          instagram: string | null
          is_verified: boolean | null
          last_active_at: string | null
          line_id: string | null
          location: string | null
          open_for_work: boolean | null
          open_for_work_badge: string | null
          opportunity_note: string | null
          opportunity_status: string | null
          opportunity_types: string[] | null
          preferred_categories: string[] | null
          profile_address: Json | null
          project_rate_note: string | null
          role: string | null
          skills: string[] | null
          social_links: Json | null
          updated_at: string | null
          user_id: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          availability_status?: string | null
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string | null
          cv?: Json | null
          cv_photo_url?: string | null
          daily_rate_min?: number | null
          display_name?: string | null
          experience?: Json | null
          facebook?: string | null
          hourly_rate_min?: number | null
          id?: string | null
          instagram?: string | null
          is_verified?: boolean | null
          last_active_at?: string | null
          line_id?: string | null
          location?: string | null
          open_for_work?: boolean | null
          open_for_work_badge?: string | null
          opportunity_note?: string | null
          opportunity_status?: string | null
          opportunity_types?: string[] | null
          preferred_categories?: string[] | null
          profile_address?: Json | null
          project_rate_note?: string | null
          role?: string | null
          skills?: string[] | null
          social_links?: Json | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          availability_status?: string | null
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string | null
          cv?: Json | null
          cv_photo_url?: string | null
          daily_rate_min?: number | null
          display_name?: string | null
          experience?: Json | null
          facebook?: string | null
          hourly_rate_min?: number | null
          id?: string | null
          instagram?: string | null
          is_verified?: boolean | null
          last_active_at?: string | null
          line_id?: string | null
          location?: string | null
          open_for_work?: boolean | null
          open_for_work_badge?: string | null
          opportunity_note?: string | null
          opportunity_status?: string | null
          opportunity_types?: string[] | null
          preferred_categories?: string[] | null
          profile_address?: Json | null
          project_rate_note?: string | null
          role?: string | null
          skills?: string[] | null
          social_links?: Json | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          website?: string | null
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
      _security_defense_probe_lab: {
        Args: never
        Returns: {
          detail: string
          passed: boolean
          probe: string
        }[]
      }
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
      accept_forum_reply: { Args: { _reply_id: string }; Returns: undefined }
      accept_inhouse_invite: { Args: { _token: string }; Returns: string }
      activate_post_boost_stripe: {
        Args: {
          _boost_id: string
          _environment?: string
          _paid_amount_thb?: number
          _price_id?: string
          _stripe_session_id: string
        }
        Returns: unknown
        SetofOptions: {
          from: "*"
          to: "post_boosts"
          isOneToOne: true
          isSetofReturn: false
        }
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
      add_group_conversation_members: {
        Args: { p_conversation_id: string; p_member_ids: string[] }
        Returns: number
      }
      admin_analytics_overview: { Args: { _days?: number }; Returns: Json }
      admin_apply_moderation: {
        Args: {
          p_action: string
          p_days?: number
          p_note?: string
          p_user_id: string
        }
        Returns: Json
      }
      admin_approve_kyc: {
        Args: { _note?: string; _request_id: string }
        Returns: unknown
        SetofOptions: {
          from: "*"
          to: "kyc_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_content_insights: { Args: { _days?: number }; Returns: Json }
      admin_create_forum_announcement: {
        Args: {
          _body: string
          _lock_comments?: boolean
          _tags?: string[]
          _title: string
        }
        Returns: string
      }
      admin_delete_collection: { Args: { _id: string }; Returns: undefined }
      admin_delete_comment: { Args: { _id: string }; Returns: undefined }
      admin_delete_creator_object: { Args: { _id: string }; Returns: undefined }
      admin_delete_creator_service: {
        Args: { _id: string }
        Returns: undefined
      }
      admin_delete_project: { Args: { _id: string }; Returns: undefined }
      admin_dispute_escrow: {
        Args: { _action: string; _escrow_id: string; _note?: string }
        Returns: unknown
        SetofOptions: {
          from: "*"
          to: "marketplace_escrows"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_ecosystem_funnel: { Args: { _days?: number }; Returns: Json }
      admin_ecosystem_ops_stats: { Args: never; Returns: Json }
      admin_export_data_pack: {
        Args: { _days?: number; _limit?: number; _pack?: string }
        Returns: Json
      }
      admin_list_escrows: {
        Args: { _limit?: number }
        Returns: unknown[]
        SetofOptions: {
          from: "*"
          to: "marketplace_escrows"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_kyc_documents: {
        Args: { _request_id: string }
        Returns: {
          doc_type: string
          storage_path: string
        }[]
      }
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
          brand_name: string
          created_at: string
          deactivated_at: string
          display_name: string
          email: string
          id: string
          is_active: boolean
          last_active_at: string
          purge_after: string
          tester_applied_at: string
          tester_approved: boolean
          user_id: string
        }[]
      }
      admin_log_kyc_access: {
        Args: { _event: string; _metadata?: Json; _request_id: string }
        Returns: undefined
      }
      admin_page_dwell_insights: { Args: { _days?: number }; Returns: Json }
      admin_reject_kyc: {
        Args: {
          _note?: string
          _reason_codes?: string[]
          _reason_labels?: string[]
          _request_id: string
        }
        Returns: unknown
        SetofOptions: {
          from: "*"
          to: "kyc_requests"
          isOneToOne: true
          isSetofReturn: false
        }
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
      admin_set_creator_object_status: {
        Args: { _id: string; _status: string }
        Returns: undefined
      }
      admin_set_creator_service_status: {
        Args: { _id: string; _status: string }
        Returns: undefined
      }
      admin_set_forum_category: {
        Args: {
          _category_id: string
          _description?: string
          _is_active?: boolean
          _name_th?: string
          _sort_order?: number
        }
        Returns: undefined
      }
      admin_set_forum_rank: {
        Args: { _note?: string; _rank?: string; _user_id: string }
        Returns: undefined
      }
      admin_set_forum_topic:
        | {
            Args: {
              _is_locked?: boolean
              _moderation_state?: string
              _status?: string
              _topic_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              _is_locked?: boolean
              _is_pinned?: boolean
              _moderation_state?: string
              _status?: string
              _topic_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              _admin_note?: string
              _is_locked?: boolean
              _is_pinned?: boolean
              _moderation_state?: string
              _status?: string
              _topic_id: string
            }
            Returns: undefined
          }
      admin_set_project_status: {
        Args: { _id: string; _status: string }
        Returns: undefined
      }
      admin_sso_metrics: { Args: never; Returns: Json }
      admin_triage_snapshot: { Args: never; Returns: Json }
      admin_update_forum_announcement: {
        Args: {
          _body: string
          _lock_comments?: boolean
          _tags?: string[]
          _title: string
          _topic_id: string
        }
        Returns: undefined
      }
      admin_user_360: { Args: { _user_id: string }; Returns: Json }
      anthem_chat_path_readable: { Args: { _path: string }; Returns: boolean }
      assert_connect_payouts_ready: {
        Args: { _user_id: string }
        Returns: undefined
      }
      assert_launch_payments_enabled: { Args: never; Returns: undefined }
      assert_org_seat_available: {
        Args: { _org_id: string }
        Returns: undefined
      }
      assign_my_default_avatar: { Args: never; Returns: undefined }
      auto_update_invoice_statuses: { Args: never; Returns: number }
      available_gift_px: { Args: { _uid: string }; Returns: number }
      available_purchased_px: { Args: { _uid: string }; Returns: number }
      bangkok_today: { Args: never; Returns: string }
      bump_forum_topic_view: { Args: { _topic_id: string }; Returns: undefined }
      can_review_job_post: {
        Args: { p_job_id: string; p_user_id: string }
        Returns: boolean
      }
      chat_last_messages: {
        Args: { conv_ids: string[] }
        Returns: {
          attachment_url: string
          content: string
          conversation_id: string
          created_at: string
          deleted_at: string
          message_type: string
          sender_id: string
        }[]
      }
      chat_unread_count: { Args: never; Returns: number }
      check_and_increment_ai_usage: {
        Args: { _feature: string; _limit: number; _user_id: string }
        Returns: Json
      }
      check_portfolio_slug_available: {
        Args: { _slug: string; _user_id?: string }
        Returns: boolean
      }
      check_user_can_post: { Args: never; Returns: Json }
      claim_daily_px: { Args: never; Returns: Json }
      claim_design_drill_reroll: {
        Args: { _daily_limit?: number; _user_id: string }
        Returns: Json
      }
      claim_meeting_free_slot: { Args: { _user_id: string }; Returns: Json }
      claim_welcome_mission: { Args: { _mission_id: string }; Returns: Json }
      client_approve_escrow: {
        Args: { _portal_token: string }
        Returns: unknown
        SetofOptions: {
          from: "*"
          to: "marketplace_escrows"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      client_dispute_escrow: {
        Args: { _portal_token: string; _reason?: string }
        Returns: unknown
        SetofOptions: {
          from: "*"
          to: "marketplace_escrows"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_brief_by_token: {
        Args: { _name: string; _signature: string; _token: string }
        Returns: boolean
      }
      consent_current: {
        Args: never
        Returns: {
          created_at: string
          granted: boolean
          policy_version: string
          purpose: string
        }[]
      }
      consent_granted: {
        Args: { p_purpose: string; p_user: string }
        Returns: boolean
      }
      create_escrow_from_hire: {
        Args: { _hiring_request_id: string }
        Returns: unknown
        SetofOptions: {
          from: "*"
          to: "marketplace_escrows"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_escrow_from_quotation: {
        Args: { _amount_thb?: number; _quotation_id: string }
        Returns: unknown
        SetofOptions: {
          from: "*"
          to: "marketplace_escrows"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_forum_reply: {
        Args: { _body: string; _parent_id?: string; _topic_id: string }
        Returns: string
      }
      create_forum_topic: {
        Args: {
          _body: string
          _category_slug: string
          _tags?: string[]
          _title: string
        }
        Returns: string
      }
      create_group_conversation:
        | { Args: { p_member_ids: string[]; p_title: string }; Returns: string }
        | {
            Args: {
              p_group_tag?: string
              p_member_ids: string[]
              p_title: string
            }
            Returns: string
          }
      create_inhouse_org: {
        Args: { _name: string; _workspace_name?: string }
        Returns: string
      }
      create_post_boost: {
        Args: { _package: string; _target_id: string; _target_type: string }
        Returns: unknown
        SetofOptions: {
          from: "*"
          to: "post_boosts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_post_boost_custom: {
        Args: {
          _amount_thb: number
          _duration_days: number
          _target_id: string
          _target_type: string
        }
        Returns: unknown
        SetofOptions: {
          from: "*"
          to: "post_boosts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_report: {
        Args: {
          _details?: string
          _evidence_files?: Json
          _evidence_urls?: string[]
          _reason: string
          _target_id: string
          _target_owner_id: string
          _target_type: string
        }
        Returns: string
      }
      creator_withdraw: { Args: { p_id: string }; Returns: undefined }
      daily_px_claim_status: { Args: never; Returns: Json }
      daily_px_streak: {
        Args: { _anchor: string; _uid: string }
        Returns: number
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
      decide_job_application: {
        Args: {
          p_application_id: string
          p_decision: string
          p_note?: string
          p_reason?: string
        }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      digest_set_opt_in: { Args: { p_on: boolean }; Returns: undefined }
      digest_unsubscribe: { Args: { p_user: string }; Returns: undefined }
      discover_category_progress: {
        Args: never
        Returns: {
          category: string
          pending: number
          published: number
          rejected: number
          target_count: number
        }[]
      }
      discover_find_similar: {
        Args: { p_max_distance?: number; p_phash: unknown }
        Returns: {
          distance: number
          id: string
        }[]
      }
      discover_inherit_tags: {
        Args: { p_max_distance?: number; p_phash: unknown }
        Returns: {
          distance: number
          id: string
          palette: Json
          tags_ids: string[]
        }[]
      }
      discover_reject_summary: {
        Args: never
        Returns: {
          reject_reason: string
          source: string
          total: number
        }[]
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
      expire_pending_job_applications: { Args: never; Returns: number }
      expire_post_boosts: { Args: never; Returns: number }
      finalize_expired_collab_end_requests: { Args: never; Returns: number }
      finalize_expired_hire_cancel_requests: { Args: never; Returns: number }
      find_or_create_studio_chat: {
        Args: { p_studio_id: string }
        Returns: string
      }
      follow_summary: {
        Args: { ids: string[] }
        Returns: {
          followers: number
          following: number
          is_following: boolean
          user_id: string
        }[]
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
      fulfill_escrow_payment_stripe: {
        Args: {
          _environment?: string
          _escrow_id: string
          _payment_intent_id?: string
          _stripe_session_id: string
        }
        Returns: unknown
        SetofOptions: {
          from: "*"
          to: "marketplace_escrows"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      gen_tracking_code: { Args: never; Returns: string }
      get_active_boosts: {
        Args: { _limit?: number }
        Returns: {
          boost_id: string
          end_at: string
          target_id: string
          target_type: string
        }[]
      }
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
      get_escrow_by_portal_token: {
        Args: { _portal_token: string }
        Returns: unknown
        SetofOptions: {
          from: "*"
          to: "marketplace_escrows"
          isOneToOne: true
          isSetofReturn: false
        }
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
      get_my_profile_sensitive: { Args: never; Returns: Json }
      get_my_wallet: { Args: never; Returns: Json }
      get_or_create_referral_code: { Args: never; Returns: string }
      get_referral_dashboard: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      image_is_blocked: {
        Args: { p_max?: number; p_phash: unknown; p_sha: string }
        Returns: boolean
      }
      increment_project_view: {
        Args: { _project_id: string }
        Returns: undefined
      }
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
      insert_community_comment: {
        Args: {
          _content: string
          _depth?: number
          _image_urls?: string[]
          _parent_id?: string
          _post_id: string
        }
        Returns: string
      }
      is_admin_user: { Args: never; Returns: boolean }
      is_hiring_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_studio_admin:
        | { Args: { _studio_id: string; _user_id: string }; Returns: boolean }
        | { Args: { p_studio_id: string }; Returns: boolean }
      is_studio_member: {
        Args: { _studio_id: string; _user_id: string }
        Returns: boolean
      }
      is_vault_super_admin: { Args: never; Returns: boolean }
      item_behavior: {
        Args: { p_days?: number }
        Returns: {
          impressions: number
          item_id: string
          last_at: string
          opens: number
          saves: number
        }[]
      }
      job_application_reason_copy: {
        Args: { p_note: string; p_reason: string }
        Returns: string
      }
      kuy_delete_business_data: {
        Args: { _business_id: string }
        Returns: undefined
      }
      kuy_log_export: {
        Args: {
          _business_id: string
          _compliance_confirmed: boolean
          _export_format: string
          _metadata?: Json
          _report_type: string
          _row_count: number
        }
        Returns: string
      }
      kuy_seed_demo_business: {
        Args: { _business_id: string }
        Returns: undefined
      }
      kyc_ai_score: {
        Args: {
          _account_name: string
          _duplicate_bank: boolean
          _has_id_back: boolean
          _has_id_front: boolean
          _has_selfie: boolean
          _legal_name: string
        }
        Returns: {
          recommendation: string
          risk_score: number
          summary: string
        }[]
      }
      kyc_path_owner_mutable: { Args: { _path: string }; Returns: boolean }
      learning_digest: { Args: { p_days?: number }; Returns: Json }
      link_forum_attachments: {
        Args: {
          _attachment_ids: string[]
          _reply_id?: string
          _topic_id?: string
        }
        Returns: number
      }
      log_admin_audit: {
        Args: {
          _action: string
          _metadata?: Json
          _target_id: string
          _target_type: string
        }
        Returns: undefined
      }
      log_consent: {
        Args: {
          p_granted: boolean
          p_policy_version: string
          p_purpose: string
        }
        Returns: undefined
      }
      log_inhouse_activity: {
        Args: {
          _event_type: string
          _metadata?: Json
          _org_id: string
          _workspace_id: string
        }
        Returns: string
      }
      log_item_signal:
        | {
            Args: { p_item: string; p_tag_ids?: string[]; p_type: string }
            Returns: undefined
          }
        | {
            Args: {
              p_item: string
              p_position: number
              p_search_event: number
              p_tag_ids: string[]
              p_type: string
            }
            Returns: undefined
          }
      log_item_views: {
        Args: { p_ids: string[]; p_search_event?: number }
        Returns: undefined
      }
      log_product_event: {
        Args: {
          _app?: string
          _event_name: string
          _path?: string
          _props?: Json
          _referrer?: string
          _session_id: string
        }
        Returns: string
      }
      log_search_event: {
        Args: {
          p_lang: string
          p_parsed: Json
          p_query: string
          p_relaxed: boolean
          p_results: number
          p_sid: string
        }
        Returns: number
      }
      log_unknown_terms: { Args: { p_terms: Json }; Returns: undefined }
      log_user_activity: { Args: { _activity_type?: string }; Returns: boolean }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      mark_onboarding_visit: { Args: { _visit_id: string }; Returns: undefined }
      marketing_sync_internal_signals: {
        Args: { _business_id: string }
        Returns: number
      }
      maybe_send_chat_auto_reply: {
        Args: { p_conversation_id: string }
        Returns: boolean
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
      normalize_th_name: { Args: { t: string }; Returns: string }
      notify_collab_end_event: {
        Args: {
          p_body: string
          p_collab_id: string
          p_end_id: string
          p_link: string
          p_title: string
          p_to_user_id: string
        }
        Returns: string
      }
      notify_hire_cancel_event: {
        Args: {
          p_body: string
          p_cancel_id: string
          p_hire_id: string
          p_link: string
          p_title: string
          p_to_user_id: string
        }
        Returns: string
      }
      notify_hire_forwarded: {
        Args: {
          p_new_request_id: string
          p_note?: string
          p_project_title?: string
          p_to_user_id: string
        }
        Returns: string
      }
      notify_job_application_event: {
        Args: {
          p_application_id: string
          p_body: string
          p_job_id: string
          p_kind?: string
          p_link: string
          p_title: string
          p_to_user_id: string
        }
        Returns: string
      }
      notify_kyc_user: {
        Args: {
          _body: string
          _kind: string
          _link?: string
          _title: string
          _user_id: string
        }
        Returns: undefined
      }
      open_job_application_chat: {
        Args: { p_application_id: string }
        Returns: string
      }
      ops_log_event: {
        Args: { p_detail?: Json; p_kind: string; p_severity?: string }
        Returns: undefined
      }
      ops_run_retention: { Args: never; Returns: Json }
      pick_avatar_pool_url_by_seed: { Args: { _seed: string }; Returns: string }
      project_like_summary: {
        Args: { ids: string[] }
        Returns: {
          liked: boolean
          likes: number
          project_id: string
        }[]
      }
      public_feed_stats: { Args: never; Returns: Json }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          enqueued_at: string
          message: Json
          msg_id: number
          read_ct: number
          vt: string
        }[]
      }
      recommend_from_likes: {
        Args: { _limit?: number; _user_id: string }
        Returns: {
          id: string
        }[]
      }
      record_community_engagement_milestone: {
        Args: { _kind: string; _metadata?: Json; _post_id: string }
        Returns: undefined
      }
      reject_pending_job_applications_for_job: {
        Args: { p_job_id: string; p_reason?: string }
        Returns: number
      }
      repair_pending_daily_px_credits: {
        Args: { _uid: string }
        Returns: undefined
      }
      repair_stale_daily_px_today: {
        Args: { _today: string; _uid: string }
        Returns: undefined
      }
      respond_project_collab_invite: {
        Args: { _accept: boolean; _invite_id: string }
        Returns: undefined
      }
      send_gift: {
        Args: {
          _gift_id: string
          _message?: string
          _project_id?: string
          _recipient_id: string
        }
        Returns: string
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      submit_kyc_verification: {
        Args: {
          _account_name: string
          _account_number: string
          _address_json?: Json
          _bank_name: string
          _contact_email?: string
          _contact_note?: string
          _date_of_birth?: string
          _documents: Json
          _id_type: string
          _legal_name: string
          _national_id_number?: string
          _nationality?: string
          _pep_declaration?: boolean
          _phone?: string
          _sanctions_declaration?: boolean
          _submission_meta?: Json
        }
        Returns: unknown
        SetofOptions: {
          from: "*"
          to: "kyc_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sync_inhouse_org_seat_limit: {
        Args: { _owner_id: string }
        Returns: undefined
      }
      sync_user_tier: { Args: { _user_id: string }; Returns: undefined }
      touch_last_active: { Args: never; Returns: undefined }
      update_group_conversation_settings: {
        Args: {
          p_clear_group_tag?: boolean
          p_conversation_id: string
          p_group_tag?: string
          p_title?: string
        }
        Returns: undefined
      }
      vault_admin_activity: { Args: { p_days?: number }; Returns: Json }
      vault_admin_attention: { Args: never; Returns: Json }
      vault_admin_list_audit: { Args: { p_limit?: number }; Returns: Json }
      vault_admin_list_captures: { Args: { p_limit?: number }; Returns: Json }
      vault_admin_list_feedback: { Args: { p_limit?: number }; Returns: Json }
      vault_admin_list_feedback_v2: {
        Args: { p_limit?: number; p_status?: string }
        Returns: Json
      }
      vault_admin_list_plans: { Args: never; Returns: Json }
      vault_admin_list_reports: {
        Args: { p_limit?: number; p_status?: string }
        Returns: Json
      }
      vault_admin_list_shares: { Args: { p_limit?: number }; Returns: Json }
      vault_admin_list_users: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string }
        Returns: Json
      }
      vault_admin_log_event: {
        Args: {
          p_action: string
          p_detail?: Json
          p_target_id: string
          p_target_type: string
        }
        Returns: undefined
      }
      vault_admin_log_write: {
        Args: {
          p_action: string
          p_detail?: Json
          p_target_id: string
          p_target_type: string
        }
        Returns: undefined
      }
      vault_admin_overview: { Args: never; Returns: Json }
      vault_admin_purge_captures: {
        Args: { p_older_than_days?: number }
        Returns: Json
      }
      vault_admin_resolve_report: {
        Args: { p_hide_item?: boolean; p_id: string; p_status: string }
        Returns: undefined
      }
      vault_admin_revoke_share: {
        Args: { p_board: string }
        Returns: undefined
      }
      vault_admin_set_feedback: {
        Args: { p_id: string; p_note?: string; p_status: string }
        Returns: undefined
      }
      vault_admin_set_user: {
        Args: {
          p_note?: string
          p_plan: string
          p_suspended: boolean
          p_user: string
        }
        Returns: undefined
      }
      vault_admin_source_health: { Args: never; Returns: Json }
      vault_admin_update_plan: {
        Args: {
          p_boards: number
          p_id: string
          p_items: number
          p_shares: number
          p_storage_mb: number
        }
        Returns: undefined
      }
      vault_waitlist_count: { Args: never; Returns: number }
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
      app_notification_app: "anthem" | "so1o" | "shared"
      app_role: "admin" | "user"
      collab_status:
        | "pending"
        | "interested"
        | "passed"
        | "archived"
        | "accepted"
        | "declined"
        | "cancelled"
        | "completed"
      hire_budget: "1k-5k" | "5k-20k" | "20k-50k" | "50k+"
      hire_status:
        | "ใหม่"
        | "ที่ต้องตอบ"
        | "ติดต่อแล้ว"
        | "ปิดแล้ว"
        | "ตอบรับ"
        | "ปฏิเสธ"
        | "ยกเลิก"
      inhouse_member_role: "owner" | "admin" | "member" | "viewer"
      inhouse_member_status: "invited" | "active" | "removed"
      job_application_status:
        | "pending"
        | "shortlisted"
        | "rejected"
        | "accepted"
        | "contacted"
        | "hired"
      job_budget_type: "fixed" | "hourly" | "monthly"
      job_location_type: "remote" | "onsite" | "hybrid"
      job_status: "open" | "closed" | "filled"
      myport_page_status: "draft" | "published"
      studio_formation_status: "pending" | "completed" | "cancelled"
      studio_invite_status: "pending" | "accepted" | "declined"
      studio_member_role: "owner" | "admin" | "member" | "hiring_manager"
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
      app_notification_app: ["anthem", "so1o", "shared"],
      app_role: ["admin", "user"],
      collab_status: [
        "pending",
        "interested",
        "passed",
        "archived",
        "accepted",
        "declined",
        "cancelled",
        "completed",
      ],
      hire_budget: ["1k-5k", "5k-20k", "20k-50k", "50k+"],
      hire_status: [
        "ใหม่",
        "ที่ต้องตอบ",
        "ติดต่อแล้ว",
        "ปิดแล้ว",
        "ตอบรับ",
        "ปฏิเสธ",
        "ยกเลิก",
      ],
      inhouse_member_role: ["owner", "admin", "member", "viewer"],
      inhouse_member_status: ["invited", "active", "removed"],
      job_application_status: [
        "pending",
        "shortlisted",
        "rejected",
        "accepted",
        "contacted",
        "hired",
      ],
      job_budget_type: ["fixed", "hourly", "monthly"],
      job_location_type: ["remote", "onsite", "hybrid"],
      job_status: ["open", "closed", "filled"],
      myport_page_status: ["draft", "published"],
      studio_formation_status: ["pending", "completed", "cancelled"],
      studio_invite_status: ["pending", "accepted", "declined"],
      studio_member_role: ["owner", "admin", "member", "hiring_manager"],
    },
  },
} as const
