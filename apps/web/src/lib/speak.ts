/**
 * 글을 못 읽는 아이를 위해 화면의 말을 소리로 읽어준다.
 *
 * 브라우저에 이미 들어 있는 음성 합성 기능만 쓴다 — 바깥 서비스를 부르지 않으므로
 * 인터넷이 끊겨도 동작하고, 비용도 들지 않는다.
 *
 * **다만 목소리는 골라 쓴다.** 기기에는 보통 여러 목소리가 깔려 있고, 아무것도
 * 고르지 않으면 그중 가장 오래된 것이 나온다. 그래서 소리가 기계 같았다.
 * 요즘 기기에는 훨씬 자연스러운 목소리(Google·Microsoft 것)가 함께 들어 있으므로
 * 있으면 그것을 쓴다.
 */

/** 이 브라우저가 소리 내어 읽어줄 수 있는지 */
export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * 한국어 목소리 중 가장 자연스러운 것을 고른다.
 *
 * 앞에 적힌 것일수록 먼저 고른다. Google 목소리가 가장 사람에 가깝고, 그다음이
 * 요즘 윈도의 Natural 목소리다. 이름으로 고르는 것이 투박해 보이지만, 브라우저가
 * "이 목소리가 얼마나 자연스러운가" 를 알려주지 않으므로 다른 방법이 없다.
 */
const VOICE_RANK = [/google/i, /natural/i, /neural/i, /yuna|sunhi|injoon|heami/i];

export function pickKoreanVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  const korean = voices.filter((v) => v.lang.toLowerCase().startsWith('ko'));
  if (korean.length === 0) return null;

  for (const rank of VOICE_RANK) {
    const found = korean.find((v) => rank.test(v.name));
    if (found) return found;
  }
  return korean[0]!;
}

/**
 * 고른 목소리를 기억해 둔다.
 *
 * 목소리 목록은 브라우저가 뒤늦게 채워 넣는 일이 많아, 처음 한 번은 비어 있을 수
 * 있다. 그때는 목록이 채워졌다는 알림(`voiceschanged`)을 받아 다시 고른다.
 */
let cached: SpeechSynthesisVoice | null = null;
let bound = false;

function voiceFor(): SpeechSynthesisVoice | null {
  if (cached) return cached;
  cached = pickKoreanVoice(window.speechSynthesis.getVoices());
  if (!bound && 'onvoiceschanged' in window.speechSynthesis) {
    bound = true;
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      cached = pickKoreanVoice(window.speechSynthesis.getVoices());
    });
  }
  return cached;
}

export function speak(text: string): void {
  if (!canSpeak()) return;
  try {
    // 앞서 읽던 것이 남아 겹치지 않게 끊는다.
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    const voice = voiceFor();
    if (voice) utterance.voice = voice;
    // 유아가 따라올 수 있게 조금 느리게.
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch {
    // 읽어주기는 보조 수단이다. 안 되더라도 문제 풀이를 막지 않는다.
  }
}
