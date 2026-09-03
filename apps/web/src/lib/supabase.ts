import { createDailyGlowClient } from '@dailyglow/supabase';
import { env } from './env';

export const supabase = createDailyGlowClient({
  url: env.supabaseUrl,
  anonKey: env.supabaseAnonKey,
});
