import { beforeEach, describe, expect, it } from 'vitest';
import {
  checkPin,
  clearPin,
  hasPin,
  isUnlocked,
  isValidPin,
  setPin,
} from './parentLock';

/**
 * 검사 환경에는 브라우저의 저장 자리가 없다. 같은 모양의 가짜를 끼워 둔다.
 */
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
  Object.defineProperty(window, 'sessionStorage', {
    value: memoryStorage(),
    configurable: true,
  });
});

describe('isValidPin', () => {
  it('숫자 네 자리만 받는다', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('0000')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('12345')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
    expect(isValidPin('')).toBe(false);
  });
});

describe('setPin · checkPin', () => {
  it('정한 비밀번호로만 열린다', () => {
    expect(hasPin()).toBe(false);
    expect(setPin('2468')).toBe(true);
    expect(hasPin()).toBe(true);
    expect(checkPin('1357')).toBe(false);
    expect(checkPin('2468')).toBe(true);
  });

  it('네 자리가 아니면 정해지지 않는다', () => {
    expect(setPin('12')).toBe(false);
    expect(hasPin()).toBe(false);
  });

  it('정하고 나면 바로 풀린 것으로 친다', () => {
    // 방금 정한 사람에게 곧바로 다시 물을 까닭이 없다.
    setPin('2468');
    expect(isUnlocked()).toBe(true);
  });

  it('한 번 풀면 그 창에서는 다시 묻지 않는다', () => {
    setPin('2468');
    window.sessionStorage.clear();
    expect(isUnlocked()).toBe(false);
    checkPin('2468');
    expect(isUnlocked()).toBe(true);
  });

  it('지우면 처음으로 돌아간다', () => {
    // 잊었을 때 다시 정할 수 있어야 한다.
    setPin('2468');
    clearPin();
    expect(hasPin()).toBe(false);
    expect(isUnlocked()).toBe(false);
  });
});
