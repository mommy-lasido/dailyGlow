import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from './HomePage';
import { useProfile, type ProfileRow } from '@/stores/profile';

vi.mock('@/lib/activities', async () => {
  const actual = await vi.importActual<typeof import('@/lib/activities')>('@/lib/activities');
  return {
    ...actual,
    fetchTodayMinutes: vi.fn().mockResolvedValue(9),
    fetchTotalMinutes: vi.fn().mockResolvedValue(132),
    // 실제 조회 대신, 오늘까지 사흘 공부한 한 주를 돌려준다.
    fetchWeek: vi.fn().mockImplementation(async () =>
      actual.toWeek(
        [
          { created_at: new Date().toISOString(), duration_sec: 600 },
        ],
        new Date(),
      ),
    ),
  };
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

  it('given_name 이 빈 문자열이면 display_name 으로 부른다', () => {
    useProfile.setState({ profile: profile({ display_name: '정라윤', given_name: '' }) });
    renderHome();
    // 빈 이름 + 호격 조사만 남지 않고, 온전한 이름으로 부른다.
    expect(screen.getByTestId('greeting')).toHaveTextContent('정라윤');
  });

  it('받침이 없는 이름에는 야 를 붙인다', () => {
    useProfile.setState({
      profile: profile({ display_name: '김지호', given_name: '지호' }),
    });
    renderHome();
    expect(screen.getByTestId('greeting')).toHaveTextContent('지호야');
  });

  it('목표 대신 오늘 공부한 시간을 보여준다', async () => {
    // 목표 시간은 다 채우고 나면 무슨 뜻인지 알기 어렵고, 못 채운 날에는
    // 모자란다는 말로만 남는다.
    renderHome();
    // 숫자만 굵게 나가므로 글자가 여러 조각으로 나뉜다. 다 이어 붙여 본다.
    expect(await screen.findByText('9분')).toBeInTheDocument();
    expect(screen.getByTestId('today-minutes')).toHaveTextContent('오늘 9분 공부했어요');
    expect(screen.queryByText(/오늘의 목표/)).not.toBeInTheDocument();
  });

  it('며칠 치를 합한 숫자는 아이 화면에 두지 않는다', async () => {
    // 아이가 쓸 일이 없는 숫자다. 그것은 설정(부모 화면)에서 본다.
    renderHome();
    await screen.findByText('9분');
    expect(screen.queryByText(/지금까지/)).not.toBeInTheDocument();
  });

  it('이번 주 출석 칸 일곱 개를 보여주고 공부한 날에 도장을 찍는다', async () => {
    renderHome();
    await screen.findByText('9분');
    const stamps = screen.getAllByTestId('stamp');
    expect(stamps).toHaveLength(7);
    expect(stamps.filter((s) => s.getAttribute('data-done') === 'yes')).toHaveLength(1);
    // 칸마다 "9/7" 처럼 달까지 적는다 — 주가 달을 넘어갈 때 날짜만으로는 헷갈린다.
    for (const d of screen.getAllByTestId('stamp-date')) {
      expect(d.textContent).toMatch(/^\d{1,2}\/\d{1,2}$/);
    }
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
    // 과목 이름은 카드에 적지 않는다 — 아이에게는 제목만 있으면 된다.
    expect(screen.queryByText('수학')).not.toBeInTheDocument();
    expect(screen.queryByText(/아직 준비된 공부가 없어요/)).not.toBeInTheDocument();
  });

  it('config.hint 가 있으면 제목 밑에 예시를 보여준다', async () => {
    catalog.response = { data: [lessonRow({ config: { hint: '3 + 2 = ?' } })], error: null };
    const { container } = renderHome();
    expect(await screen.findByText('3 + 2 = ?')).toBeInTheDocument();
    // 카드 안 <p> 는 예시 한 줄뿐. 과학 놀이터와 Spell It 카드는 창고를 거치지
    // 않고 늘 붙어 있으므로 셈에서 뺀다.
    expect(container.querySelectorAll('a:not([data-testid="science-card"]):not([data-testid="spell-card"]) p')).toHaveLength(1);
  });

  it('config.hint 가 없으면 예시 줄 없이 제목만 보여준다', async () => {
    catalog.response = { data: [lessonRow({ config: {} })], error: null };
    const { container } = renderHome();
    expect(await screen.findByText('덧셈 놀이')).toBeInTheDocument();
    // 카드에는 제목만 남는다 — 예시 자리에 빈 요소가 남지 않는다.
    expect(container.querySelectorAll('a:not([data-testid="science-card"]):not([data-testid="spell-card"]) p')).toHaveLength(0);
  });

  it('과학 놀이터 카드는 창고와 상관없이 늘 있다', async () => {
    // 과학은 내용이 앱 안에 들어 있어 창고의 활동 목록을 거치지 않는다.
    catalog.response = { data: [], error: null };
    renderHome();
    expect(await screen.findByText('과학 놀이터')).toBeInTheDocument();
  });
});
