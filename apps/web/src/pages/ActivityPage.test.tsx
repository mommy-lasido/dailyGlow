import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityPage } from './ActivityPage';
import { ACTIVITY_RENDERERS } from '@/activities/registry';
import { useProfile, type ProfileRow } from '@/stores/profile';

const h = vi.hoisted(() => ({
  lessonResponse: { data: null as unknown, error: null as unknown },
  queued: [] as unknown[],
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(h.lessonResponse) }) }),
    }),
  },
}));

vi.mock('@/lib/sync', () => ({
  queueSession: (input: unknown) => {
    h.queued.push(input);
    return Promise.resolve();
  },
}));

function profile(): ProfileRow {
  return {
    id: 'u1',
    display_name: '정시윤',
    given_name: '시윤',
    gender: 'female',
    birth_date: '2021-03-20',
    grade: 'preschool',
    reading_level: 'learning',
    daily_goal_minutes: 5,
    onboarded_at: '2026-09-04T00:00:00Z',
    avatar_key: null,
    total_xp: 0,
    created_at: '2026-09-04T00:00:00Z',
  } as ProfileRow;
}

function renderAt(lessonId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/activity/${lessonId}`]}>
        <Routes>
          <Route path="/activity/:lessonId" element={<ActivityPage />} />
          <Route path="/" element={<p>홈 화면</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ActivityPage', () => {
  beforeEach(() => {
    h.lessonResponse = { data: null, error: null };
    h.queued = [];
    for (const key of Object.keys(ACTIVITY_RENDERERS)) delete ACTIVITY_RENDERERS[key];
    useProfile.setState({ profile: profile(), levels: {}, status: 'ready' });
  });

  it('등록된 렌더러가 없으면 준비 중 화면을 보여준다', async () => {
    h.lessonResponse = {
      data: { id: 'l1', title: '문장 읽기', activity_kind: 'reading_cards', config: {} },
      error: null,
    };
    renderAt('l1');
    expect(await screen.findByText(/곧 만들어질 공부예요/)).toBeInTheDocument();
  });

  it('등록된 렌더러가 있으면 그 활동을 그린다', async () => {
    ACTIVITY_RENDERERS.add_play = () => <p>더하기 화면</p>;
    h.lessonResponse = {
      data: {
        id: 'l2',
        title: '더하기 놀이',
        activity_kind: 'choice_quiz',
        config: { renderer: 'add_play' },
      },
      error: null,
    };
    renderAt('l2');
    expect(await screen.findByText('더하기 화면')).toBeInTheDocument();
  });

  it('활동이 끝나면 결과를 기록한다', async () => {
    ACTIVITY_RENDERERS.add_play = ({ onFinish }) => (
      <button onClick={() => onFinish({ totalCount: 10, correctCount: 8, durationSec: 42 })}>
        끝내기
      </button>
    );
    h.lessonResponse = {
      data: {
        id: 'l2',
        title: '더하기 놀이',
        activity_kind: 'choice_quiz',
        config: { renderer: 'add_play' },
      },
      error: null,
    };
    renderAt('l2');
    fireEvent.click(await screen.findByRole('button', { name: '끝내기' }));
    await waitFor(() => expect(h.queued).toHaveLength(1));
    const rec = h.queued[0] as Record<string, unknown>;
    expect(rec.profileId).toBe('u1');
    expect(rec.lessonId).toBe('l2');
    expect(rec.activityKind).toBe('choice_quiz');
    expect(rec.mode).toBe('screen');
    expect(rec.totalCount).toBe(10);
    expect(rec.correctCount).toBe(8);
    expect(rec.durationSec).toBe(42);
  });

  it('없는 레슨이면 안내를 보여준다', async () => {
    h.lessonResponse = { data: null, error: null };
    renderAt('nope');
    expect(await screen.findByText(/찾을 수 없어요/)).toBeInTheDocument();
  });

  it('불러오다 실패하면 연결 문제라고 알려준다', async () => {
    h.lessonResponse = { data: null, error: { message: '네트워크 오류' } };
    renderAt('l1');
    expect(await screen.findByText(/연결이 잘 안 돼요/)).toBeInTheDocument();
  });
});
