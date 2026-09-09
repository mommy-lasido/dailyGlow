import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LevelSuggestionCard } from './LevelSuggestionCard';
import { useProfile } from '@/stores/profile';
import type { LevelSuggestion } from '@/lib/promotion';

const promote: LevelSuggestion = {
  kind: 'promote',
  subjectId: 'math',
  subjectTitle: '수학',
  lessonTitle: '수 세기 놀이',
  toLevel: 2,
  unlocksTitle: '더하기 놀이',
};

const demote: LevelSuggestion = {
  kind: 'demote',
  subjectId: 'math',
  subjectTitle: '수학',
  lessonTitle: '더하기 놀이',
  toLevel: 1,
  unlocksTitle: null,
};

const setSubjectLevel = vi.fn();

beforeEach(() => {
  setSubjectLevel.mockReset();
  setSubjectLevel.mockResolvedValue({});
  useProfile.setState({ setSubjectLevel } as never);
});

describe('LevelSuggestionCard', () => {
  it('올릴 때가 됐다고 알려주고, 무엇이 열리는지 말해준다', () => {
    render(<LevelSuggestionCard suggestion={promote} onDone={() => {}} />);
    expect(screen.getByText(/다음 단계로 넘어가도 될 것 같아요/)).toBeInTheDocument();
    expect(screen.getByText('더하기 놀이')).toBeInTheDocument();
  });

  it('누르기 전에는 단계를 바꾸지 않는다', () => {
    // 앱이 혼자 바꿔버리면 아이가 갑자기 어려워할 때 왜 그런지 알 수 없다.
    render(<LevelSuggestionCard suggestion={promote} onDone={() => {}} />);
    expect(setSubjectLevel).not.toHaveBeenCalled();
  });

  it('승인하면 그 단계로 올린다', async () => {
    const onDone = vi.fn();
    render(<LevelSuggestionCard suggestion={promote} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: '다음 단계로 올리기' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(setSubjectLevel).toHaveBeenCalledWith('math', 2);
  });

  it('"나중에" 를 누르면 카드만 사라지고 단계는 그대로다', () => {
    render(<LevelSuggestionCard suggestion={promote} onDone={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '나중에' }));
    expect(screen.queryByTestId('level-suggestion')).not.toBeInTheDocument();
    expect(setSubjectLevel).not.toHaveBeenCalled();
  });

  it('저장이 실패하면 실패했다고 말한다', async () => {
    // 조용히 넘기면 부모는 바뀐 줄 알고 넘어간다.
    setSubjectLevel.mockResolvedValue({ error: '연결이 끊겼습니다.' });
    const onDone = vi.fn();
    render(<LevelSuggestionCard suggestion={promote} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: '다음 단계로 올리기' }));
    expect(await screen.findByText(/지금 저장이 안 됐어요/)).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByTestId('level-suggestion')).toBeInTheDocument();
  });

  it('버거워할 때는 내리자고 하되, 무엇이 열린다는 말은 하지 않는다', () => {
    render(<LevelSuggestionCard suggestion={demote} onDone={() => {}} />);
    expect(screen.getByText(/조금 어려운 것 같아요/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '한 단계 내리기' })).toBeInTheDocument();
    expect(screen.queryByText(/새로 열려요/)).not.toBeInTheDocument();
  });

  it('점수가 1차만 센 것이라는 점을 밝힌다', () => {
    render(<LevelSuggestionCard suggestion={promote} onDone={() => {}} />);
    expect(screen.getByText(/처음 풀었을 때만 센 점수/)).toBeInTheDocument();
  });
});
