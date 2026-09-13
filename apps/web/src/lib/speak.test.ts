import { describe, expect, it } from 'vitest';
import { pickKoreanVoice } from './speak';

function voice(name: string, lang = 'ko-KR'): SpeechSynthesisVoice {
  return { name, lang } as SpeechSynthesisVoice;
}

describe('pickKoreanVoice', () => {
  it('한국어 목소리만 고른다', () => {
    expect(pickKoreanVoice([voice('Samantha', 'en-US')])).toBeNull();
    expect(pickKoreanVoice([])).toBeNull();
  });

  it('Google 목소리를 가장 먼저 고른다', () => {
    // 아무것도 고르지 않으면 기기에 가장 오래전부터 있던 목소리가 나와 기계처럼 들린다.
    const picked = pickKoreanVoice([
      voice('Yuna'),
      voice('Google 한국의'),
      voice('Microsoft SunHi Online (Natural) - Korean'),
    ]);
    expect(picked?.name).toBe('Google 한국의');
  });

  it('Google 이 없으면 Natural 목소리를 고른다', () => {
    const picked = pickKoreanVoice([
      voice('Yuna'),
      voice('Microsoft SunHi Online (Natural) - Korean'),
    ]);
    expect(picked?.name).toContain('Natural');
  });

  it('고를 것이 없으면 있는 한국어 목소리를 쓴다', () => {
    expect(pickKoreanVoice([voice('어떤 목소리')])?.name).toBe('어떤 목소리');
  });
});
