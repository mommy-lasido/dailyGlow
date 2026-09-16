import { useState } from 'react';
import { Button, Card } from '@dailyglow/ui';
import { SafeVideo } from '@/components/SafeVideo';
import { canSpeak, speak } from '@/lib/speak';
import {
  earlierTopics,
  gradeName,
  startGrade,
  videoLength,
  weeklyScience,
  type ScienceTopic,
} from '@/lib/science';
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
 * 주제는 **아이의 학년 것부터 차례대로** 한 주에 하나씩 나아간다. 라윤이는
 * 국제학교에서 미국 과정으로 배우므로 3학년 것이 곧 학교에서 지금 하는 것이고,
 * 시윤이와 도윤이는 킨더가든부터다.
 *
 * **지나온 학년 것은 골라 볼 수 있게만 둔다.** 이번 주의 주제로 내면 이미 아는
 * 것이 몇 주씩 이어져 지루해지고, 그렇다고 없애면 놓친 것을 메울 길이 없다.
 *
 * 그 목록은 **단추를 눌러야 나온다.** 이번 주 화면에 같이 깔아 두었더니 이번 주에
 * 할 것과 지난 것이 한 화면에 섞였다. 이번 주 화면에는 이번 주 것만 있어야 한다.
 *
 * 영어 영상은 **한국어 영상 뒤에** 온다. 라윤이는 자막 없이 알아듣지만, 시윤이와
 * 도윤이에게는 아직 모르는 말이라 내용을 아는 채로 들어야 장면에 가서 붙는다.
 *
 * 집에서 하는 실험은 두지 않는다 — 준비물은 결국 부모의 일이 되고, 아이가
 * 혼자 시작하면 집이 어지러워진다.
 */
export function SciencePage() {
  const grade = useProfile((s) => s.profile?.grade ?? null);
  const from = startGrade(grade);
  const thisWeek = weeklyScience(from);
  const earlier = earlierTopics(from);

  /** 지난 목록을 펼쳤는가. */
  const [listOpen, setListOpen] = useState(false);
  /** 지난 목록에서 고른 것. */
  const [picked, setPicked] = useState<ScienceTopic | null>(null);

  // ── 지난 것에서 고른 주제를 보는 중 ──────────────────
  if (picked) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-center text-2xl font-bold text-glow-600">
          {gradeName(picked.grade)}
        </h1>
        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => setPicked(null)}>
            ← 목록으로
          </Button>
        </div>
        <TopicView topic={picked} />
      </div>
    );
  }

  // ── 지난 목록 ────────────────────────────────────────
  if (listOpen) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-center text-2xl font-bold text-glow-600">지난 것 고르기</h1>
        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => setListOpen(false)}>
            ← 이번 주 것으로
          </Button>
        </div>

        <Card className="flex flex-col gap-3" data-testid="earlier-topics">
          <div className="flex flex-col gap-2">
            {earlier.map((t) => (
              <button
                key={t.slug}
                data-testid="earlier-topic"
                data-slug={t.slug}
                onClick={() => setPicked(t)}
                className="min-h-touch rounded-3xl bg-glow-100 px-5 py-4 text-left text-lg font-bold text-slate-700 transition-transform active:scale-95"
              >
                {t.title}
                <span className="ml-2 text-sm font-normal text-slate-400">
                  {gradeName(t.grade)}
                </span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  // ── 이번 주 ──────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-center text-2xl font-bold text-glow-600">이번 주의 과학</h1>

      <TopicView topic={thisWeek} />

      {earlier.length > 0 ? (
        <div className="flex justify-center">
          <Button variant="ghost" data-testid="open-earlier" onClick={() => setListOpen(true)}>
            📚 지난 목록 보기
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** 주제 하나를 펼쳐 보여준다 — 개념 글, 한국어 영상, 영어 영상. */
function TopicView({ topic }: { topic: ScienceTopic }) {
  return (
    <>
      <Card className="flex flex-col items-center gap-4 text-center">
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
    </>
  );
}
