export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          credits: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          credits?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string | null;
          credits?: number;
          updated_at?: string;
        };
      };
      subjects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          is_builtin: boolean;
          language: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          is_builtin?: boolean;
          language?: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
        };
      };
      topics: {
        Row: {
          id: string;
          subject_id: string;
          title: string;
          content: string;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          title: string;
          content: string;
          order_index?: number;
          created_at?: string;
        };
        Update: {
          title?: string;
          content?: string;
          order_index?: number;
        };
      };
      exam_sessions: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string;
          topic_id: string;
          status: "active" | "completed" | "cancelled";
          started_at: string;
          ended_at: string | null;
          duration_seconds: number | null;
          evaluation: Json | null;
          credits_used: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id: string;
          topic_id: string;
          status?: "active" | "completed" | "cancelled";
          started_at?: string;
          ended_at?: string | null;
          duration_seconds?: number | null;
          evaluation?: Json | null;
          credits_used?: number;
        };
        Update: {
          status?: "active" | "completed" | "cancelled";
          ended_at?: string | null;
          duration_seconds?: number | null;
          evaluation?: Json | null;
        };
      };
      credit_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          type: "purchase" | "usage" | "bonus";
          description: string;
          stripe_payment_intent_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          type: "purchase" | "usage" | "bonus";
          description: string;
          stripe_payment_intent_id?: string | null;
          created_at?: string;
        };
        Update: never;
      };
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Subject = Database["public"]["Tables"]["subjects"]["Row"];
export type Topic = Database["public"]["Tables"]["topics"]["Row"];
export type ExamSession = Database["public"]["Tables"]["exam_sessions"]["Row"];
export type CreditTransaction = Database["public"]["Tables"]["credit_transactions"]["Row"];

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number; // EUR cents
  popular?: boolean;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "starter", name: "Štarter", credits: 50, price: 299 },
  { id: "standard", name: "Štandard", credits: 150, price: 699, popular: true },
  { id: "premium", name: "Prémiový", credits: 500, price: 1799 },
];

export const CREDITS_PER_SESSION = 10;
export const SIGNUP_BONUS_CREDITS = 10; // 1 free session on signup
