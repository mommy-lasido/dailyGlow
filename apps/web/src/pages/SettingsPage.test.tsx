import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsPage } from './SettingsPage';
import { useProfile, type ProfileRow } from '@/stores/profile';

/** 과목 조회 응답. 테스트마다 h.subjects 로 바꿔 끼운다. */
const h = vi.hoisted(() => ({
  subjects: { data: null, error: null } as { data: unknown; error: unknown },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve(h.subjects),
      }),
    }),
  },
}));

function profile(over: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: 'u1',
    display_name: '시윤',
    gender: 'female',
    birth_date: '2021-03-20',
    grade: 'preschool',
    reading_level: 'learning',
    daily_goal_minutes: 5,
    onboarded_at: '2026-09-04T00:00:00Z',
    avatar_key: null,
    total_xp: 0,
    created_at: '2026-09-04T00:00:00Z',
    ...over,
  } as ProfileRow;
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    h.subjects = {
      data: [{ id: 'subj-hangul', slug: 'hangul', title: '한글', sort_order: 1 }],
      error: null,
    };
    useProfile.setState({
      profile: profile(),
      levels: { 'subj-hangul': { level: 4, locked: false } },
      status: 'ready',
      save: vi.fn().mockResolvedValue({}),
      setSubjectLevel: vi.fn().mockResolvedValue({}),
    });
  });

  it('현재 프로필 값을 채워서 보여준다', () => {
    renderPage();
    expect((screen.getByLabelText('이름') as HTMLInputElement).value).toBe('시윤');
    expect((screen.getByLabelText('학년') as HTMLSelectElement).value).toBe('preschool');
  });

  it('성과 이름을 따로 저장한다 — display_name 은 성+이름, given_name 은 이름', async () => {
    const save = vi.fn().mockResolvedValue({});
    useProfile.setState({ save });
    renderPage();
    fireEvent.change(screen.getByLabelText('성'), { target: { value: '정' } });
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '시윤' } });
    fireEvent.click(screen.getByRole('button', { name: /프로필 저장/ }));

    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls[0]![0].display_name).toBe('정시윤');
    expect(save.mock.calls[0]![0].given_name).toBe('시윤');
  });

  it('저장된 성과 이름을 두 칸으로 나눠 채운다', () => {
    useProfile.setState({ profile: profile({ display_name: '정시윤', given_name: '시윤' }) });
    renderPage();
    expect((screen.getByLabelText('성') as HTMLInputElement).value).toBe('정');
    expect((screen.getByLabelText('이름') as HTMLInputElement).value).toBe('시윤');
  });

  it('생일 입력에 min/max 가 있어 여섯 자리 연도를 막는다', () => {
    // 온보딩 화면과 같은 범위여야 한다.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 4, 9, 0));
    try {
      renderPage();
      const input = screen.getByLabelText('생일') as HTMLInputElement;
      expect(input.min).toBe('2005-01-01');
      expect(input.max).toBe('2026-09-04');
    } finally {
      vi.useRealTimers();
    }
  });

  it('프로필을 저장하면 save 가 호출된다', async () => {
    const save = vi.fn().mockResolvedValue({});
    useProfile.setState({ save });
    renderPage();
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '시윤이' } });
    fireEvent.click(screen.getByRole('button', { name: /프로필 저장/ }));
    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls[0]![0].display_name).toBe('시윤이');
    await screen.findByText('저장했어요');
  });

  it('저장이 실패하면 오류를 보여주고 저장했어요 는 뜨지 않는다', async () => {
    const save = vi.fn().mockResolvedValue({ error: '저장하지 못했어요. 잠시 후 다시 해주세요.' });
    useProfile.setState({ save });
    renderPage();
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '시윤이' } });
    fireEvent.click(screen.getByRole('button', { name: /프로필 저장/ }));
    await screen.findByText('저장하지 못했어요. 잠시 후 다시 해주세요.');
    expect(screen.queryByText('저장했어요')).toBeNull();
  });

  it('저장에 성공한 뒤 다시 저장하다 실패하면 저장했어요 가 사라진다', async () => {
    const save = vi.fn().mockResolvedValue({});
    useProfile.setState({ save });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /프로필 저장/ }));
    await screen.findByText('저장했어요');

    save.mockResolvedValue({ error: '저장하지 못했어요. 잠시 후 다시 해주세요.' });
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '시윤이' } });
    fireEvent.click(screen.getByRole('button', { name: /프로필 저장/ }));
    await screen.findByText('저장하지 못했어요. 잠시 후 다시 해주세요.');
    expect(screen.queryByText('저장했어요')).toBeNull();
  });

  it('과목 레벨을 바꾸면 setSubjectLevel 이 호출된다', async () => {
    const setSubjectLevel = vi.fn().mockResolvedValue({});
    useProfile.setState({ setSubjectLevel });
    renderPage();
    await screen.findByText('한글');
    fireEvent.change(screen.getByLabelText('한글 단계'), { target: { value: '7' } });
    await waitFor(() => expect(setSubjectLevel).toHaveBeenCalledWith('subj-hangul', 7, false));
  });

  it('멈춤을 켜면 locked 가 true 로 전달된다', async () => {
    const setSubjectLevel = vi.fn().mockResolvedValue({});
    useProfile.setState({ setSubjectLevel });
    renderPage();
    await screen.findByText('한글');
    fireEvent.click(screen.getByLabelText('한글 여기서 멈춰'));
    await waitFor(() => expect(setSubjectLevel).toHaveBeenCalledWith('subj-hangul', 4, true));
  });

  it('과목 레벨 저장이 실패하면 그 과목 줄에 이유를 보여준다', async () => {
    const setSubjectLevel = vi
      .fn()
      .mockResolvedValue({ error: '지금은 저장하지 못했어요. 잠시 뒤에 다시 해주세요.' });
    useProfile.setState({ setSubjectLevel });
    renderPage();
    await screen.findByText('한글');
    fireEvent.change(screen.getByLabelText('한글 단계'), { target: { value: '7' } });

    await screen.findByText('지금은 저장하지 못했어요. 잠시 뒤에 다시 해주세요.');
    // 저장이 안 됐으니 값은 예전 단계 그대로다 — 그 이유를 화면이 말해준다.
    expect((screen.getByLabelText('한글 단계') as HTMLSelectElement).value).toBe('4');
  });

  it('다시 저장해서 성공하면 오류 문구가 사라진다', async () => {
    const setSubjectLevel = vi
      .fn()
      .mockResolvedValueOnce({ error: '지금은 저장하지 못했어요. 잠시 뒤에 다시 해주세요.' })
      .mockResolvedValueOnce({});
    useProfile.setState({ setSubjectLevel });
    renderPage();
    await screen.findByText('한글');

    fireEvent.change(screen.getByLabelText('한글 단계'), { target: { value: '7' } });
    await screen.findByText('지금은 저장하지 못했어요. 잠시 뒤에 다시 해주세요.');

    fireEvent.change(screen.getByLabelText('한글 단계'), { target: { value: '7' } });
    await waitFor(() =>
      expect(screen.queryByText('지금은 저장하지 못했어요. 잠시 뒤에 다시 해주세요.')).toBeNull(),
    );
  });

  it('과목 조회가 실패하면 빈 목록 대신 이유를 보여준다', async () => {
    h.subjects = { data: null, error: { message: 'boom' } };
    renderPage();
    await screen.findByText('지금 연결이 잘 안 돼요. 잠시 뒤에 다시 열어봐 주세요.');
    expect(screen.queryByLabelText('한글 단계')).toBeNull();
  });

  it('한글 단계 선택지에 무엇을 배우는지와 예시가 함께 적힌다', async () => {
    renderPage();
    await screen.findByText('한글');
    const select = screen.getByLabelText('한글 단계') as HTMLSelectElement;
    const labels = Array.from(select.options).map((o) => o.text);
    expect(labels).toContain("4단계 · 기본 자음 'ㄷ' (다, 댜, 더, 뎌…)");
    expect(labels).toContain("26단계 · 복잡한 모음 'ㅚ, ㅙ' (쇠, 죄, 돼지, 횃불…)");
    // 예시가 없는 단계는 빈 괄호를 남기지 않는다.
    expect(labels).toContain('34단계 · 한글을 예쁘게 쓰는 순서 1');
    expect(labels).toHaveLength(35);
  });

  it('선택지를 권별로 묶어 보여준다', async () => {
    renderPage();
    await screen.findByText('한글');
    const select = screen.getByLabelText('한글 단계') as HTMLSelectElement;
    const groups = Array.from(select.querySelectorAll('optgroup')).map((g) => g.label);
    expect(groups).toEqual([
      '1권 · 기본자 학습 1',
      '2권 · 기본자 학습 2',
      '3권 · 받침 학습',
      '4권 · 복잡한 모음 학습',
      '5권 · 쌍자음과 예쁘게 쓰기',
    ]);
  });

  it('지금 고른 단계에서 무엇을 배우는지 밑에 적어준다', async () => {
    renderPage();
    await screen.findByText('한글');
    // 시윤은 4단계 — 기본 자음 'ㄷ'
    expect(screen.getByText("4단계 · 기본 자음 'ㄷ'")).toBeInTheDocument();
    expect(screen.getByText('다, 댜, 더, 뎌…')).toBeInTheDocument();
  });

  it('한글이 아닌 과목에는 단계 조절을 보여주지 않는다', async () => {
    h.subjects = {
      data: [
        { id: 'subj-hangul', slug: 'hangul', title: '한글', sort_order: 1 },
        { id: 'subj-math', slug: 'math', title: '수학', sort_order: 4 },
      ],
      error: null,
    };
    renderPage();
    await screen.findByText('수학');
    expect(screen.getByLabelText('한글 단계')).toBeInTheDocument();
    expect(screen.queryByLabelText('수학 단계')).toBeNull();
    expect(screen.queryByLabelText('수학 여기서 멈춰')).toBeNull();
    expect(screen.getByText('단계는 이 과목의 활동이 준비되면 열려요.')).toBeInTheDocument();
  });

  it('과목이 하나도 없으면 비었다고 알려준다', async () => {
    h.subjects = { data: [], error: null };
    renderPage();
    await screen.findByText('아직 등록된 과목이 없어요.');
  });

  it('이름을 비우면 저장 버튼이 잠기고, 내용이 있으면 풀린다', () => {
    renderPage();
    const button = screen.getByRole('button', { name: /프로필 저장/ });
    expect(button).toBeEnabled();

    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '' } });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '   ' } });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '시윤' } });
    expect(button).toBeEnabled();
  });

  it('저장하는 동안에는 저장 버튼을 다시 누를 수 없다', async () => {
    let release: (v: unknown) => void = () => {};
    const save = vi.fn().mockReturnValue(new Promise((r) => (release = r)));
    useProfile.setState({ save });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /프로필 저장/ }));
    const button = await screen.findByRole('button', { name: '저장하는 중…' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(save).toHaveBeenCalledTimes(1);

    release({});
    await waitFor(() => expect(screen.getByRole('button', { name: '프로필 저장' })).toBeEnabled());
  });
});
