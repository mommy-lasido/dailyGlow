import { describe, expect, it } from 'vitest';
import { playgroundKeyOf, upFrom } from './playgrounds';

describe('upFrom', () => {
  it('놀이터에서는 홈으로 간다', () => {
    expect(upFrom('/playground/math', null)).toEqual({ to: '/', label: '🏠 홈으로' });
  });

  it('활동에서는 그 활동이 사는 놀이터로 간다', () => {
    // 수 세기를 마치고 더하기를 하려는 아이가 홈까지 나갔다 오지 않게.
    expect(upFrom('/activity/abc', 'math')).toEqual({
      to: '/playground/math',
      label: '← 수학 놀이터',
    });
  });

  it('창고를 거치지 않는 활동도 제 놀이터로 간다', () => {
    expect(upFrom('/weekly', null).to).toBe('/playground/hangul');
    expect(upFrom('/spell', null).to).toBe('/playground/english');
    expect(upFrom('/science', null).to).toBe('/playground/science');
  });

  it('어느 놀이터인지 모르면 홈으로 간다', () => {
    // 목록을 아직 못 받았거나, 부모 화면처럼 놀이터에 속하지 않는 곳.
    expect(upFrom('/activity/abc', null).to).toBe('/');
    expect(upFrom('/settings', null).to).toBe('/');
    expect(upFrom('/activity/abc', '없는과목').to).toBe('/');
  });

  it('국어도 한글 놀이터에 산다', () => {
    expect(playgroundKeyOf('korean')).toBe('hangul');
    expect(playgroundKeyOf('hangul')).toBe('hangul');
    expect(playgroundKeyOf('english')).toBe('english');
    expect(playgroundKeyOf('없는과목')).toBeNull();
  });
});
