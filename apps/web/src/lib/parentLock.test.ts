import { beforeEach, describe, expect, it } from 'vitest';
import {
  checkPin,
  clearPin,
  hasPin,
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

  it('맞게 쳤다고 해서 어딘가에 풀린 표시를 남기지 않는다', () => {
    // 풀린 것은 그 화면이 떠 있는 동안에만이다. 저장해 두면 태블릿을 며칠씩
    // 켜 두는 집에서 아이가 그냥 들어가게 된다.
    setPin('2468');
    const before = window.localStorage.length;
    expect(checkPin('2468')).toBe(true);
    expect(window.localStorage.length).toBe(before);
  });

  it('지우면 처음으로 돌아간다', () => {
    // 잊었을 때 다시 정할 수 있어야 한다.
    setPin('2468');
    clearPin();
    expect(hasPin()).toBe(false);
  });
});
