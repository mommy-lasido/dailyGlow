import { describe, expect, it } from 'vitest';
import { createQuiz, currentIndex, nextRound, submit, type QuizState } from './quiz-flow';

/** 정답/오답 배열대로 한 라운드를 쭉 푼다. */
function solveRound(start: QuizState, results: boolean[]): QuizState {
  return results.reduce((s, ok) => submit(s, ok), start);
}

describe('createQuiz', () => {
  it('1차에 전체 문제를 순서대로 낸다', () => {
    const s = createQuiz(3);
    expect(s.round).toBe(1);
    expect(s.phase).toBe('solving');
    expect(s.queue).toEqual([0, 1, 2]);
    expect(currentIndex(s)).toBe(0);
  });
});

describe('1차', () => {
  it('틀려도 다음 문제로 넘어간다', () => {
    let s = createQuiz(3);
    s = submit(s, false);
    expect(currentIndex(s)).toBe(1);
    expect(s.phase).toBe('solving');
  });

  it('다 풀면 채점 화면으로 간다', () => {
    const s = solveRound(createQuiz(3), [true, false, true]);
    expect(s.phase).toBe('grading');
    expect(s.missed).toEqual([1]);
    expect(s.roundScores).toEqual([2]);
  });

  it('점수는 1차에 맞힌 개수다', () => {
    const s = solveRound(createQuiz(3), [true, false, true]);
    expect(s.firstTryCorrect).toBe(2);
  });

  it('다 맞히면 채점 뒤 바로 끝난다', () => {
    let s = solveRound(createQuiz(3), [true, true, true]);
    expect(s.phase).toBe('grading');
    expect(s.missed).toEqual([]);
    s = nextRound(s);
    expect(s.phase).toBe('done');
    expect(s.firstTryCorrect).toBe(3);
  });
});

describe('2차', () => {
  it('1차에 틀린 문제만 낸다', () => {
    let s = solveRound(createQuiz(4), [true, false, false, true]);
    s = nextRound(s);
    expect(s.round).toBe(2);
    expect(s.phase).toBe('solving');
    expect(s.queue).toEqual([1, 2]);
    expect(currentIndex(s)).toBe(1);
  });

  it('여기서 맞혀도 점수는 안 오른다', () => {
    let s = solveRound(createQuiz(3), [true, false, false]);
    s = nextRound(s);
    s = solveRound(s, [true, true]);
    expect(s.firstTryCorrect).toBe(1);
    expect(s.roundScores).toEqual([1, 2]);
  });

  it('여기서도 틀리면 3차로 넘어간다', () => {
    let s = solveRound(createQuiz(3), [true, false, false]);
    s = nextRound(s);
    s = solveRound(s, [true, false]);
    expect(s.phase).toBe('grading');
    expect(s.missed).toEqual([2]);
    s = nextRound(s);
    expect(s.round).toBe(3);
    expect(s.queue).toEqual([2]);
  });

  it('2차를 다 맞히면 끝난다', () => {
    let s = solveRound(createQuiz(3), [true, false, false]);
    s = nextRound(s);
    s = solveRound(s, [true, true]);
    s = nextRound(s);
    expect(s.phase).toBe('done');
  });
});

describe('3차', () => {
  function reach3(): QuizState {
    let s = solveRound(createQuiz(2), [false, true]);
    s = nextRound(s);
    s = submit(s, false);
    return nextRound(s);
  }

  it('틀리면 같은 문제에 머문다', () => {
    let s = reach3();
    expect(currentIndex(s)).toBe(0);
    s = submit(s, false);
    expect(currentIndex(s)).toBe(0);
    expect(s.phase).toBe('solving');
  });

  it('맞히면 다음으로 넘어가고, 다 맞히면 끝난다', () => {
    let s = reach3();
    s = submit(s, true);
    expect(s.phase).toBe('done');
  });

  it('3차에 맞혀도 점수는 1차 것 그대로다', () => {
    let s = reach3();
    s = submit(s, true);
    expect(s.firstTryCorrect).toBe(1);
  });
});

describe('currentIndex', () => {
  it('풀 게 없으면 null 이다', () => {
    const s = solveRound(createQuiz(1), [true]);
    expect(currentIndex(s)).toBeNull();
  });
});

describe('firstMissed — 1차에 틀린 문제', () => {
  it('1차에 틀린 번호만 모으고, 라운드가 넘어가도 지워지지 않는다', () => {
    // "무엇을 자주 틀리는가" 를 보려면 처음에 틀린 것이 필요하다.
    let q = createQuiz(3);
    q = submit(q, true); // 0번 맞음
    q = submit(q, false); // 1번 틀림
    q = submit(q, false); // 2번 틀림
    expect(q.firstMissed).toEqual([1, 2]);

    q = nextRound(q);
    expect(q.firstMissed).toEqual([1, 2]);
    q = submit(q, true);
    q = submit(q, true);
    // 2차에 다 맞혀도 1차 기록은 그대로 남는다.
    expect(q.firstMissed).toEqual([1, 2]);
  });

  it('2·3차에 틀린 것은 세지 않는다', () => {
    // 이미 한 번 틀린 것을 다시 푸는 자리라, 세면 두 번 세는 셈이 된다.
    let q = createQuiz(2);
    q = submit(q, true);
    q = submit(q, false);
    q = nextRound(q);
    q = submit(q, false);
    expect(q.firstMissed).toEqual([1]);
  });
});
