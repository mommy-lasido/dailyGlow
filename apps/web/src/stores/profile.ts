import { create } from 'zustand';
import type { Tables } from '@dailyglow/supabase';
import { supabase } from '@/lib/supabase';

export type ProfileRow = Tables<'profiles'>;
export interface SubjectLevel {
  level: number;
  locked: boolean;
}

interface ProfileState {
  profile: ProfileRow | null;
  /** subject_id → 레벨 */
  levels: Record<string, SubjectLevel>;
  status: 'idle' | 'loading' | 'ready' | 'error';

  load: (userId: string) => Promise<void>;
  save: (patch: Partial<ProfileRow>) => Promise<{ error?: string }>;
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
