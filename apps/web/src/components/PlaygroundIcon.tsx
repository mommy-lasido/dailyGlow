/**
 * 놀이터 그림. 영숙님이 만들어 주었다(1024×1024, 흰 바탕).
 *
 * 글자를 못 읽는 아이는 **그림으로 자리를 찾는다.** 넷이 색으로 갈라지도록
 * 만들어 주어서, 시윤이와 도윤이도 "파란 거" 로 수학을 찾을 수 있다.
 *
 * 그림 안에 놀이터 이름이 적혀 있다. 그래서 화면을 읽어주는 기기에는 그림이
 * 아니라 **이름**으로 들리도록 alt 에 이름을 넣는다.
 */
export function PlaygroundIcon({
  name,
  title,
  className = 'h-10 w-10 shrink-0',
}: {
  name: string;
  title: string;
  /** 자리마다 크기가 다르다 — 홈 타일은 칸을 가득, 놀이터 머리글은 작게. */
  className?: string;
}) {
  return (
    <img
      src={`/playground/${name}.png`}
      alt={title}
      data-testid="playground-icon"
      data-name={name}
      // 그림이 늦게 뜨더라도 자리가 흔들리지 않게 크기를 미리 잡아 둔다.
      width={1024}
      height={1024}
      loading="lazy"
      className={className}
    />
  );
}
