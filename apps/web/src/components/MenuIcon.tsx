/**
 * 활동 안쪽 메뉴의 그림.
 *
 * 홈 화면의 활동 카드 그림(`ActivityIcon`)과 같은 결이되, 활동 **안에서** 무엇을
 * 할지 고르는 자리에 쓴다 — 자음/모음 배우기, 모으기/가르기 같은 것들이다.
 *
 * 그림은 영숙님이 만들어 주었다(512×512, 배경 투명). 그림이 없는 자리는 글자나
 * 그림글자를 그대로 쓰므로, 이 컴포넌트는 **그림이 있을 때만** 쓴다.
 */

/** 그림이 있는 메뉴들. 파일은 `public/menu-art/` 에 있다. */
const MENU_ART = new Set([
  'jamo-consonant',
  'jamo-vowel',
  'jamo-syllable',
  'count-count',
  'count-order',
  'count-bond',
  'count-read',
  'count-skip',
  'count-order-fill',
  'count-order-line',
  'count-gather',
  'count-split',
  'count-read-20',
  'count-read-50',
  'count-read-100',
  'count-skip5',
  'count-skip10',
  'worksheet',
  'add-1',
  'add-2',
  'add-3',
  'add-mix',
]);

export function hasMenuArt(id: string): boolean {
  return MENU_ART.has(id);
}

export function MenuIcon({
  id,
  alt,
  className,
}: {
  id: string;
  alt: string;
  className?: string;
}) {
  if (!hasMenuArt(id)) return null;
  return (
    <img
      src={`/menu-art/${id}.png`}
      alt={alt}
      data-testid="menu-icon"
      data-icon={id}
      className={className ?? 'h-16 w-16'}
      // 그림이 늦게 뜨더라도 칸이 흔들리지 않게 크기를 미리 잡아 둔다.
      width={512}
      height={512}
      loading="lazy"
    />
  );
}
