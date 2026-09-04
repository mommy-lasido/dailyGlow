import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsPage } from './SettingsPage';
import { useProfile, type ProfileRow } from '@/stores/profile';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () =>
          Promise.resolve({
            data: [{ id: 'subj-hangul', slug: 'hangul', title: '한글', sort_order: 1 }],
            error: null,
          }),
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
    useProfile.setState({
      profile: profile(),
      levels: { 'subj-hangul': { level: 4, locked: false } },
      status: 'ready',
      save: vi.fn().mockResolvedValue({}),
      setSubjectLevel: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('현재 프로필 값을 채워서 보여준다', () => {
    renderPage();
    expect((screen.getByLabelText('이름') as HTMLInputElement).value).toBe('시윤');
    expect((screen.getByLabelText('학년') as HTMLSelectElement).value).toBe('preschool');
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
    const setSubjectLevel = vi.fn().mockResolvedValue(undefined);
    useProfile.setState({ setSubjectLevel });
    renderPage();
    await screen.findByText('한글');
    fireEvent.change(screen.getByLabelText('한글 단계'), { target: { value: '7' } });
    await waitFor(() => expect(setSubjectLevel).toHaveBeenCalledWith('subj-hangul', 7, false));
  });

  it('멈춤을 켜면 locked 가 true 로 전달된다', async () => {
    const setSubjectLevel = vi.fn().mockResolvedValue(undefined);
    useProfile.setState({ setSubjectLevel });
    renderPage();
    await screen.findByText('한글');
    fireEvent.click(screen.getByLabelText('한글 여기서 멈춰'));
    await waitFor(() => expect(setSubjectLevel).toHaveBeenCalledWith('subj-hangul', 4, true));
  });
});
