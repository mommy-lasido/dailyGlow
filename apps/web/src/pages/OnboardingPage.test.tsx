import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingPage } from './OnboardingPage';
import { useAuth } from '@/stores/auth';
import { useProfile, type ProfileRow } from '@/stores/profile';

function profile(over: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: 'u1',
    display_name: '친구',
    gender: null,
    birth_date: null,
    grade: null,
    reading_level: null,
    daily_goal_minutes: 10,
    onboarded_at: null,
    avatar_key: null,
    total_xp: 0,
    created_at: '2026-09-04T00:00:00Z',
    ...over,
  } as ProfileRow;
}

describe('OnboardingPage', () => {
  beforeEach(() => {
    // 추천 학년은 "오늘"에 따라 달라지므로 Date 만 고정한다.
    // 타이머는 진짜로 두어야 waitFor 가 동작한다.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-04T09:00:00'));
    useProfile.setState({
      profile: profile(),
      levels: {},
      status: 'ready',
      save: vi.fn().mockResolvedValue({}),
      initializeSubjectLevels: vi.fn().mockResolvedValue({}),
    });
    useAuth.setState({ signOut: vi.fn().mockResolvedValue(undefined) });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>,
    );
  }

  it('생일을 넣으면 학년 추천값이 자동으로 채워진다', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('생일'), { target: { value: '2018-05-10' } });
    await waitFor(() => {
      expect((screen.getByLabelText('학년') as HTMLSelectElement).value).toBe('g2');
    });
  });

  it('추천값을 사용자가 덮어쓸 수 있다', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('생일'), { target: { value: '2018-05-10' } });
    await waitFor(() =>
      expect((screen.getByLabelText('학년') as HTMLSelectElement).value).toBe('g2'),
    );
    fireEvent.change(screen.getByLabelText('학년'), { target: { value: 'g3' } });
    expect((screen.getByLabelText('학년') as HTMLSelectElement).value).toBe('g3');
  });

  it('생일 입력에 min/max 가 있어 여섯 자리 연도를 막는다', () => {
    renderPage();
    const input = screen.getByLabelText('생일') as HTMLInputElement;
    expect(input.min).toBe('2005-01-01');
    expect(input.max).toBe('2026-09-04');
  });

  it('이름이 비어 있으면 저장 버튼이 비활성화된다', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '' } });
    expect(screen.getByRole('button', { name: /시작하기/ })).toBeDisabled();
  });

  it('저장하면 입력한 값과 onboarded_at 이 함께 전달된다', async () => {
    const save = vi.fn().mockResolvedValue({});
    useProfile.setState({ save });
    renderPage();

    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '라윤' } });
    fireEvent.change(screen.getByLabelText('생일'), { target: { value: '2018-05-10' } });
    fireEvent.change(screen.getByLabelText('학년'), { target: { value: 'g3' } });
    fireEvent.click(screen.getByRole('button', { name: /시작하기/ }));

    await waitFor(() => expect(save).toHaveBeenCalled());
    const patch = save.mock.calls[0]![0];
    expect(patch.display_name).toBe('라윤');
    expect(patch.grade).toBe('g3');
    expect(patch.birth_date).toBe('2018-05-10');
    expect(patch.onboarded_at).toBeTruthy();
  });

  it('저장이 끝나면 고른 읽기 수준으로 과목 초기 레벨을 제안한다', async () => {
    const initializeSubjectLevels = vi.fn().mockResolvedValue({});
    useProfile.setState({ initializeSubjectLevels });
    renderPage();

    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '시윤' } });
    fireEvent.change(screen.getByLabelText('한글 읽기'), { target: { value: 'learning' } });
    fireEvent.click(screen.getByRole('button', { name: /시작하기/ }));

    await waitFor(() => expect(initializeSubjectLevels).toHaveBeenCalledWith('learning'));
  });

  it('읽기 수준을 고르지 않았으면 null 로 넘긴다', async () => {
    const initializeSubjectLevels = vi.fn().mockResolvedValue({});
    useProfile.setState({ initializeSubjectLevels });
    renderPage();

    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '시윤' } });
    fireEvent.click(screen.getByRole('button', { name: /시작하기/ }));

    await waitFor(() => expect(initializeSubjectLevels).toHaveBeenCalledWith(null));
  });

  it('초기 레벨 제안이 실패하면 오류를 보여주고 홈으로 보내지 않는다', async () => {
    useProfile.setState({
      initializeSubjectLevels: vi
        .fn()
        .mockResolvedValue({ error: '지금은 저장하지 못했어요. 잠시 뒤에 다시 해주세요.' }),
    });
    renderPage();

    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '시윤' } });
    fireEvent.click(screen.getByRole('button', { name: /시작하기/ }));

    await screen.findByText('지금은 저장하지 못했어요. 잠시 뒤에 다시 해주세요.');
    expect(screen.getByRole('button', { name: /시작하기/ })).toBeInTheDocument();
  });

  it('이미 온보딩을 마쳤으면 폼 대신 홈으로 보낸다', () => {
    useProfile.setState({ profile: profile({ onboarded_at: '2026-09-04T00:00:00Z' }) });
    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/" element={<p>홈 화면</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('홈 화면')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /시작하기/ })).toBeNull();
  });

  it('프로필에 값이 있으면 폼을 그 값으로 채운다', () => {
    useProfile.setState({
      profile: profile({
        display_name: '시윤',
        gender: 'female',
        birth_date: '2021-03-20',
        grade: 'preschool',
        reading_level: 'learning',
        daily_goal_minutes: 5,
      }),
    });
    renderPage();
    expect((screen.getByLabelText('이름') as HTMLInputElement).value).toBe('시윤');
    expect((screen.getByLabelText('성별') as HTMLSelectElement).value).toBe('female');
    expect((screen.getByLabelText('생일') as HTMLInputElement).value).toBe('2021-03-20');
    expect((screen.getByLabelText('학년') as HTMLSelectElement).value).toBe('preschool');
    expect((screen.getByLabelText('한글 읽기') as HTMLSelectElement).value).toBe('learning');
    expect((screen.getByLabelText('하루 목표') as HTMLSelectElement).value).toBe('5');
  });

  it('로그아웃을 누르면 signOut 이 호출된다', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    useAuth.setState({ signOut });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    await waitFor(() => expect(signOut).toHaveBeenCalled());
  });
});
