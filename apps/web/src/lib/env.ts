const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // 개발 초기에 .env.local 을 안 만든 경우를 빨리 알아채기 위함.
  console.warn(
    '[env] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 비어 있습니다. apps/web/.env.example 참고.',
  );
}

export const env = {
  supabaseUrl: url ?? '',
  supabaseAnonKey: anonKey ?? '',
};
