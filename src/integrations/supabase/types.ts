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
      chat_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          room_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          room_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chatrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chatrooms: {
        Row: {
          created_at: string
          crew_id: string | null
          id: string
          kind: string
          owner_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          crew_id?: string | null
          id?: string
          kind: string
          owner_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          crew_id?: string | null
          id?: string
          kind?: string
          owner_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatrooms_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: true
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_beats: {
        Row: {
          approved: boolean
          audio_path: string
          bpm: number | null
          created_at: string
          id: string
          producer_id: string
          title: string
          updated_at: string
          vibe: string | null
        }
        Insert: {
          approved?: boolean
          audio_path: string
          bpm?: number | null
          created_at?: string
          id?: string
          producer_id: string
          title: string
          updated_at?: string
          vibe?: string | null
        }
        Update: {
          approved?: boolean
          audio_path?: string
          bpm?: number | null
          created_at?: string
          id?: string
          producer_id?: string
          title?: string
          updated_at?: string
          vibe?: string | null
        }
        Relationships: []
      }
      contest_entries: {
        Row: {
          beat_id: string
          contest_id: string
          created_at: string
          id: string
          slot: number
        }
        Insert: {
          beat_id: string
          contest_id: string
          created_at?: string
          id?: string
          slot: number
        }
        Update: {
          beat_id?: string
          contest_id?: string
          created_at?: string
          id?: string
          slot?: number
        }
        Relationships: [
          {
            foreignKeyName: "contest_entries_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "contest_beats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_entries_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "daily_contests"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_votes: {
        Row: {
          contest_id: string
          created_at: string
          entry_id: string
          id: string
          voter_id: string
        }
        Insert: {
          contest_id: string
          created_at?: string
          entry_id: string
          id?: string
          voter_id: string
        }
        Update: {
          contest_id?: string
          created_at?: string
          entry_id?: string
          id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contest_votes_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "daily_contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_votes_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "contest_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_votes_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "contest_vote_tallies"
            referencedColumns: ["entry_id"]
          },
        ]
      }
      crew_members: {
        Row: {
          crew_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          crew_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          crew_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_members_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
        ]
      }
      crews: {
        Row: {
          created_at: string
          description: string | null
          id: string
          leader_id: string
          name: string
          tag: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          leader_id: string
          name: string
          tag: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          leader_id?: string
          name?: string
          tag?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_contests: {
        Row: {
          contest_date: string
          created_at: string
          id: string
          status: string
          updated_at: string
          winner_beat_id: string | null
        }
        Insert: {
          contest_date: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          winner_beat_id?: string | null
        }
        Update: {
          contest_date?: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          winner_beat_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_contests_winner_beat_id_fkey"
            columns: ["winner_beat_id"]
            isOneToOne: false
            referencedRelation: "contest_beats"
            referencedColumns: ["id"]
          },
        ]
      }
      drops: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          media_path: string
          media_type: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          media_path: string
          media_type: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          media_path?: string
          media_type?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      judging_panel: {
        Row: {
          created_at: string
          id: string
          judge_id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          judge_id: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          judge_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "judging_panel_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "judging_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      judging_scores: {
        Row: {
          created_at: string
          entry_id: string
          id: string
          judge_id: string
          score: number
          session_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          id?: string
          judge_id: string
          score: number
          session_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          id?: string
          judge_id?: string
          score?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "judging_scores_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "judging_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      judging_sessions: {
        Row: {
          closes_at: string
          contest_id: string
          created_at: string
          id: string
          opens_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          closes_at: string
          contest_id: string
          created_at?: string
          id?: string
          opens_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          closes_at?: string
          contest_id?: string
          created_at?: string
          id?: string
          opens_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      moderation_actions: {
        Row: {
          action: string
          created_at: string
          id: string
          moderator_id: string
          notes: string | null
          track_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          moderator_id: string
          notes?: string | null
          track_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          moderator_id?: string
          notes?: string | null
          track_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          artist_name: string
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_18_plus: boolean
          updated_at: string
        }
        Insert: {
          artist_name: string
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_18_plus?: boolean
          updated_at?: string
        }
        Update: {
          artist_name?: string
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_18_plus?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      room_members: {
        Row: {
          created_at: string
          id: string
          room_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          room_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chatrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          daily_drops: number
          environment: string
          free_radio_sends_remaining: number
          price_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          daily_drops?: number
          environment?: string
          free_radio_sends_remaining?: number
          price_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          daily_drops?: number
          environment?: string
          free_radio_sends_remaining?: number
          price_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      track_boosts: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          pack: string
          plays_remaining: number
          track_id: string
          updated_at: string
          votes_remaining: number
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          pack: string
          plays_remaining?: number
          track_id: string
          updated_at?: string
          votes_remaining?: number
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          pack?: string
          plays_remaining?: number
          track_id?: string
          updated_at?: string
          votes_remaining?: number
        }
        Relationships: []
      }
      track_reports: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          reason: string
          reporter_id: string
          status: string
          track_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: string
          track_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
          track_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      track_scores: {
        Row: {
          created_at: string
          favorite_bars: string | null
          feature_worthy: boolean | null
          fully_listened: boolean
          id: string
          judge_id: string
          needs_improvement: string | null
          reward_paid: boolean
          score: number
          score_date: string
          track_id: string
        }
        Insert: {
          created_at?: string
          favorite_bars?: string | null
          feature_worthy?: boolean | null
          fully_listened?: boolean
          id?: string
          judge_id: string
          needs_improvement?: string | null
          reward_paid?: boolean
          score: number
          score_date?: string
          track_id: string
        }
        Update: {
          created_at?: string
          favorite_bars?: string | null
          feature_worthy?: boolean | null
          fully_listened?: boolean
          id?: string
          judge_id?: string
          needs_improvement?: string | null
          reward_paid?: boolean
          score?: number
          score_date?: string
          track_id?: string
        }
        Relationships: []
      }
      tracks: {
        Row: {
          audio_path: string
          created_at: string
          duration_seconds: number
          id: string
          is_featured: boolean
          is_hidden: boolean
          mode: string
          play_count: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_path: string
          created_at?: string
          duration_seconds?: number
          id?: string
          is_featured?: boolean
          is_hidden?: boolean
          mode?: string
          play_count?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_path?: string
          created_at?: string
          duration_seconds?: number
          id?: string
          is_featured?: boolean
          is_hidden?: boolean
          mode?: string
          play_count?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_media: {
        Row: {
          created_at: string
          id: string
          kind: string
          storage_path: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          storage_path: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          storage_path?: string
          title?: string | null
          user_id?: string
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
      wallets: {
        Row: {
          csb_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          csb_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          csb_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_contest_entries: {
        Row: {
          contest_id: string
          created_at: string
          id: string
          track_id: string
          user_id: string
        }
        Insert: {
          contest_id: string
          created_at?: string
          id?: string
          track_id: string
          user_id: string
        }
        Update: {
          contest_id?: string
          created_at?: string
          id?: string
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_contest_entries_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "weekly_contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_contest_entries_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_contests: {
        Row: {
          created_at: string
          id: string
          payout_status: string
          prize_usd_cents: number
          status: string
          submissions_close_at: string
          submissions_open_at: string
          updated_at: string
          voting_close_at: string
          voting_open_at: string
          week_start: string
          winner_user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          payout_status?: string
          prize_usd_cents?: number
          status?: string
          submissions_close_at: string
          submissions_open_at: string
          updated_at?: string
          voting_close_at: string
          voting_open_at: string
          week_start: string
          winner_user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          payout_status?: string
          prize_usd_cents?: number
          status?: string
          submissions_close_at?: string
          submissions_open_at?: string
          updated_at?: string
          voting_close_at?: string
          voting_open_at?: string
          week_start?: string
          winner_user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      contest_vote_tallies: {
        Row: {
          beat_id: string | null
          contest_id: string | null
          entry_id: string | null
          slot: number | null
          vote_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contest_entries_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "contest_beats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_entries_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "daily_contests"
            referencedColumns: ["id"]
          },
        ]
      }
      track_score_tallies: {
        Row: {
          avg_score: number | null
          score_count: number | null
          track_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      anonymous_track_score_tallies: {
        Args: never
        Returns: {
          average_score: number
          feature_worthy_count: number
          score_count: number
          track_id: string
        }[]
      }
      apply_subscription_tier: {
        Args: {
          _cancel_at_period_end: boolean
          _current_period_end: string
          _current_period_start: string
          _environment: string
          _price_id: string
          _status: string
          _stripe_customer_id: string
          _stripe_subscription_id: string
          _user_id: string
        }
        Returns: undefined
      }
      boosted_track_order: {
        Args: never
        Returns: {
          boost_rank: number
          boosted_plays_remaining: number
          boosted_votes_remaining: number
          track_id: string
        }[]
      }
      close_expired_contests: { Args: never; Returns: number }
      consume_boost_play: { Args: { _track_id: string }; Returns: undefined }
      consume_boost_vote: { Args: { _track_id: string }; Returns: undefined }
      crew_role: {
        Args: { _crew_id: string; _user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_play_count: { Args: { _track_id: string }; Returns: undefined }
      is_crew_member: {
        Args: { _crew_id: string; _user_id: string }
        Returns: boolean
      }
      is_panel_judge: { Args: { _session_id: string }; Returns: boolean }
      is_room_member: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      open_todays_contest: { Args: never; Returns: string }
      submit_track_score: {
        Args: {
          _favorite_bars?: string
          _feature_worthy?: boolean
          _needs_improvement?: string
          _score: number
          _track_id: string
        }
        Returns: string
      }
      user_tier: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["tier"]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "artist" | "judge"
      tier: "free" | "premium" | "vip"
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
      app_role: ["admin", "moderator", "artist", "judge"],
      tier: ["free", "premium", "vip"],
    },
  },
} as const
