import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaygroundPage } from './PlaygroundPage';
import { useProfile, type ProfileRow } from '@/stores/profile';

vi.mock('@/lib/activities', async () => {
  const actual = await vi.importActual<typeof import('@/lib/activities')>('@/lib/activities');
  return {
    ...actual,
    // 이번 주의 과학을 봤는지는 창고에 묻는다. 여기서는 늘 "아직" 이라고 답한다.
    scienceDoneThisWeek: vi.fn().mockResolvedValue(false),
  };
});

// 활동 카탈로그 질의의 응답을 테스트마다 갈아끼울 수 있게 해 둔다.
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

/** 카탈로그 질의가 기대하는 원본 행 모양 (subjects 는 조인 결과). */
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

function renderPlayground(key: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/playground/${key}`]}>
        <Routes>
          <Route path="/playground/:key" element={<PlaygroundPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PlaygroundPage', () => {
  beforeEach(() => {
    catalog.response = { data: [], error: null };
    useProfile.setState({ profile: profile(), levels: {}, status: 'ready' });
  });

  it('놀이터 이름을 머리글로 보여준다', () => {
    renderPlayground('math');
    expect(screen.getByText('수학 놀이터')).toBeInTheDocument();
  });

  it('그 놀이터의 활동만 담는다', async () => {
    catalog.response = {
      data: [
        lessonRow(),
        lessonRow({
          id: 'jamo',
          title: '자음모음 배우기',
          subject_id: 'subj-hangul',
          subjects: { slug: 'hangul', title: '한글', sort_order: 1 },
        }),
      ],
      error: null,
    };
    renderPlayground('math');
    expect(await screen.findByText('덧셈 놀이')).toBeInTheDocument();
    expect(screen.queryByText('자음모음 배우기')).not.toBeInTheDocument();
  });

  it('불러오는 동안에는 빈 화면 안내 대신 조용한 자리표시자를 보여준다', () => {
    renderPlayground('math');
    expect(screen.getByText(/불러오는 중이에요/)).toBeInTheDocument();
    expect(screen.queryByText(/아직 준비된 공부가 없어요/)).not.toBeInTheDocument();
  });

  it('카탈로그 조회가 실패하면 연결 문제 안내를 보여준다', async () => {
    catalog.response = { data: null, error: { message: '네트워크 오류' } };
    renderPlayground('math');
    expect(await screen.findByText(/연결이 잘 안 돼요/)).toBeInTheDocument();
    expect(screen.queryByText(/아직 준비된 공부가 없어요/)).not.toBeInTheDocument();
  });

  it('조회는 됐지만 맞는 활동이 없으면 학년·단계 확인 안내를 보여준다', async () => {
    catalog.response = { data: [], error: null };
    renderPlayground('math');
    expect(await screen.findByText(/아직 준비된 공부가 없어요/)).toBeInTheDocument();
    expect(screen.queryByText(/연결이 잘 안 돼요/)).not.toBeInTheDocument();
  });

  it('config.hint 가 있으면 제목 밑에 예시를 보여준다', async () => {
    catalog.response = { data: [lessonRow({ config: { hint: '3 + 2 = ?' } })], error: null };
    const { container } = renderPlayground('math');
    expect(await screen.findByText('3 + 2 = ?')).toBeInTheDocument();
    expect(container.querySelectorAll('a p')).toHaveLength(1);
  });

  it('config.hint 가 없으면 예시 줄 없이 제목만 보여준다', async () => {
    catalog.response = { data: [lessonRow({ config: {} })], error: null };
    const { container } = renderPlayground('math');
    expect(await screen.findByText('덧셈 놀이')).toBeInTheDocument();
    expect(container.querySelectorAll('a p')).toHaveLength(0);
  });

  it('한글 놀이터에는 이번 주의 글자가 맨 위에 온다', async () => {
    catalog.response = {
      data: [
        lessonRow({
          id: 'jamo',
          title: '자음모음 배우기',
          subject_id: 'subj-hangul',
          subjects: { slug: 'hangul', title: '한글', sort_order: 1 },
        }),
      ],
      error: null,
    };
    renderPlayground('hangul');
    expect(await screen.findByText('이번 주에 배울 글자')).toBeInTheDocument();
  });

  it('과학 놀이터 카드는 창고와 상관없이 늘 있다', async () => {
    // 과학은 내용이 앱 안에 들어 있어 창고의 활동 목록을 거치지 않는다.
    catalog.response = { data: [], error: null };
    renderPlayground('science');
    expect(await screen.findByText('이번 주의 과학')).toBeInTheDocument();
    expect(screen.queryByText(/아직 준비된 공부가 없어요/)).not.toBeInTheDocument();
  });

  it('영어 놀이터에는 철자 맞추기가 늘 있다', async () => {
    catalog.response = { data: [], error: null };
    renderPlayground('english');
    expect(await screen.findByTestId('spell-card')).toBeInTheDocument();
  });

  it('없는 놀이터를 열면 홈으로 돌아갈 길을 준다', () => {
    renderPlayground('없는곳');
    expect(screen.getByText('그런 놀이터는 없어요.')).toBeInTheDocument();
    expect(screen.getByText('홈으로 가기').closest('a')).toHaveAttribute('href', '/');
  });
});
