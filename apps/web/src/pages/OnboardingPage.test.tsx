import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingPage } from './OnboardingPage';
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
});
