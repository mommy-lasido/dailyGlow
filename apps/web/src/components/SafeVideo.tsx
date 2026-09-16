import { useEffect, useRef, useState } from 'react';
import { Button } from '@dailyglow/ui';

/**
 * 우리 화면 안에서만 보는 영상.
 *
 * 영상 주소를 눌러 유튜브로 내보내면 추천 영상이 줄줄이 뜨고 광고가 붙는다.
 * 아이 혼자 태블릿을 들고 있는 자리에서는 그게 곧 옆길이다. 그래서 **영상을
 * 우리 화면 안에 박아 넣고**, 유튜브로 나갈 구멍을 하나씩 막는다.
 *
 * 1. 유튜브의 재생 단추·제목·로고를 모두 감춘다(`controls=0`). 제목을 누르면
 *    유튜브로 넘어가는데, 아예 보이지 않게 한다.
 * 2. 영상 위에 **투명한 덮개**를 얹어 손가락이 유튜브 화면에 닿지 않게 한다.
 *    멈추고 다시 보는 것은 우리 단추가 맡는다.
 * 3. **영상이 끝나는 순간 우리 화면으로 덮는다.** 유튜브는 영상이 끝나면 다른
 *    영상들을 바둑판처럼 띄우는데, 그것이 뜨기 전에 가린다.
 * 4. 누르기 전에는 영상을 아예 불러오지 않는다. 안 볼 수도 있는 영상 때문에
 *    유튜브가 아이 기기를 들여다보게 둘 까닭이 없다(`youtube-nocookie`).
 *
 * **다만 완전히 막지는 못한다.** 화면을 꾹 누르면 브라우저 메뉴가 뜰 수 있다.
 * 일부러 찾아서 눌러야 나가는 수준이라고 보면 된다.
 */

interface YouTubePlayer {
  destroy(): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, options: unknown) => YouTubePlayer;
      PlayerState: { ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const API_ID = 'youtube-iframe-api';

/**
 * 유튜브가 주는 조종 장치를 불러온다.
 *
 * 이것이 있어야 **영상이 끝난 것을 알 수 있다.** 끝난 것을 모르면 추천 영상이
 * 뜨는 것을 막을 수 없으므로, 이 부분만은 유튜브 것을 빌려 쓴다.
 */
function loadPlayerApi(): Promise<NonNullable<Window['YT']>> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  return new Promise((resolve) => {
    const before = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      before?.();
      if (window.YT) resolve(window.YT);
    };
    if (document.getElementById(API_ID)) return;
    const script = document.createElement('script');
    script.id = API_ID;
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });
}

export function SafeVideo({
  videoId,
  label,
  onEnded,
}: {
  videoId: string;
  /** 누르기 전에 단추에 적을 말 — "영상 보기 · 2분 9초" */
  label: string;
  onEnded?: () => void;
}) {
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const holder = useRef<HTMLDivElement>(null);
  const player = useRef<YouTubePlayer | null>(null);

  useEffect(() => {
    if (!started || !holder.current) return;
    let dropped = false;
    const spot = holder.current;

    void loadPlayerApi().then((YT) => {
      if (dropped) return;
      player.current = new YT.Player(spot, {
        videoId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          autoplay: 1,
          // 유튜브 것은 아무것도 보이지 않게 한다 — 제목·로고·전체화면·자막 단추.
          controls: 0,
          fs: 0,
          disablekb: 1,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          // 중간에 뭔가 뜨더라도 같은 곳의 영상만 나오게 묶어 둔다.
          rel: 0,
        },
        events: {
          onReady: () => setPlaying(true),
          onStateChange: (e: { data: number }) => {
            if (e.data !== YT.PlayerState.ENDED) return;
            // 바둑판이 뜨기 전에 덮는다.
            setEnded(true);
            setPlaying(false);
            onEnded?.();
          },
        },
      });
    });

    return () => {
      dropped = true;
      player.current?.destroy();
      player.current = null;
    };
    // onEnded 는 화면이 새로 그려질 때마다 달라질 수 있어 넣지 않는다 —
    // 넣으면 영상이 처음부터 다시 시작된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, videoId]);

  if (!started) {
    return (
      <div className="flex flex-col items-center gap-3">
        <Button size="lg" onClick={() => setStarted(true)}>
          ▶ {label}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-slate-800">
        <div ref={holder} className="h-full w-full" />

        {/* 손가락이 유튜브 화면에 닿지 않게 하는 투명한 덮개. */}
        <div className="absolute inset-0" aria-hidden />

        {ended ? (
          <div
            data-testid="video-done"
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-glow-50 text-center"
          >
            <span className="text-5xl">🎉</span>
            <p className="text-xl font-bold text-glow-700">다 봤어요!</p>
            <Button
              variant="ghost"
              onClick={() => {
                setEnded(false);
                setPlaying(true);
                player.current?.seekTo(0, true);
                player.current?.playVideo();
              }}
            >
              다시 보기
            </Button>
          </div>
        ) : null}
      </div>

      {ended ? null : (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            onClick={() => {
              if (playing) player.current?.pauseVideo();
              else player.current?.playVideo();
              setPlaying(!playing);
            }}
          >
            {playing ? '⏸ 잠깐 멈추기' : '▶ 이어 보기'}
          </Button>
        </div>
      )}
    </div>
  );
}
