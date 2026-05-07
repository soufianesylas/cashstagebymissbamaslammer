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
      profiles: {
        Row: {
          artist_name: string
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          artist_name: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          artist_name?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tracks: {
        Row: {
          audio_path: string
          created_at: string
          duration_seconds: number
          id: string
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
          mode?: string
          play_count?: number
          title?: string
          updated_at?: string
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
    }
    Functions: {
      close_expired_contests: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_play_count: { Args: { _track_id: string }; Returns: undefined }
      open_todays_contest: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "moderator" | "artist"
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
      app_role: ["admin", "moderator", "artist"],
    },
  },
} as const
