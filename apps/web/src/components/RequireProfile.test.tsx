import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { RequireProfile } from './RequireProfile';
import { useProfile, type ProfileRow } from '@/stores/profile';

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

function renderAt(initial: string) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route element={<RequireProfile />}>
          <Route path="/" element={<p>홈 화면</p>} />
        </Route>
        <Route path="/onboarding" element={<p>온보딩 화면</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireProfile', () => {
  beforeEach(() => {
    useProfile.setState({ profile: null, levels: {}, status: 'idle' });
  });

  it('불러오는 중에는 아무것도 렌더하지 않는다', () => {
    useProfile.setState({ status: 'loading' });
    const { container } = renderAt('/');
    expect(container).toBeEmptyDOMElement();
  });

  it('온보딩을 마치지 않았으면 온보딩으로 보낸다', () => {
    useProfile.setState({ status: 'ready', profile: baseProfile({ onboarded_at: null }) });
    renderAt('/');
    expect(screen.getByText('온보딩 화면')).toBeInTheDocument();
  });

  it('온보딩을 마쳤으면 자식 화면을 보여준다', () => {
    useProfile.setState({ status: 'ready', profile: baseProfile() });
    renderAt('/');
    expect(screen.getByText('홈 화면')).toBeInTheDocument();
  });
});
