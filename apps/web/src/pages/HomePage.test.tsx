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

// 활동 카탈로그 질의의 응답을 테스트마다 갈아끼울 수 있게 해 둔다.
// (활동 선별 규칙 자체는 activities.test 에서 검증하고, 여기서는 화면 상태 전환만 본다.)
const { catalog } = vi.hoisted(() => ({
  catalog: { response: { data: null as unknown, error: null as unknown } },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ order: () => Promise.resolve(catalog.response) }),
    }),
  },
}));

function profile(over: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: 'u1',
    display_name: '라윤',
    given_name: '라윤',
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

/** HomePage 의 카탈로그 queryFn 이 기대하는 원본 행 모양 (subjects 는 조인 결과). */
function lessonRow(over: Record<string, unknown> = {}) {
  return {
    id: 'add',
    title: '덧셈 놀이',
    activity_kind: 'grid_drill',
    subject_id: 'subj-math',
    subject_level: 1,
    min_grade: 1,
    max_grade: 6,
    sort_order: 1,
    config: {},
    subjects: { slug: 'math', title: '수학', sort_order: 3 },
    ...over,
  };
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
    catalog.response = { data: [], error: null };
    useProfile.setState({ profile: profile(), levels: {}, status: 'ready' });
  });

  it('아이 이름으로 인사한다', () => {
    renderHome();
    expect(screen.getByText(/라윤/)).toBeInTheDocument();
  });

  it('성을 뺀 이름으로 부른다', () => {
    useProfile.setState({
      profile: profile({ display_name: '정라윤', given_name: '라윤' }),
    });
    renderHome();
    expect(screen.getByTestId('greeting')).toHaveTextContent('라윤아');
    expect(screen.getByTestId('greeting')).not.toHaveTextContent('정라윤');
  });

  it('given_name 이 없는 예전 행은 display_name 으로 부른다', () => {
    useProfile.setState({ profile: profile({ display_name: '라윤', given_name: null }) });
    renderHome();
    expect(screen.getByTestId('greeting')).toHaveTextContent('라윤아');
  });

  it('받침이 없는 이름에는 야 를 붙인다', () => {
    useProfile.setState({
      profile: profile({ display_name: '김지호', given_name: '지호' }),
    });
    renderHome();
    expect(screen.getByTestId('greeting')).toHaveTextContent('지호야');
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

  it('불러오는 동안에는 빈 화면 안내 대신 조용한 자리표시자를 보여준다', () => {
    renderHome();
    expect(screen.getByText(/불러오는 중이에요/)).toBeInTheDocument();
    expect(screen.queryByText(/아직 준비된 공부가 없어요/)).not.toBeInTheDocument();
  });

  it('카탈로그 조회가 실패하면 연결 문제 안내를 보여준다', async () => {
    catalog.response = { data: null, error: { message: '네트워크 오류' } };
    renderHome();
    expect(await screen.findByText(/연결이 잘 안 돼요/)).toBeInTheDocument();
    // 오류일 때는 학년·단계를 확인하라는 안내를 하지 않는다.
    expect(screen.queryByText(/아직 준비된 공부가 없어요/)).not.toBeInTheDocument();
  });

  it('조회는 됐지만 맞는 활동이 없으면 학년·단계 확인 안내를 보여준다', async () => {
    catalog.response = { data: [], error: null };
    renderHome();
    expect(await screen.findByText(/아직 준비된 공부가 없어요/)).toBeInTheDocument();
    expect(screen.queryByText(/연결이 잘 안 돼요/)).not.toBeInTheDocument();
  });

  it('맞는 활동이 있으면 활동 카드를 보여준다', async () => {
    catalog.response = { data: [lessonRow()], error: null };
    renderHome();
    expect(await screen.findByText('덧셈 놀이')).toBeInTheDocument();
    expect(screen.getByText('수학')).toBeInTheDocument();
    expect(screen.queryByText(/아직 준비된 공부가 없어요/)).not.toBeInTheDocument();
  });

  it('config.hint 가 있으면 제목 밑에 예시를 보여준다', async () => {
    catalog.response = { data: [lessonRow({ config: { hint: '3 + 2 = ?' } })], error: null };
    renderHome();
    expect(await screen.findByText('3 + 2 = ?')).toBeInTheDocument();
  });
});
