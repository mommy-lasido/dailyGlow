/**
 * 이 파일은 `pnpm db:types` (supabase gen types) 로 자동 생성된다.
 * 아래는 로컬 DB 를 아직 띄우지 못했을 때를 위한 임시 골격이며,
 * 마이그레이션 적용 후 재생성하면 덮어써진다.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          birth_year: number | null;
          avatar_key: string | null;
          total_xp: number;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          birth_year?: number | null;
          avatar_key?: string | null;
          total_xp?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      subjects: {
        Row: { id: string; slug: string; title: string; sort_order: number };
        Insert: { id?: string; slug: string; title: string; sort_order?: number };
        Update: Partial<Database['public']['Tables']['subjects']['Insert']>;
        Relationships: [];
      };
      lessons: {
        Row: {
          id: string;
          subject_id: string;
          slug: string;
          title: string;
          level: number;
          sort_order: number;
        };
        Insert: {
          id?: string;
          subject_id: string;
          slug: string;
          title: string;
          level?: number;
          sort_order?: number;
        };
        Update: Partial<Database['public']['Tables']['lessons']['Insert']>;
        Relationships: [];
      };
      problems: {
        Row: {
          id: string;
          lesson_id: string;
          type_id: string;
          prompt: Json;
          answer: Json;
          difficulty: number;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          type_id: string;
          prompt: Json;
          answer: Json;
          difficulty?: number;
        };
        Update: Partial<Database['public']['Tables']['problems']['Insert']>;
        Relationships: [];
      };
      attempts: {
        Row: {
          id: string;
          profile_id: string;
          problem_id: string;
          type_id: string;
          is_correct: boolean;
          response: Json | null;
          duration_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          problem_id: string;
          type_id: string;
          is_correct: boolean;
          response?: Json | null;
          duration_ms?: number | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['attempts']['Insert']>;
        Relationships: [];
      };
      progress: {
        Row: {
          profile_id: string;
          lesson_id: string;
          status: 'locked' | 'in_progress' | 'completed';
          best_accuracy: number;
          completed_at: string | null;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          lesson_id: string;
          status?: 'locked' | 'in_progress' | 'completed';
          best_accuracy?: number;
          completed_at?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['progress']['Insert']>;
        Relationships: [];
      };
      wrong_type_stats: {
        Row: {
          profile_id: string;
          type_id: string;
          attempts: number;
          correct: number;
          streak: number;
          last_seen_at: string;
        };
        Insert: {
          profile_id: string;
          type_id: string;
          attempts?: number;
          correct?: number;
          streak?: number;
          last_seen_at?: string;
        };
        Update: Partial<Database['public']['Tables']['wrong_type_stats']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}
