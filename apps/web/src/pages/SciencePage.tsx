import { Button, Card } from '@dailyglow/ui';
import { SafeVideo } from '@/components/SafeVideo';
import { canSpeak, speak } from '@/lib/speak';
import { startGrade, videoLength, weeklyScience } from '@/lib/science';
import { useProfile } from '@/stores/profile';

/**
 * 이번 주의 과학.
 *
 * 두 걸음으로 끝난다 — **읽고, 본다.** 맞히는 자리는 없다. 과학은 사지선다로
 * 배워지는 것이 아니라 보고 들은 것이 쌓여서 배워진다.
 *
 * 글이 먼저 오는 까닭은 영상부터 틀면 글은 아무도 안 읽기 때문이다. 라윤이는
 * 스스로 읽고, 시윤이는 스피커를 눌러 듣는다.
 *
 * 주제는 **아이가 시작할 학년부터 차례대로** 한 주에 하나씩 나아간다. 유치원생은
 * 킨더가든부터, 초등학생은 1학년부터다. 앞의 것을 건너뛰면 얹을 자리가 없다.
 *
 * 영어 영상은 **한국어 영상 뒤에** 온다. 라윤이는 자막 없이 알아듣지만, 시윤이와
 * 도윤이에게는 아직 모르는 말이라 내용을 아는 채로 들어야 장면에 가서 붙는다.
 *
 * 집에서 하는 실험은 두지 않는다 — 준비물은 결국 부모의 일이 되고, 아이가
 * 혼자 시작하면 집이 어지러워진다.
 */
export function SciencePage() {
  const grade = useProfile((s) => s.profile?.grade ?? null);
  const topic = weeklyScience(startGrade(grade));

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

        {/* 개념 설명. 제목을 달아 덩어리로 나눈다 — 줄글로 이으면 아이가
            어디를 읽고 있는지 놓친다. */}
        <div className="flex flex-col gap-4 text-left">
          {topic.sections.map((section) => (
            <div key={section.heading} data-testid="science-section">
              <h3 className="text-lg font-bold text-glow-600">{section.heading}</h3>
              <p className="text-lg leading-relaxed text-slate-600">{section.body}</p>
            </div>
          ))}
        </div>

        {/* 스피커는 글에서 떼어 둔다. 눌러야 읽어준다 — 라윤이는 스스로 읽어야
            읽기 연습이 되고, 시윤이는 눌러서 들으면 된다. */}
        {canSpeak() ? (
          <Button
            variant="ghost"
            data-testid="science-speak"
            onClick={() => speak(topic.sections.map((s) => `${s.heading}. ${s.body}`).join(' '))}
          >
            🔊 읽어주기
          </Button>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-4" data-testid="science-video" data-lang="ko">
        <h3 className="text-center text-xl font-bold text-glow-600">영상으로 보기</h3>
        <SafeVideo
          videoId={topic.video.id}
          label={`영상 보기 · ${videoLength(topic.video.seconds)}`}
        />
      </Card>

      {topic.videoEn ? (
        <Card className="flex flex-col gap-4" data-testid="science-video" data-lang="en">
          <h3 className="text-center text-xl font-bold text-glow-600">영어로 한 번 더</h3>
          <p className="text-center text-slate-500">같은 이야기예요. 아는 이야기라 들려요.</p>
          <SafeVideo
            videoId={topic.videoEn.id}
            label={`영어 영상 보기 · ${videoLength(topic.videoEn.seconds)}`}
            />
        </Card>
      ) : null}
    </div>
  );
}
