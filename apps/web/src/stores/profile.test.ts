import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProfile, type ProfileRow } from './profile';

/**
 * 프로젝트에 공용 Supabase 목이 아직 없어서 이 파일 안에서만 쓰는 최소 체이너블 스텁을 만든다.
 * 테이블별 응답은 h.responses 로 지정한다:
 *   h.responses['profiles']                      → maybeSingle()/single()/await 결과
 *   h.responses['profile_subject_levels']        → await 결과 (레벨 목록 조회)
 *   h.responses['profile_subject_levels:upsert'] → upsert() 결과
 */
const h = vi.hoisted(() => {
  type Res = { data?: unknown; error?: unknown };
  const responses: Record<string, Res> = {};

  const makeBuilder = (table: string) => {
    const result = (): Res => responses[table] ?? { data: null, error: null };
    const builder: Record<string, unknown> = {};
    builder.select = () => builder;
    builder.eq = () => builder;
    builder.update = () => builder;
    builder.upsert = () =>
      Promise.resolve(responses[`${table}:upsert`] ?? { data: null, error: null });
    builder.maybeSingle = () => Promise.resolve(result());
    builder.single = () => Promise.resolve(result());
    builder.then = (onOk: (v: Res) => unknown, onErr?: (e: unknown) => unknown) =>
      Promise.resolve(result()).then(onOk, onErr);
    return builder;
  };

  return { responses, makeBuilder };
});

vi.mock('@/lib/supabase', () => ({
  supabase: { from: (table: string) => h.makeBuilder(table) },
}));

function baseProfile(over: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: 'u1',
    display_name: '라윤',
    gender: 'female',
    birth_date: '2018-05-10',
    grade: 'g3',
    reading_level: 'fluent',
    daily_goal_minutes: 15,
    onboarded_at: '2026-09-04T00:00:00Z',
    avatar_key: null,
    total_xp: 0,
    created_at: '2026-09-04T00:00:00Z',
    ...over,
  } as ProfileRow;
}

describe('useProfile 스토어', () => {
  beforeEach(() => {
    useProfile.setState({ profile: null, levels: {}, status: 'idle' });
    for (const key of Object.keys(h.responses)) delete h.responses[key];
  });

  describe('load', () => {
    it('과목 레벨 조회가 실패하면 status 를 error 로 둔다', async () => {
      h.responses['profiles'] = { data: baseProfile(), error: null };
      h.responses['profile_subject_levels'] = { data: null, error: { message: 'boom' } };

      await useProfile.getState().load('u1');

      expect(useProfile.getState().status).toBe('error');
      expect(useProfile.getState().profile).toBeNull();
    });

    it('성공하면 프로필과 레벨 맵을 채우고 ready 가 된다', async () => {
      h.responses['profiles'] = { data: baseProfile(), error: null };
      h.responses['profile_subject_levels'] = {
        data: [{ subject_id: 'math', level: 3, locked: true }],
        error: null,
      };

      await useProfile.getState().load('u1');

      expect(useProfile.getState().status).toBe('ready');
      expect(useProfile.getState().levels).toEqual({ math: { level: 3, locked: true } });
    });

    it('이미 프로필이 있으면 재조회 중 status 를 loading 으로 내리지 않는다', async () => {
      useProfile.setState({ profile: baseProfile(), levels: {}, status: 'ready' });
      h.responses['profiles'] = { data: baseProfile(), error: null };
      h.responses['profile_subject_levels'] = { data: [], error: null };

      const seen: string[] = [];
      const unsub = useProfile.subscribe((s) => seen.push(s.status));
      await useProfile.getState().load('u1');
      unsub();

      expect(seen).not.toContain('loading');
    });

    it('프로필이 없으면 조회 중 status 를 loading 으로 내린다', async () => {
      h.responses['profiles'] = { data: baseProfile(), error: null };
      h.responses['profile_subject_levels'] = { data: [], error: null };

      const seen: string[] = [];
      const unsub = useProfile.subscribe((s) => seen.push(s.status));
      await useProfile.getState().load('u1');
      unsub();

      expect(seen).toContain('loading');
    });
  });

  describe('setSubjectLevel', () => {
    it('upsert 가 실패하면 로컬 levels 를 그대로 둔다', async () => {
      useProfile.setState({ profile: baseProfile(), levels: {}, status: 'ready' });
      h.responses['profile_subject_levels:upsert'] = { error: { message: 'nope' } };

      await useProfile.getState().setSubjectLevel('math', 4);

      expect(useProfile.getState().levels).toEqual({});
    });

    it('upsert 가 성공하면 로컬 levels 를 갱신한다', async () => {
      useProfile.setState({ profile: baseProfile(), levels: {}, status: 'ready' });
      h.responses['profile_subject_levels:upsert'] = { error: null };

      await useProfile.getState().setSubjectLevel('math', 4);

      expect(useProfile.getState().levels).toEqual({ math: { level: 4, locked: false } });
    });
  });
});
