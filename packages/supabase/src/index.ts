import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type { Database } from './database.types';
export type { Json } from './database.types';
export type DailyGlowClient = SupabaseClient<Database>;

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

/**
 * 앱/서버 공용 클라이언트 팩토리.
 * 브라우저에서는 persistSession=true 로 로그인 상태를 유지한다.
 */
export function createDailyGlowClient(env: SupabaseEnv): DailyGlowClient {
  return createClient<Database>(env.url, env.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}
