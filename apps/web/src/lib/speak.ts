/**
 * 글을 못 읽는 아이를 위해 화면의 말을 소리로 읽어준다.
 *
 * 브라우저에 이미 들어 있는 음성 합성 기능만 쓴다 — 바깥 서비스를 부르지 않으므로
 * 인터넷이 끊겨도 동작하고, 비용도 들지 않는다.
 *
 * 스스로 읽어주는 것이 아니라 **아이가 스피커를 눌렀을 때만** 읽는다.
 * 틀렸다고 다시 시키지도 않는 '형식상' 읽기 기능은 도움이 되지 않기 때문이다.
 */

/** 이 브라우저가 소리 내어 읽어줄 수 있는지 */
export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string): void {
  if (!canSpeak()) return;
  try {
    // 앞서 읽던 것이 남아 겹치지 않게 끊는다.
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    // 유아가 따라올 수 있게 조금 느리게.
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch {
    // 읽어주기는 보조 수단이다. 안 되더라도 문제 풀이를 막지 않는다.
  }
}
