export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string;
          created_at: string | null;
          id: string;
          metadata: Json | null;
          module: string | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string | null;
          id?: string;
          metadata?: Json | null;
          module?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string | null;
          id?: string;
          metadata?: Json | null;
          module?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      agent_runs: {
        Row: {
          agent_id: string | null;
          finished_at: string | null;
          id: string;
          input: Json | null;
          output: Json | null;
          started_at: string | null;
          status: string | null;
          user_id: string;
          error_code: string | null;
          created_at: string;
        };
        Insert: {
          agent_id?: string | null;
          finished_at?: string | null;
          id?: string;
          input?: Json | null;
          output?: Json | null;
          started_at?: string | null;
          status?: string | null;
          user_id: string;
          error_code?: string | null;
          created_at?: string;
        };
        Update: {
          agent_id?: string | null;
          finished_at?: string | null;
          id?: string;
          input?: Json | null;
          output?: Json | null;
          started_at?: string | null;
          status?: string | null;
          user_id?: string;
          error_code?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_runs_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      agents: {
        Row: {
          active: boolean | null;
          created_at: string | null;
          description: string | null;
          id: string;
          model: string | null;
          name: string | null;
          system_prompt: string | null;
          temperature: number | null;
          user_id: string | null;
          goal: string | null;
          instructions: string | null;
          tone: string | null;
          expected_output: string | null;
          capabilities: string[];
          updated_at: string;
        };
        Insert: {
          active?: boolean | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          model?: string | null;
          name?: string | null;
          system_prompt?: string | null;
          temperature?: number | null;
          user_id?: string | null;
          goal?: string | null;
          instructions?: string | null;
          tone?: string | null;
          expected_output?: string | null;
          capabilities?: string[];
          updated_at?: string;
        };
        Update: {
          active?: boolean | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          model?: string | null;
          name?: string | null;
          system_prompt?: string | null;
          temperature?: number | null;
          user_id?: string | null;
          goal?: string | null;
          instructions?: string | null;
          tone?: string | null;
          expected_output?: string | null;
          capabilities?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agents_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_conversations: {
        Row: {
          created_at: string | null;
          id: string;
          model: string | null;
          title: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          model?: string | null;
          title?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          model?: string | null;
          title?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_conversations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_messages: {
        Row: {
          content: string | null;
          conversation_id: string | null;
          created_at: string | null;
          id: string;
          role: string | null;
          tokens: number | null;
        };
        Insert: {
          content?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          id?: string;
          role?: string | null;
          tokens?: number | null;
        };
        Update: {
          content?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          id?: string;
          role?: string | null;
          tokens?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "ai_conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      api_keys: {
        Row: {
          created_at: string | null;
          encrypted_key: string | null;
          id: string;
          provider: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          encrypted_key?: string | null;
          id?: string;
          provider?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          encrypted_key?: string | null;
          id?: string;
          provider?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "api_keys_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          content: string | null;
          created_at: string | null;
          id: string;
          title: string | null;
          type: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          content?: string | null;
          created_at?: string | null;
          id?: string;
          title?: string | null;
          type?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          content?: string | null;
          created_at?: string | null;
          id?: string;
          title?: string | null;
          type?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "documents_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      files: {
        Row: {
          bucket: string | null;
          created_at: string | null;
          id: string;
          mime_type: string | null;
          name: string | null;
          path: string | null;
          size: number | null;
          user_id: string | null;
        };
        Insert: {
          bucket?: string | null;
          created_at?: string | null;
          id?: string;
          mime_type?: string | null;
          name?: string | null;
          path?: string | null;
          size?: number | null;
          user_id?: string | null;
        };
        Update: {
          bucket?: string | null;
          created_at?: string | null;
          id?: string;
          mime_type?: string | null;
          name?: string | null;
          path?: string | null;
          size?: number | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "files_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      finance_accounts: {
        Row: {
          balance: number | null;
          created_at: string | null;
          currency: string | null;
          id: string;
          name: string;
          type: string | null;
          user_id: string | null;
        };
        Insert: {
          balance?: number | null;
          created_at?: string | null;
          currency?: string | null;
          id?: string;
          name: string;
          type?: string | null;
          user_id?: string | null;
        };
        Update: {
          balance?: number | null;
          created_at?: string | null;
          currency?: string | null;
          id?: string;
          name?: string;
          type?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "finance_accounts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      finance_transactions: {
        Row: {
          account_id: string | null;
          amount: number | null;
          category: string | null;
          created_at: string | null;
          id: string;
          title: string | null;
          transaction_date: string | null;
          type: string | null;
          user_id: string | null;
        };
        Insert: {
          account_id?: string | null;
          amount?: number | null;
          category?: string | null;
          created_at?: string | null;
          id?: string;
          title?: string | null;
          transaction_date?: string | null;
          type?: string | null;
          user_id?: string | null;
        };
        Update: {
          account_id?: string | null;
          amount?: number | null;
          category?: string | null;
          created_at?: string | null;
          id?: string;
          title?: string | null;
          transaction_date?: string | null;
          type?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "finance_transactions_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "finance_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "finance_transactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notes: {
        Row: {
          content: string | null;
          created_at: string | null;
          id: string;
          pinned: boolean | null;
          title: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          content?: string | null;
          created_at?: string | null;
          id?: string;
          pinned?: boolean | null;
          title?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          content?: string | null;
          created_at?: string | null;
          id?: string;
          pinned?: boolean | null;
          title?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string | null;
          id: string;
          is_read: boolean | null;
          message: string | null;
          title: string | null;
          type: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          message?: string | null;
          title?: string | null;
          type?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          message?: string | null;
          title?: string | null;
          type?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          country: string | null;
          created_at: string | null;
          email_notifications: boolean | null;
          full_name: string | null;
          id: string;
          language: string | null;
          onboarded: boolean | null;
          plan: string | null;
          preferences: Json;
          primary_goal: string | null;
          push_notifications: boolean | null;
          timezone: string | null;
          updated_at: string | null;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          country?: string | null;
          created_at?: string | null;
          email_notifications?: boolean | null;
          full_name?: string | null;
          id: string;
          language?: string | null;
          onboarded?: boolean | null;
          plan?: string | null;
          preferences?: Json;
          primary_goal?: string | null;
          push_notifications?: boolean | null;
          timezone?: string | null;
          updated_at?: string | null;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          country?: string | null;
          created_at?: string | null;
          email_notifications?: boolean | null;
          full_name?: string | null;
          id?: string;
          language?: string | null;
          onboarded?: boolean | null;
          plan?: string | null;
          preferences?: Json;
          primary_goal?: string | null;
          push_notifications?: boolean | null;
          timezone?: string | null;
          updated_at?: string | null;
          username?: string | null;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          color: string | null;
          created_at: string | null;
          description: string | null;
          favorite: boolean | null;
          icon: string | null;
          id: string;
          status: string | null;
          title: string;
          updated_at: string | null;
          user_id: string;
          objective: string | null;
          priority: string;
          start_date: string | null;
          due_date: string | null;
        };
        Insert: {
          color?: string | null;
          created_at?: string | null;
          description?: string | null;
          favorite?: boolean | null;
          icon?: string | null;
          id?: string;
          status?: string | null;
          title: string;
          updated_at?: string | null;
          user_id: string;
          objective?: string | null;
          priority?: string;
          start_date?: string | null;
          due_date?: string | null;
        };
        Update: {
          color?: string | null;
          created_at?: string | null;
          description?: string | null;
          favorite?: boolean | null;
          icon?: string | null;
          id?: string;
          status?: string | null;
          title?: string;
          updated_at?: string | null;
          user_id?: string;
          objective?: string | null;
          priority?: string;
          start_date?: string | null;
          due_date?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      study_goals: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string;
          title: string;
          target_value: number;
          current_value: number;
          due_at: string | null;
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id: string;
          title: string;
          target_value?: number;
          current_value?: number;
          due_at?: string | null;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subject_id?: string;
          title?: string;
          target_value?: number;
          current_value?: number;
          due_at?: string | null;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      study_notes: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string;
          title: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id: string;
          title?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subject_id?: string;
          title?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      study_sessions: {
        Row: {
          activity: string;
          completed: boolean;
          created_at: string;
          duration: number;
          id: string;
          subject_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          activity?: string;
          completed?: boolean;
          created_at?: string;
          duration: number;
          id?: string;
          subject_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          activity?: string;
          completed?: boolean;
          created_at?: string;
          duration?: number;
          id?: string;
          subject_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "study_sessions_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "study_subjects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "study_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      study_subjects: {
        Row: {
          color: string | null;
          created_at: string | null;
          description: string;
          id: string;
          name: string | null;
          status: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          color?: string | null;
          created_at?: string | null;
          description?: string;
          id?: string;
          name?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          color?: string | null;
          created_at?: string | null;
          description?: string;
          id?: string;
          name?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "study_subjects_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null;
          created_at: string | null;
          current_period_end: string | null;
          id: string;
          plan: string | null;
          status: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          cancel_at_period_end?: boolean | null;
          created_at?: string | null;
          current_period_end?: string | null;
          id?: string;
          plan?: string | null;
          status?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          cancel_at_period_end?: boolean | null;
          created_at?: string | null;
          current_period_end?: string | null;
          id?: string;
          plan?: string | null;
          status?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          completed: boolean | null;
          created_at: string | null;
          description: string | null;
          due_date: string | null;
          id: string;
          priority: string | null;
          project_id: string | null;
          status: string | null;
          title: string;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          completed?: boolean | null;
          created_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          priority?: string | null;
          project_id?: string | null;
          status?: string | null;
          title: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          completed?: boolean | null;
          created_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          priority?: string | null;
          project_id?: string | null;
          status?: string | null;
          title?: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      translations: {
        Row: {
          created_at: string | null;
          id: string;
          original_text: string | null;
          provider: string | null;
          source_language: string | null;
          target_language: string | null;
          translated_text: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          original_text?: string | null;
          provider?: string | null;
          source_language?: string | null;
          target_language?: string | null;
          translated_text?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          original_text?: string | null;
          provider?: string | null;
          source_language?: string | null;
          target_language?: string | null;
          translated_text?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "translations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_preferences: {
        Row: {
          ai_model: string | null;
          created_at: string | null;
          daily_goal: number | null;
          id: string;
          language: string | null;
          theme: string | null;
          timezone: string | null;
          updated_at: string | null;
          user_id: string;
          week_start: string | null;
        };
        Insert: {
          ai_model?: string | null;
          created_at?: string | null;
          daily_goal?: number | null;
          id?: string;
          language?: string | null;
          theme?: string | null;
          timezone?: string | null;
          updated_at?: string | null;
          user_id: string;
          week_start?: string | null;
        };
        Update: {
          ai_model?: string | null;
          created_at?: string | null;
          daily_goal?: number | null;
          id?: string;
          language?: string | null;
          theme?: string | null;
          timezone?: string | null;
          updated_at?: string | null;
          user_id?: string;
          week_start?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
