import { create } from 'zustand';
import type { Tables } from '@dailyglow/supabase';
import { recommendHangulStage, type ReadingLevel } from '@dailyglow/utils';
import { supabase } from '@/lib/supabase';

export type ProfileRow = Tables<'profiles'>;
export interface SubjectLevel {
  level: number;
  locked: boolean;
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

interface ProfileState {
  profile: ProfileRow | null;
  /** subject_id → 레벨 */
  levels: Record<string, SubjectLevel>;
  status: 'idle' | 'loading' | 'ready' | 'error';

  load: (userId: string) => Promise<void>;
  save: (patch: Partial<ProfileRow>) => Promise<{ error?: string }>;
  /**
   * 아직 레벨이 없는 과목에 시작 레벨을 채워 넣는다. 온보딩 저장 직후에 부른다.
   * 이미 값이 있는 과목은 건드리지 않는다 — 부모가 정한 값을 덮어쓰면 안 된다.
   */
  initializeSubjectLevels: (readingLevel: ReadingLevel | null) => Promise<{ error?: string }>;
  setSubjectLevel: (subjectId: string, level: number, locked?: boolean) => Promise<void>;
  clear: () => void;
}

export const useProfile = create<ProfileState>((set, get) => ({
  profile: null,
  levels: {},
  status: 'idle',

  load: async (userId) => {
    // 이미 프로필이 있으면 백그라운드 재조회 — 화면이 깜빡이지 않도록 loading 으로 내리지 않는다.
    if (!get().profile) set({ status: 'loading' });
    const [profileRes, levelRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('profile_subject_levels').select('*').eq('profile_id', userId),
    ]);

    if (profileRes.error || levelRes.error) {
      set({ status: 'error' });
      return;
    }

    const levels: Record<string, SubjectLevel> = {};
    for (const row of levelRes.data ?? []) {
      levels[row.subject_id] = { level: row.level, locked: row.locked };
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

    if (error) return { error: error.message };
    set({ profile: data });
    return {};
  },

  initializeSubjectLevels: async (readingLevel) => {
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
      // 한글은 읽기 수준에서 뽑은 단계, 나머지 과목은 1단계부터.
      level: s.slug === 'hangul' ? recommendHangulStage(readingLevel) : 1,
      locked: false,
      updated_at: now,
    }));

    // ignoreDuplicates — 스토어가 못 본 행이 DB 에 이미 있어도 덮어쓰지 않는다.
    const { error: writeError } = await supabase
      .from('profile_subject_levels')
      .upsert(rows, { onConflict: 'profile_id,subject_id', ignoreDuplicates: true });
    if (writeError) return { error: toKoreanError('과목 초기 레벨 저장', writeError.message) };

    const next = { ...get().levels };
    for (const r of rows) next[r.subject_id] = { level: r.level, locked: r.locked };
    set({ levels: next });
    return {};
  },

  setSubjectLevel: async (subjectId, level, locked) => {
    const current = get().profile;
    if (!current) return;

    const next: SubjectLevel = {
      level,
      locked: locked ?? get().levels[subjectId]?.locked ?? false,
    };

    const { error } = await supabase.from('profile_subject_levels').upsert({
      profile_id: current.id,
      subject_id: subjectId,
      level: next.level,
      locked: next.locked,
      updated_at: new Date().toISOString(),
    });

    // 저장에 실패하면 로컬 상태를 갱신하지 않는다 — 저장 안 된 값을 화면에 보이지 않게.
    if (error) {
      console.warn('[profile] 과목 레벨 저장 실패:', error.message);
      return;
    }

    set({ levels: { ...get().levels, [subjectId]: next } });
  },

  clear: () => set({ profile: null, levels: {}, status: 'idle' }),
}));
