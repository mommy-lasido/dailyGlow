import { beforeEach, describe, expect, it } from 'vitest';
import { clearReview, mixReview, recentWrong, rememberWrong } from './review';

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Storage;
}

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: memoryStorage(),
    configurable: true,
  });
});

describe('rememberWrong · recentWrong', () => {
  it('틀린 것을 적어 두고 다시 꺼낸다', () => {
    rememberWrong('아이1', 'words', ['조개', '나비']);
    expect(recentWrong('아이1', 'words')).toContain('조개');
  });

  it('많이 틀린 것이 앞에 온다', () => {
    rememberWrong('아이1', 'words', ['조개', '나비']);
    rememberWrong('아이1', 'words', ['나비']);
    expect(recentWrong('아이1', 'words')[0]).toBe('나비');
  });

  it('아이마다 따로 담는다', () => {
    // 태블릿 하나를 세 아이가 쓴다.
    rememberWrong('아이1', 'words', ['조개']);
    expect(recentWrong('아이2', 'words')).toEqual([]);
  });

  it('자리마다 따로 담는다', () => {
    rememberWrong('아이1', 'words', ['조개']);
    expect(recentWrong('아이1', 'spelling')).toEqual([]);
  });

  it('지우면 없어진다', () => {
    rememberWrong('아이1', 'words', ['조개']);
    clearReview('아이1', 'words');
    expect(recentWrong('아이1', 'words')).toEqual([]);
  });
});

describe('mixReview', () => {
  const pool = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차'];
  const same = (x: string) => x;

  it('틀렸던 것을 먼저 넣는다', () => {
    const picked = mixReview(pool, same, ['자', '차'], 4, () => 0.5);
    expect(picked).toContain('자');
    expect(picked).toContain('차');
  });

  it('한 판을 틀린 것으로만 채우지는 않는다', () => {
    // 못하는 것만 줄줄이 나오면 아이가 앉기 싫어진다.
    const wrong = [...pool];
    const picked = mixReview(pool, same, wrong, 10, () => 0.5);
    const fromWrong = picked.filter((p) => wrong.slice(0, 5).includes(p));
    expect(fromWrong.length).toBeLessThanOrEqual(5);
  });

  it('고른 것끼리 겹치지 않는다', () => {
    const picked = mixReview(pool, same, ['가', '가', '나'], 6, () => 0.5);
    expect(new Set(picked).size).toBe(picked.length);
  });

  it('낼 것이 판 크기보다 적으면 그대로 둔다', () => {
    const small = ['가', '나'];
    expect(mixReview(small, same, ['가'], 10)).toEqual(small);
  });
});
