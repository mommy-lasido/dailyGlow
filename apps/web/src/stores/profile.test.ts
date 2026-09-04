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

  const signOut = vi.fn().mockResolvedValue({ error: null });
  return { responses, makeBuilder, signOut };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => h.makeBuilder(table),
    auth: { signOut: h.signOut },
  },
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
    h.signOut.mockClear();
  });

  describe('load', () => {
    it('과목 레벨 조회가 실패하면 status 를 error 로 둔다', async () => {
      h.responses['profiles'] = { data: baseProfile(), error: null };
      h.responses['profile_subject_levels'] = { data: null, error: { message: 'boom' } };

      await useProfile.getState().load('u1');

      expect(useProfile.getState().status).toBe('error');
      expect(useProfile.getState().profile).toBeNull();
    });

    it('로그인이 만료됐으면(PGRST301) 로그아웃시키고 오류 화면을 띄우지 않는다', async () => {
      // db:reset 뒤 예전 세션이 남은 상황. 연결 문제가 아니라 로그인 만료라
      // "다시 해보기" 카드가 아니라 로그인 화면으로 가야 한다.
      h.responses['profiles'] = {
        data: null,
        error: { code: 'PGRST301', message: 'JWT cryptographic operation failed' },
      };
      h.responses['profile_subject_levels'] = { data: [], error: null };

      await useProfile.getState().load('u1');

      expect(h.signOut).toHaveBeenCalled();
      expect(useProfile.getState().status).not.toBe('error');
      expect(useProfile.getState().profile).toBeNull();
    });

    it('code 가 없어도 메시지에 JWT 가 있으면 로그인 만료로 본다', async () => {
      h.responses['profiles'] = { data: baseProfile(), error: null };
      h.responses['profile_subject_levels'] = {
        data: null,
        error: { message: 'JWT expired' },
      };

      await useProfile.getState().load('u1');

      expect(h.signOut).toHaveBeenCalled();
      expect(useProfile.getState().status).not.toBe('error');
    });

    it('연결 실패는 로그아웃시키지 않고 error 로 남긴다', async () => {
      h.responses['profiles'] = { data: null, error: { message: 'Failed to fetch' } };
      h.responses['profile_subject_levels'] = { data: [], error: null };

      await useProfile.getState().load('u1');

      expect(h.signOut).not.toHaveBeenCalled();
      expect(useProfile.getState().status).toBe('error');
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

    it('조회 도중 clear 가 일어나면 늦게 온 결과를 반영하지 않는다', async () => {
      // 로그아웃이 조회 도중에 끼어드는 경우. 늦게 온 응답이 프로필을 되살리면
      // 다음 아이 화면에 앞 아이 이름과 활동 목록이 잠깐 보인다.
      h.responses['profiles'] = { data: baseProfile(), error: null };
      h.responses['profile_subject_levels'] = {
        data: [{ subject_id: 'math', level: 3, locked: false }],
        error: null,
      };

      const pending = useProfile.getState().load('u1');
      useProfile.getState().clear();
      await pending;

      expect(useProfile.getState().profile).toBeNull();
      expect(useProfile.getState().levels).toEqual({});
      expect(useProfile.getState().status).toBe('idle');
    });

    it('다음 아이의 load 는 status 를 다시 loading 으로 내린다', async () => {
      useProfile.setState({ profile: baseProfile(), levels: {}, status: 'ready' });
      h.responses['profiles'] = { data: baseProfile({ display_name: '시윤' }), error: null };
      h.responses['profile_subject_levels'] = { data: [], error: null };

      useProfile.getState().clear();
      const seen: string[] = [];
      const unsub = useProfile.subscribe((s) => seen.push(s.status));
      await useProfile.getState().load('u2');
      unsub();

      expect(seen).toContain('loading');
      expect(useProfile.getState().profile?.display_name).toBe('시윤');
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

  describe('save', () => {
    it('실패하면 PostgREST 영어 원문 대신 한국어 문장을 돌려준다', async () => {
      useProfile.setState({ profile: baseProfile(), levels: {}, status: 'ready' });
      h.responses['profiles'] = {
        data: null,
        error: { message: 'new row violates row-level security policy for table "profiles"' },
      };

      const res = await useProfile.getState().save({ display_name: '시윤' });

      expect(res.error).toBe('권한이 없어요. 로그아웃했다가 다시 들어와 주세요.');
    });
  });

  describe('initializeSubjectLevels', () => {
    beforeEach(() => {
      h.responses['subjects'] = {
        data: [
          { id: 'subj-hangul', slug: 'hangul' },
          { id: 'subj-math', slug: 'math' },
        ],
        error: null,
      };
    });

    it('한글은 읽기 수준에서 뽑은 단계로, 나머지 과목은 1단계로 채운다', async () => {
      useProfile.setState({ profile: baseProfile(), levels: {}, status: 'ready' });
      h.responses['profile_subject_levels:upsert'] = { error: null };

      const res = await useProfile.getState().initializeSubjectLevels('learning');

      expect(res.error).toBeUndefined();
      expect(useProfile.getState().levels).toEqual({
        'subj-hangul': { level: 4, locked: false },
        'subj-math': { level: 1, locked: false },
      });
    });

    it('이미 레벨이 있는 과목은 건드리지 않는다', async () => {
      useProfile.setState({
        profile: baseProfile(),
        levels: { 'subj-hangul': { level: 12, locked: true } },
        status: 'ready',
      });
      h.responses['profile_subject_levels:upsert'] = { error: null };

      await useProfile.getState().initializeSubjectLevels('pre_reader');

      expect(useProfile.getState().levels).toEqual({
        'subj-hangul': { level: 12, locked: true },
        'subj-math': { level: 1, locked: false },
      });
    });

    it('채울 과목이 하나도 없으면 아무것도 쓰지 않는다', async () => {
      useProfile.setState({
        profile: baseProfile(),
        levels: {
          'subj-hangul': { level: 12, locked: true },
          'subj-math': { level: 3, locked: false },
        },
        status: 'ready',
      });
      h.responses['profile_subject_levels:upsert'] = { error: { message: '불려서는 안 된다' } };

      const res = await useProfile.getState().initializeSubjectLevels('learning');

      expect(res.error).toBeUndefined();
      expect(useProfile.getState().levels['subj-hangul']).toEqual({ level: 12, locked: true });
    });

    it('쓰기에 실패하면 한국어 오류를 돌려주고 로컬 levels 를 그대로 둔다', async () => {
      useProfile.setState({ profile: baseProfile(), levels: {}, status: 'ready' });
      h.responses['profile_subject_levels:upsert'] = {
        error: { message: 'new row violates row-level security policy' },
      };

      const res = await useProfile.getState().initializeSubjectLevels('learning');

      expect(res.error).toBe('권한이 없어요. 로그아웃했다가 다시 들어와 주세요.');
      expect(res.error).not.toContain('row-level');
      expect(useProfile.getState().levels).toEqual({});
    });

    it('과목 목록 조회가 실패하면 오류를 돌려준다', async () => {
      useProfile.setState({ profile: baseProfile(), levels: {}, status: 'ready' });
      h.responses['subjects'] = { data: null, error: { message: 'boom' } };

      const res = await useProfile.getState().initializeSubjectLevels('learning');

      expect(res.error).toBeTruthy();
      expect(useProfile.getState().levels).toEqual({});
    });
  });

  describe('setSubjectLevel', () => {
    it('upsert 가 실패하면 로컬 levels 를 그대로 둔다', async () => {
      useProfile.setState({ profile: baseProfile(), levels: {}, status: 'ready' });
      h.responses['profile_subject_levels:upsert'] = { error: { message: 'nope' } };

      await useProfile.getState().setSubjectLevel('math', 4);

      expect(useProfile.getState().levels).toEqual({});
    });

    it('upsert 가 실패하면 영어 원문 대신 한국어 오류를 돌려준다', async () => {
      useProfile.setState({ profile: baseProfile(), levels: {}, status: 'ready' });
      h.responses['profile_subject_levels:upsert'] = {
        error: { message: 'new row violates row-level security policy for table "profiles"' },
      };

      const res = await useProfile.getState().setSubjectLevel('math', 4);

      expect(res.error).toBe('권한이 없어요. 로그아웃했다가 다시 들어와 주세요.');
      expect(res.error).not.toMatch(/[a-z]{4,}/);
    });

    it('upsert 가 성공하면 오류 없이 끝난다', async () => {
      useProfile.setState({ profile: baseProfile(), levels: {}, status: 'ready' });
      h.responses['profile_subject_levels:upsert'] = { error: null };

      expect(await useProfile.getState().setSubjectLevel('math', 4)).toEqual({});
    });

    it('upsert 가 성공하면 로컬 levels 를 갱신한다', async () => {
      useProfile.setState({ profile: baseProfile(), levels: {}, status: 'ready' });
      h.responses['profile_subject_levels:upsert'] = { error: null };

      await useProfile.getState().setSubjectLevel('math', 4);

      expect(useProfile.getState().levels).toEqual({ math: { level: 4, locked: false } });
    });
  });
});
