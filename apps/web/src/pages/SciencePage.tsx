import { Button, Card } from '@dailyglow/ui';
import { SafeVideo } from '@/components/SafeVideo';
import { canSpeak, speak } from '@/lib/speak';
import { videoLength, weeklyScience } from '@/lib/science';

/**
 * 이번 주의 과학.
 *
 * 세 걸음으로 끝난다 — **읽고, 보고, 해본다.** 맞히는 자리는 없다. 과학은
 * 사지선다로 배워지는 것이 아니라 보고 만져 본 것이 쌓여서 배워진다.
 *
 * 글이 먼저 오는 까닭은 영상부터 틀면 글은 아무도 안 읽기 때문이다. 짧은
 * 다섯 줄이라 라윤이는 스스로 읽고, 시윤이는 스피커를 눌러 듣는다.
 *
 * 마지막의 "오늘 해볼 것" 이 이 화면의 진짜 알맹이다. 영상은 보기 편해서
 * 본 것이 남지 않는다. 집을 돌아다니며 찾아 그려야 비로소 남는다.
 */
export function SciencePage() {
  const topic = weeklyScience();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-center text-2xl font-bold text-glow-600">
        이번 주의 과학
      </h1>

      <Card className="flex flex-col items-center gap-4 text-center">
        <span className="text-6xl">{topic.emoji}</span>
        <h2 data-testid="science-title" className="text-3xl font-bold text-slate-700">
          {topic.title}
        </h2>

        <div className="flex flex-col gap-2">
          {topic.lines.map((line) => (
            <p key={line} data-testid="science-line" className="text-xl text-slate-600">
              {line}
            </p>
          ))}
        </div>

        {/* 스피커는 글에서 떼어 둔다. 눌러야 읽어준다 — 라윤이는 스스로 읽어야
            읽기 연습이 되고, 시윤이는 눌러서 들으면 된다. */}
        {canSpeak() ? (
          <Button
            variant="ghost"
            data-testid="science-speak"
            onClick={() => speak(topic.lines.join(' '))}
          >
            🔊 읽어주기
          </Button>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-center text-xl font-bold text-glow-600">영상으로 보기</h3>
        <SafeVideo
          videoId={topic.video.id}
          label={`영상 보기 · ${videoLength(topic.video.seconds)}`}
        />
      </Card>

      <Card className="flex flex-col items-center gap-3 bg-glow-50 text-center">
        <h3 className="text-xl font-bold text-glow-700">오늘 해볼 것</h3>
        <p data-testid="science-do" className="text-xl text-slate-700">
          {topic.doThis}
        </p>
      </Card>
    </div>
  );
}
