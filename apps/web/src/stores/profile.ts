import { create } from 'zustand';
import type { Tables } from '@dailyglow/supabase';
import { recommendHangulStage, type ReadingLevel } from '@dailyglow/utils';
import { supabase } from '@/lib/supabase';

export type ProfileRow = Tables<'profiles'>;
export interface SubjectLevel {
  level: number;
  locked: boolean;
  /**
   * 이 단계를 마지막으로 바꾼 때(ISO 문자열). 제안이 며칠 만에 또 뜨지 않도록
   * 쓴다 — 한글은 한 주에 글자 하나를 붙잡는 것이 원칙이다. 예전 행에는 없을 수
   * 있어 없는 것도 허용한다.
   */
  updatedAt?: string | null;
}

/**
 * 백엔드 오류 문구를 화면에 쓸 한국어 한 문장으로 바꾼다.
 *
 * PostgREST 는 `new row violates row-level security policy for table "profiles"` 같은
 * 영어 문장을 준다. 아이와 부모가 보는 화면에 그대로 내보낼 수 없다.
 * 원문은 콘솔에 남겨 디버깅에 쓰고, 화면에는 여기서 만든 문장만 보여준다.
 */
function toKoreanError(scope: string, raw: string): string {
  console.warn(`[profile] ${scope} 실패:`, raw);
  if (/row-level security|permission denied|not authorized|JWT/i.test(raw)) {
    return '권한이 없어요. 로그아웃했다가 다시 들어와 주세요.';
  }
  if (/fetch|network|timeout|offline/i.test(raw)) {
    return '지금 연결이 잘 안 돼요. 잠시 뒤에 다시 해주세요.';
  }
  return '지금은 저장하지 못했어요. 잠시 뒤에 다시 해주세요.';
}

/**
 * 로그인이 만료된 오류인지 가려낸다.
 *
 * `db:reset` 뒤처럼 예전 세션이 브라우저에 남아 있으면 첫 조회가
 * 401 `{"code":"PGRST301","message":"JWT cryptographic operation failed"}` 로 돌아온다.
 * 이건 연결이 끊긴 게 아니라 로그인이 만료된 것이다. 둘을 같이 다루면
 * 만료된 로그인이 "지금 연결이 잘 안 돼요" 로 보이고, 다시 해보기 버튼은
 * 몇 번을 눌러도 같은 401 을 받는다.
 *
 * PostgREST 는 인증 실패를 code 로 알려준다 — PGRST301(JWT 문제),
 * 42501(권한 없음). code 를 먼저 보고, 없으면 메시지에서 JWT 를 찾는다.
 */
function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  if (code === 'PGRST301' || code === '42501') return true;
  return typeof message === 'string' && /JWT/i.test(message);
}

interface ProfileState {
  profile: ProfileRow | null;
  /** subject_id → 레벨 */
  levels: Record<string, SubjectLevel>;
  status: 'idle' | 'loading' | 'ready' | 'error';
  /**
   * load 요청 세대 번호. load 는 시작할 때 이 값을 올리고, 결과를 반영하기 전에
   * 아직 자기 세대인지 확인한다. clear() 도 값을 올린다 — 로그아웃이 조회 도중에
   * 끼어들면, 늦게 도착한 응답이 방금 지운 프로필을 되살려서 다음 아이 화면에
   * 앞 아이 이름과 활동 목록이 잠깐 보인다.
   */
  requestId: number;

  load: (userId: string) => Promise<void>;
  save: (patch: Partial<ProfileRow>) => Promise<{ error?: string }>;
  /**
   * 아직 레벨이 없는 과목에 시작 레벨을 채워 넣는다. 온보딩 저장 직후에 부른다.
   * 이미 값이 있는 과목은 건드리지 않는다 — 부모가 정한 값을 덮어쓰면 안 된다.
   *
   * hangulStage 를 주면 한글 시작 단계로 그 값을 그대로 쓴다 — 온보딩에서 부모가
   * 단계를 직접 골랐을 때다. 안 주면 읽기 수준에서 뽑은 추천 단계로 채운다.
   */
  initializeSubjectLevels: (
    readingLevel: ReadingLevel | null,
    hangulStage?: number,
  ) => Promise<{ error?: string }>;
  setSubjectLevel: (
    subjectId: string,
    level: number,
    locked?: boolean,
  ) => Promise<{ error?: string }>;
  clear: () => void;
}

export const useProfile = create<ProfileState>((set, get) => ({
  profile: null,
  levels: {},
  status: 'idle',
  requestId: 0,

  load: async (userId) => {
    const generation = get().requestId + 1;
    set({ requestId: generation });

    // 이미 프로필이 있으면 백그라운드 재조회 — 화면이 깜빡이지 않도록 loading 으로 내리지 않는다.
    if (!get().profile) set({ status: 'loading' });
    const [profileRes, levelRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('profile_subject_levels').select('*').eq('profile_id', userId),
    ]);

    // 기다리는 사이에 clear() 나 다른 load 가 끼어들었으면 이 결과는 이미 낡았다.
    if (get().requestId !== generation) return;

    const failure = profileRes.error ?? levelRes.error;
    if (failure) {
      // 로그인이 만료됐으면 로그아웃시킨다. onAuthStateChange 가 auth 스토어를
      // 비우고, RequireAuth 가 /login 으로 보낸다 — 다시 로그인하는 것만이
      // 유일한 해결책이라 "다시 해보기" 카드를 띄우면 안 된다.
      if (isAuthError(failure)) {
        console.warn('[profile] 로그인이 만료되어 로그아웃합니다:', failure.message);
        get().clear();
        await supabase.auth.signOut();
        return;
      }
      set({ status: 'error' });
      return;
    }

    const levels: Record<string, SubjectLevel> = {};
    for (const row of levelRes.data ?? []) {
      levels[row.subject_id] = {
        level: row.level,
        locked: row.locked,
        updatedAt: row.updated_at ?? null,
      };
    }

    set({ profile: profileRes.data, levels, status: 'ready' });
  },

  save: async (patch) => {
    const current = get().profile;
    if (!current) return { error: '프로필이 없습니다.' };

    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', current.id)
      .select()
      .single();

    if (error) return { error: toKoreanError('프로필 저장', error.message) };
    set({ profile: data });
    return {};
  },

  initializeSubjectLevels: async (readingLevel, hangulStage) => {
    const current = get().profile;
    if (!current) return { error: '프로필이 없습니다.' };

    const { data, error } = await supabase.from('subjects').select('id, slug');
    if (error) return { error: toKoreanError('과목 목록 조회', error.message) };

    // 스토어가 이미 알고 있는 과목은 부모가 정했거나 예전에 제안한 값이 있는 것이다.
    const known = get().levels;
    const missing = (data ?? []).filter((s) => !known[s.id]);
    if (missing.length === 0) return {};

    const now = new Date().toISOString();
    const rows = missing.map((s) => ({
      profile_id: current.id,
      subject_id: s.id,
      // 한글은 부모가 직접 고른 단계가 있으면 그 값, 없으면 읽기 수준에서 뽑은 단계.
      // 나머지 과목은 1단계부터.
      level: s.slug === 'hangul' ? (hangulStage ?? recommendHangulStage(readingLevel)) : 1,
      locked: false,
      updated_at: now,
    }));

    // ignoreDuplicates — 스토어가 못 본 행이 DB 에 이미 있어도 덮어쓰지 않는다.
    const { error: writeError } = await supabase
      .from('profile_subject_levels')
      .upsert(rows, { onConflict: 'profile_id,subject_id', ignoreDuplicates: true });
    if (writeError) return { error: toKoreanError('과목 초기 레벨 저장', writeError.message) };

    const next = { ...get().levels };
    for (const r of rows)
      next[r.subject_id] = { level: r.level, locked: r.locked, updatedAt: r.updated_at };
    set({ levels: next });
    return {};
  },

  setSubjectLevel: async (subjectId, level, locked) => {
    const current = get().profile;
    if (!current) return { error: '프로필이 없습니다.' };

    const next: SubjectLevel = {
      level,
      locked: locked ?? get().levels[subjectId]?.locked ?? false,
      updatedAt: new Date().toISOString(),
    };

    const { error } = await supabase.from('profile_subject_levels').upsert({
      profile_id: current.id,
      subject_id: subjectId,
      level: next.level,
      locked: next.locked,
      updated_at: next.updatedAt ?? new Date().toISOString(),
    });

    // 저장에 실패하면 로컬 상태를 갱신하지 않는다 — 저장 안 된 값을 화면에 보이지 않게.
    // 대신 실패했다는 사실을 부르는 쪽에 돌려준다. <select> 가 예전 숫자로 조용히
    // 되돌아가기만 하면 부모는 자기가 잘못 눌렀다고 생각한다.
    if (error) return { error: toKoreanError('과목 레벨 저장', error.message) };

    set({ levels: { ...get().levels, [subjectId]: next } });
    return {};
  },

  clear: () =>
    set({ profile: null, levels: {}, status: 'idle', requestId: get().requestId + 1 }),
}));
