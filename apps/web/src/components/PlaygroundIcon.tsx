/**
 * 놀이터 머리글에 붙는 그림. 영숙님이 만들어 주었다(512×512, 배경 투명).
 *
 * 글자를 못 읽는 아이는 **그림으로 자리를 찾는다.** 넷이 색으로 갈라지도록
 * 만들어 주어서, 시윤이와 도윤이도 "파란 거" 로 수학을 찾을 수 있다.
 */
export function PlaygroundIcon({
  name,
  title,
  className = 'h-10 w-10 shrink-0',
}: {
  name: string;
  title: string;
  /** 자리마다 크기가 다르다 — 홈 타일은 크게, 놀이터 머리글은 작게. */
  className?: string;
}) {
  return (
    <img
      src={`/playground/${name}.png`}
      alt=""
      aria-hidden
      data-testid="playground-icon"
      data-name={name}
      // 그림이 늦게 뜨더라도 머리글이 흔들리지 않게 크기를 미리 잡아 둔다.
      width={512}
      height={512}
      loading="lazy"
      className={className}
      title={title}
    />
  );
}