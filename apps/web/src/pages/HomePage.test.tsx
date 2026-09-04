import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from './HomePage';
import { useProfile, type ProfileRow } from '@/stores/profile';

vi.mock('@/lib/activities', async () => {
  const actual = await vi.importActual<typeof import('@/lib/activities')>('@/lib/activities');
  return { ...actual, fetchTodayMinutes: vi.fn().mockResolvedValue(9) };
});

// 활동 카탈로그 질의는 빈 목록으로 응답시킨다 (활동 선별 자체는 activities.test 에서 검증).
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
    }),
  },
}));

function profile(over: Partial<ProfileRow> = {}): ProfileRow {
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

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    useProfile.setState({ profile: profile(), levels: {}, status: 'ready' });
  });

  it('아이 이름으로 인사한다', () => {
    renderHome();
    expect(screen.getByText(/라윤/)).toBeInTheDocument();
  });

  it('하루 목표를 보여준다', () => {
    renderHome();
    expect(screen.getByText(/15분/)).toBeInTheDocument();
  });

  it('아직 못 읽는 아이에게는 큰 글씨 클래스를 쓴다', () => {
    useProfile.setState({ profile: profile({ display_name: '도윤', reading_level: 'pre_reader' }) });
    renderHome();
    expect(screen.getByTestId('greeting')).toHaveClass('text-5xl');
  });

  it('혼자 읽는 아이에게는 보통 글씨 크기를 쓴다', () => {
    renderHome();
    expect(screen.getByTestId('greeting')).toHaveClass('text-3xl');
  });
});
