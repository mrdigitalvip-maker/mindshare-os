export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          username: string | null;
          avatar_url: string | null;
          bio: string | null;
          language: string | null;
          country: string | null;
          timezone: string | null;
          primary_goal: string | null;
          preferences: Json | null;
          plan: string | null;
          onboarded: boolean | null;
          email_notifications: boolean | null;
          push_notifications: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<
          Omit<Database["public"]["Tables"]["profiles"]["Row"], "id" | "created_at" | "updated_at">
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          description: string | null;
          progress: number | null;
          status: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["projects"]["Row"], "id">> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Row"]>;
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          description: string | null;
          completed: boolean | null;
          due_date: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["tasks"]["Row"], "id">> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Row"]>;
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          file_type: string | null;
          updated_at: string | null;
          created_at: string | null;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["documents"]["Row"], "id">> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Row"]>;
      };
      ai_conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          model: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["ai_conversations"]["Row"], "id">> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_conversations"]["Row"]>;
      };
      ai_messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: string | null;
          content: string | null;
          tokens: number | null;
          created_at: string | null;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["ai_messages"]["Row"], "id">> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_messages"]["Row"]>;
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          status: string | null;
          price_id: string | null;
          cancel_at_period_end: boolean | null;
          current_period_end: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["subscriptions"]["Row"], "id">> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Row"]>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          message: string | null;
          created_at: string | null;
          read_at: string | null;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["notifications"]["Row"], "id">> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string;
          action: string | null;
          details: Json | null;
          created_at: string | null;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["activity_logs"]["Row"], "id">> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["activity_logs"]["Row"]>;
      };
    };
  };
};
