/**
 * 놀이터 넷. 홈 화면의 활동을 이 차례로 나눠 담는다.
 *
 * 이름은 영숙님이 정했다 — **"배움" 이 아니라 "놀이터"**. 아이가 "한글 배움 하자"
 * 라고는 말하지 않지만 "놀이터 가자" 는 말이 된다. 짬나는 시간에 잠깐 들르는
 * 자리라는 뜻이기도 하다.
 *
 * 차례는 날마다 하는 것(한글·수학)이 앞, 주에 몇 번 하는 것(영어·과학)이 뒤다.
 */
export const PLAYGROUNDS: { key: string; title: string; subjects: string[] }[] = [
  { key: 'hangul', title: '한글 놀이터', subjects: ['hangul', 'korean'] },
  { key: 'math', title: '수학 놀이터', subjects: ['math'] },
  { key: 'english', title: '영어 놀이터', subjects: ['english'] },
  { key: 'science', title: '과학 놀이터', subjects: ['science'] },
];

/**
 * 이 화면에서 한 칸 물러나면 어디인가.
 *
 * 홈 → 놀이터 → 활동, 세 겹이 되었다. 껍데기의 단추가 늘 홈으로 보내면 아이가
 * **가운데 한 겹을 건너뛴다** — 수 세기를 마치고 더하기를 하려면 홈까지 나갔다가
 * 수학 놀이터를 다시 찾아 들어와야 한다.
 *
 * 그래서 한 칸씩 물러난다. 활동에서는 그 활동이 사는 놀이터로, 놀이터에서는
 * 홈으로. 어느 놀이터인지 알 수 없는 화면(설정 같은 부모 화면)은 홈으로 간다.
 *
 * @param pathname 지금 화면의 주소
 * @param subjectSlug 활동 화면이라면 그 활동의 과목. 모르면 null.
 */
export function upFrom(
  pathname: string,
  subjectSlug: string | null,
): { to: string; label: string } {
  const home = { to: '/', label: '🏠 홈으로' };

  // 놀이터 안에서는 홈으로. 그 위에는 홈밖에 없다.
  if (pathname.startsWith('/playground/')) return home;

  // 앱 안에 들어 있어 창고를 거치지 않는 활동들. 자기 놀이터가 정해져 있다.
  const fixed: Record<string, string> = {
    '/weekly': 'hangul',
    '/spell': 'english',
    '/science': 'science',
  };
  const key = fixed[pathname] ?? (subjectSlug ? playgroundKeyOf(subjectSlug) : null);
  if (!key) return home;

  const place = PLAYGROUNDS.find((p) => p.key === key);
  if (!place) return home;
  return { to: `/playground/${place.key}`, label: `← ${place.title}` };
}

/** 이 과목은 어느 놀이터에 사는가. */
export function playgroundKeyOf(subjectSlug: string): string | null {
  return PLAYGROUNDS.find((p) => p.subjects.includes(subjectSlug))?.key ?? null;
}
