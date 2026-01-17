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
      chat_settings: {
        Row: {
          auto_assign_mode:
            | Database["public"]["Enums"]["auto_assign_mode"]
            | null
          business_hours: Json | null
          business_hours_enabled: boolean | null
          created_at: string
          id: string
          offline_message: string | null
          sound_enabled: boolean | null
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          auto_assign_mode?:
            | Database["public"]["Enums"]["auto_assign_mode"]
            | null
          business_hours?: Json | null
          business_hours_enabled?: boolean | null
          created_at?: string
          id?: string
          offline_message?: string | null
          sound_enabled?: boolean | null
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          auto_assign_mode?:
            | Database["public"]["Enums"]["auto_assign_mode"]
            | null
          business_hours?: Json | null
          business_hours_enabled?: boolean | null
          created_at?: string
          id?: string
          offline_message?: string | null
          sound_enabled?: boolean | null
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: []
      }
      client_accounts: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          is_primary_contact: boolean
          job_title: string | null
          last_login_at: string | null
          organization_id: string
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          is_primary_contact?: boolean
          job_title?: string | null
          last_login_at?: string | null
          organization_id: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          is_primary_contact?: boolean
          job_title?: string | null
          last_login_at?: string | null
          organization_id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_organizations: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          notes: string | null
          organization_type: Database["public"]["Enums"]["organization_type"]
          registration_number: string | null
          subscription_end_date: string | null
          subscription_plan: string | null
          subscription_start_date: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          notes?: string | null
          organization_type?: Database["public"]["Enums"]["organization_type"]
          registration_number?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          notes?: string | null
          organization_type?: Database["public"]["Enums"]["organization_type"]
          registration_number?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      conversation_events: {
        Row: {
          conversation_id: string
          created_at: string
          data: Json | null
          event_type: string
          id: string
          performed_by: string | null
          performer_name: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          data?: Json | null
          event_type: string
          id?: string
          performed_by?: string | null
          performer_name?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          data?: Json | null
          event_type?: string
          id?: string
          performed_by?: string | null
          performer_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          attachments: string[] | null
          body: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          read_at: string | null
          sender_id: string | null
          sender_name: string | null
          sender_type: string
        }
        Insert: {
          attachments?: string[] | null
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sender_type: string
        }
        Update: {
          attachments?: string[] | null
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          archived_at: string | null
          assigned_agent_id: string | null
          client_account_id: string | null
          closed_at: string | null
          created_at: string
          embed_token_id: string | null
          id: string
          is_starred: boolean | null
          last_message_at: string | null
          last_message_preview: string | null
          metadata: Json | null
          organization_id: string | null
          source: string | null
          source_domain: string | null
          status: Database["public"]["Enums"]["conversation_status"] | null
          subject: string | null
          unread_count: number | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          assigned_agent_id?: string | null
          client_account_id?: string | null
          closed_at?: string | null
          created_at?: string
          embed_token_id?: string | null
          id?: string
          is_starred?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          metadata?: Json | null
          organization_id?: string | null
          source?: string | null
          source_domain?: string | null
          status?: Database["public"]["Enums"]["conversation_status"] | null
          subject?: string | null
          unread_count?: number | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          assigned_agent_id?: string | null
          client_account_id?: string | null
          closed_at?: string | null
          created_at?: string
          embed_token_id?: string | null
          id?: string
          is_starred?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          metadata?: Json | null
          organization_id?: string | null
          source?: string | null
          source_domain?: string | null
          status?: Database["public"]["Enums"]["conversation_status"] | null
          subject?: string | null
          unread_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_client_account_id_fkey"
            columns: ["client_account_id"]
            isOneToOne: false
            referencedRelation: "client_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_embed_token_id_fkey"
            columns: ["embed_token_id"]
            isOneToOne: false
            referencedRelation: "embed_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      docs_article_tags: {
        Row: {
          article_id: string
          tag_id: string
        }
        Insert: {
          article_id: string
          tag_id: string
        }
        Update: {
          article_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "docs_article_tags_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "docs_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "docs_article_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "docs_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      docs_article_versions: {
        Row: {
          article_id: string
          change_summary: string | null
          changed_by: string | null
          content: string | null
          created_at: string
          id: string
          steps: Json | null
          title: string
          version: number
        }
        Insert: {
          article_id: string
          change_summary?: string | null
          changed_by?: string | null
          content?: string | null
          created_at?: string
          id?: string
          steps?: Json | null
          title: string
          version: number
        }
        Update: {
          article_id?: string
          change_summary?: string | null
          changed_by?: string | null
          content?: string | null
          created_at?: string
          id?: string
          steps?: Json | null
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "docs_article_versions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "docs_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      docs_articles: {
        Row: {
          author_id: string | null
          common_errors: Json | null
          content: string | null
          created_at: string
          description: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"] | null
          faqs: Json | null
          id: string
          notes: string[] | null
          objective: string | null
          prerequisites: string[] | null
          published_at: string | null
          related_articles: string[] | null
          reviewer_id: string | null
          slug: string
          sort_order: number | null
          status: Database["public"]["Enums"]["article_status"] | null
          steps: Json | null
          submodule_id: string
          target_roles: string[] | null
          title: string
          updated_at: string
          version: number | null
          views_count: number | null
          warnings: string[] | null
        }
        Insert: {
          author_id?: string | null
          common_errors?: Json | null
          content?: string | null
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          faqs?: Json | null
          id?: string
          notes?: string[] | null
          objective?: string | null
          prerequisites?: string[] | null
          published_at?: string | null
          related_articles?: string[] | null
          reviewer_id?: string | null
          slug: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["article_status"] | null
          steps?: Json | null
          submodule_id: string
          target_roles?: string[] | null
          title: string
          updated_at?: string
          version?: number | null
          views_count?: number | null
          warnings?: string[] | null
        }
        Update: {
          author_id?: string | null
          common_errors?: Json | null
          content?: string | null
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          faqs?: Json | null
          id?: string
          notes?: string[] | null
          objective?: string | null
          prerequisites?: string[] | null
          published_at?: string | null
          related_articles?: string[] | null
          reviewer_id?: string | null
          slug?: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["article_status"] | null
          steps?: Json | null
          submodule_id?: string
          target_roles?: string[] | null
          title?: string
          updated_at?: string
          version?: number | null
          views_count?: number | null
          warnings?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "docs_articles_submodule_id_fkey"
            columns: ["submodule_id"]
            isOneToOne: false
            referencedRelation: "docs_submodules"
            referencedColumns: ["id"]
          },
        ]
      }
      docs_changelog: {
        Row: {
          author_id: string | null
          changes: Json | null
          created_at: string
          description: string | null
          id: string
          impact: string | null
          published_at: string | null
          title: string
          version: string
        }
        Insert: {
          author_id?: string | null
          changes?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          impact?: string | null
          published_at?: string | null
          title: string
          version: string
        }
        Update: {
          author_id?: string | null
          changes?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          impact?: string | null
          published_at?: string | null
          title?: string
          version?: string
        }
        Relationships: []
      }
      docs_feedback: {
        Row: {
          article_id: string
          comment: string | null
          created_at: string
          id: string
          is_helpful: boolean
          reason: string | null
          user_id: string | null
        }
        Insert: {
          article_id: string
          comment?: string | null
          created_at?: string
          id?: string
          is_helpful: boolean
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          article_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          is_helpful?: boolean
          reason?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "docs_feedback_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "docs_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      docs_issue_reports: {
        Row: {
          article_id: string | null
          created_at: string
          description: string
          id: string
          issue_type: string
          reporter_email: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          article_id?: string | null
          created_at?: string
          description: string
          id?: string
          issue_type: string
          reporter_email?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          article_id?: string | null
          created_at?: string
          description?: string
          id?: string
          issue_type?: string
          reporter_email?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "docs_issue_reports_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "docs_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      docs_media: {
        Row: {
          alt_text: string | null
          article_id: string | null
          created_at: string
          filename: string
          id: string
          mime_type: string
          original_name: string
          size_bytes: number | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          alt_text?: string | null
          article_id?: string | null
          created_at?: string
          filename: string
          id?: string
          mime_type: string
          original_name: string
          size_bytes?: number | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          alt_text?: string | null
          article_id?: string | null
          created_at?: string
          filename?: string
          id?: string
          mime_type?: string
          original_name?: string
          size_bytes?: number | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "docs_media_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "docs_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      docs_modules: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_published: boolean | null
          slug: string
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean | null
          slug: string
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean | null
          slug?: string
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      docs_search_logs: {
        Row: {
          created_at: string
          id: string
          query: string
          results_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          results_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          results_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      docs_submodules: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_published: boolean | null
          module_id: string
          slug: string
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean | null
          module_id: string
          slug: string
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean | null
          module_id?: string
          slug?: string
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "docs_submodules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "docs_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      docs_tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      embed_tokens: {
        Row: {
          allowed_domains: string[] | null
          created_at: string
          created_by: string | null
          default_message: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          name: string
          organization_id: string
          primary_color: string | null
          secondary_color: string | null
          token: string
          updated_at: string
          usage_count: number | null
          welcome_message: string | null
        }
        Insert: {
          allowed_domains?: string[] | null
          created_at?: string
          created_by?: string | null
          default_message?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name: string
          organization_id: string
          primary_color?: string | null
          secondary_color?: string | null
          token: string
          updated_at?: string
          usage_count?: number | null
          welcome_message?: string | null
        }
        Update: {
          allowed_domains?: string[] | null
          created_at?: string
          created_by?: string | null
          default_message?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string
          organization_id?: string
          primary_color?: string | null
          secondary_color?: string | null
          token?: string
          updated_at?: string
          usage_count?: number | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "embed_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_settings: {
        Row: {
          created_at: string
          escalation_hours: number
          id: string
          is_active: boolean | null
          notify_admin: boolean | null
          notify_staff: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          escalation_hours?: number
          id?: string
          is_active?: boolean | null
          notify_admin?: boolean | null
          notify_staff?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          escalation_hours?: number
          id?: string
          is_active?: boolean | null
          notify_admin?: boolean | null
          notify_staff?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      meeting_activity_log: {
        Row: {
          action_type: string
          created_at: string
          id: string
          is_staff_action: boolean | null
          meeting_id: string
          new_value: string | null
          note: string | null
          old_value: string | null
          performed_by: string | null
          performed_by_name: string | null
          recommendation: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          is_staff_action?: boolean | null
          meeting_id: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          recommendation?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          is_staff_action?: boolean | null
          meeting_id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          recommendation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_activity_log_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meeting_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          meeting_id: string
          organization_id: string
          rated_by: string | null
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          meeting_id: string
          organization_id: string
          rated_by?: string | null
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          meeting_id?: string
          organization_id?: string
          rated_by?: string | null
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "meeting_ratings_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meeting_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_ratings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_requests: {
        Row: {
          admin_notes: string | null
          alternative_date: string | null
          assigned_staff: string | null
          closure_report: string | null
          confirmed_date: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          meeting_link: string | null
          meeting_outcome: string | null
          meeting_type: string
          organization_id: string
          preferred_date: string
          report_submitted_at: string | null
          requested_by: string | null
          staff_notes: string | null
          staff_recommendation: string | null
          status: Database["public"]["Enums"]["meeting_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          alternative_date?: string | null
          assigned_staff?: string | null
          closure_report?: string | null
          confirmed_date?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          meeting_link?: string | null
          meeting_outcome?: string | null
          meeting_type?: string
          organization_id: string
          preferred_date: string
          report_submitted_at?: string | null
          requested_by?: string | null
          staff_notes?: string | null
          staff_recommendation?: string | null
          status?: Database["public"]["Enums"]["meeting_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          alternative_date?: string | null
          assigned_staff?: string | null
          closure_report?: string | null
          confirmed_date?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          meeting_link?: string | null
          meeting_outcome?: string | null
          meeting_type?: string
          organization_id?: string
          preferred_date?: string
          report_submitted_at?: string | null
          requested_by?: string | null
          staff_notes?: string | null
          staff_recommendation?: string | null
          status?: Database["public"]["Enums"]["meeting_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_requests_assigned_staff_fkey"
            columns: ["assigned_staff"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
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
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      quick_replies: {
        Row: {
          body: string
          created_at: string
          id: string
          is_global: boolean | null
          shortcut: string | null
          staff_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_global?: boolean | null
          shortcut?: string | null
          staff_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_global?: boolean | null
          shortcut?: string | null
          staff_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_replies_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          active_conversations_count: number | null
          agent_status: Database["public"]["Enums"]["agent_status"] | null
          assigned_tickets_count: number | null
          can_attend_meetings: boolean
          can_manage_content: boolean
          can_reply_tickets: boolean
          completed_meetings_count: number | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          job_title: string | null
          last_activity_at: string | null
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active_conversations_count?: number | null
          agent_status?: Database["public"]["Enums"]["agent_status"] | null
          assigned_tickets_count?: number | null
          can_attend_meetings?: boolean
          can_manage_content?: boolean
          can_reply_tickets?: boolean
          completed_meetings_count?: number | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          job_title?: string | null
          last_activity_at?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active_conversations_count?: number | null
          agent_status?: Database["public"]["Enums"]["agent_status"] | null
          assigned_tickets_count?: number | null
          can_attend_meetings?: boolean
          can_manage_content?: boolean
          can_reply_tickets?: boolean
          completed_meetings_count?: number | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          job_title?: string | null
          last_activity_at?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscription_requests: {
        Row: {
          admin_response: string | null
          created_at: string
          current_plan: string | null
          id: string
          notes: string | null
          organization_id: string
          processed_at: string | null
          processed_by: string | null
          request_type: string
          requested_by: string | null
          requested_plan: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          current_plan?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          processed_at?: string | null
          processed_by?: string | null
          request_type?: string
          requested_by?: string | null
          requested_plan: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          current_plan?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          processed_at?: string | null
          processed_by?: string | null
          request_type?: string
          requested_by?: string | null
          requested_plan?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_note: string | null
          assigned_to: string | null
          assigned_to_staff: string | null
          category: string
          closure_report: string | null
          created_at: string
          description: string
          escalated_at: string | null
          escalation_reason: string | null
          guest_email: string | null
          guest_name: string | null
          id: string
          is_escalated: boolean | null
          organization_id: string | null
          priority: string
          resolved_at: string | null
          resolved_by: string | null
          screenshot_url: string | null
          source: string | null
          source_domain: string | null
          staff_status: string | null
          status: string
          subject: string
          ticket_number: string
          updated_at: string
          user_id: string | null
          website_url: string | null
        }
        Insert: {
          admin_note?: string | null
          assigned_to?: string | null
          assigned_to_staff?: string | null
          category?: string
          closure_report?: string | null
          created_at?: string
          description: string
          escalated_at?: string | null
          escalation_reason?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          is_escalated?: boolean | null
          organization_id?: string | null
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          screenshot_url?: string | null
          source?: string | null
          source_domain?: string | null
          staff_status?: string | null
          status?: string
          subject: string
          ticket_number: string
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Update: {
          admin_note?: string | null
          assigned_to?: string | null
          assigned_to_staff?: string | null
          category?: string
          closure_report?: string | null
          created_at?: string
          description?: string
          escalated_at?: string | null
          escalation_reason?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          is_escalated?: boolean | null
          organization_id?: string | null
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          screenshot_url?: string | null
          source?: string | null
          source_domain?: string | null
          staff_status?: string | null
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_staff_fkey"
            columns: ["assigned_to_staff"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      ticket_activity_log: {
        Row: {
          action_type: string
          created_at: string
          id: string
          is_staff_action: boolean | null
          new_value: string | null
          note: string | null
          old_value: string | null
          performed_by: string | null
          performed_by_name: string | null
          ticket_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          is_staff_action?: boolean | null
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          ticket_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          is_staff_action?: boolean | null
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_activity_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_replies: {
        Row: {
          attachments: string[] | null
          created_at: string
          id: string
          is_staff_reply: boolean
          message: string
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          is_staff_reply?: boolean
          message: string
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          is_staff_reply?: boolean
          message?: string
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_indicators: {
        Row: {
          conversation_id: string
          id: string
          is_typing: boolean
          updated_at: string
          user_id: string
          user_name: string | null
          user_type: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_typing?: boolean
          updated_at?: string
          user_id: string
          user_name?: string | null
          user_type: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_typing?: boolean
          updated_at?: string
          user_id?: string
          user_name?: string | null
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_log: {
        Row: {
          action_details: string | null
          action_type: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action_details?: string | null
          action_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action_details?: string | null
          action_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          article_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          article_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          article_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "docs_articles"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_available_agent: {
        Args: { p_mode: Database["public"]["Enums"]["auto_assign_mode"] }
        Returns: string
      }
      get_client_organization: { Args: { _user_id: string }; Returns: string }
      get_staff_permissions: {
        Args: { _user_id: string }
        Returns: {
          can_attend_meetings: boolean
          can_manage_content: boolean
          can_reply_tickets: boolean
          staff_id: string
        }[]
      }
      get_user_type: {
        Args: { _user_id: string }
        Returns: {
          can_attend_meetings: boolean
          can_manage_content: boolean
          can_reply_tickets: boolean
          client_id: string
          display_name: string
          organization_id: string
          role_name: string
          staff_id: string
          user_type: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_or_editor: { Args: { _user_id: string }; Returns: boolean }
      is_client: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_support_agent: { Args: { _user_id: string }; Returns: boolean }
      log_user_activity: {
        Args: {
          p_action_details?: string
          p_action_type: string
          p_metadata?: Json
          p_user_email: string
          p_user_id: string
          p_user_name: string
        }
        Returns: string
      }
    }
    Enums: {
      agent_status: "available" | "busy" | "offline"
      app_role: "admin" | "editor" | "support_agent" | "client"
      article_status: "draft" | "published" | "archived"
      auto_assign_mode: "disabled" | "round_robin" | "least_active" | "by_team"
      conversation_status: "unassigned" | "assigned" | "closed"
      difficulty_level: "beginner" | "intermediate" | "advanced"
      meeting_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "rescheduled"
      organization_type:
        | "charity"
        | "nonprofit"
        | "foundation"
        | "cooperative"
        | "other"
      subscription_status:
        | "trial"
        | "active"
        | "pending_renewal"
        | "expired"
        | "cancelled"
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
      agent_status: ["available", "busy", "offline"],
      app_role: ["admin", "editor", "support_agent", "client"],
      article_status: ["draft", "published", "archived"],
      auto_assign_mode: ["disabled", "round_robin", "least_active", "by_team"],
      conversation_status: ["unassigned", "assigned", "closed"],
      difficulty_level: ["beginner", "intermediate", "advanced"],
      meeting_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "rescheduled",
      ],
      organization_type: [
        "charity",
        "nonprofit",
        "foundation",
        "cooperative",
        "other",
      ],
      subscription_status: [
        "trial",
        "active",
        "pending_renewal",
        "expired",
        "cancelled",
      ],
    },
  },
} as const
