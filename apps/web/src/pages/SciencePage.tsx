import { useState } from 'react';
import { Button, Card } from '@dailyglow/ui';
import { SafeVideo } from '@/components/SafeVideo';
import { canSpeak, speak } from '@/lib/speak';
import {
  earlierByGrade,
  gradeName,
  startGrade,
  videoLength,
  weeklyScience,
  type ScienceLesson,
  type ScienceTopic,
} from '@/lib/science';
import { useProfile } from '@/stores/profile';

/**
 * 과학 놀이터.
 *
 * 화면 맨 위에는 **이번 주의 주제**(자석)를 크게 걸고, 그 아래 상자 안에 이번
 * 주에 배울 덩어리(자석에 붙는 물질 알아보기)를 둔다. 주제가 먼저 보여야 아이가
 * 몇 주째 무엇을 붙잡고 있는지 알고, 상자 안의 제목이 오늘 할 일이 된다.
 *
 * 두 걸음으로 끝난다 — **읽고, 본다.** 맞히는 자리는 없다. 과학은 사지선다로
 * 배워지는 것이 아니라 보고 들은 것이 쌓여서 배워진다.
 *
 * 한 주에 배우는 것은 **주제 하나가 아니라 그 안의 덩어리 하나**다. 자석이면
 * 붙는 물질, 끌어당기는 까닭, 두 극, 자기장, 나침반으로 다섯 주다. 한 주에
 * 주제를 통째로 끝내면 한 학년이 서너 주 만에 지나가 버린다.
 *
 * 주제는 **아이의 학년 것부터** 차례대로 나아간다. 라윤이는 국제학교에서 미국
 * 과정으로 배우므로 3학년 것이 곧 학교에서 지금 하는 것이고, 시윤이와 도윤이는
 * 킨더가든부터다.
 *
 * **지나온 학년 것은 단추 뒤 다른 화면에 둔다.** 이번 주 화면에 같이 깔아 두면
 * 아이가 이것저것 눌러 집중이 흐트러진다. 백 개가 넘으므로 학년 → 주제 →
 * 덩어리의 세 겹으로 접어 둔다.
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
  const groups = earlierByGrade(from);

  /** 지난 목록을 펼쳤는가. */
  const [listOpen, setListOpen] = useState(false);
  /** 지난 목록에서 고른 것. */
  const [picked, setPicked] = useState<ScienceLesson | null>(null);

  // ── 지난 것에서 고른 것을 보는 중 ────────────────────
  if (picked) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-center text-2xl font-bold text-glow-600">{picked.topic.title}</h1>
        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => setPicked(null)}>
            ← 돌아가기
          </Button>
        </div>
        <LessonView lesson={picked} />
      </div>
    );
  }

  // ── 지난 목록 ────────────────────────────────────────
  if (listOpen) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-center text-2xl font-bold text-glow-600">지난 목록 보기</h1>
        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => setListOpen(false)}>
            ← 돌아가기
          </Button>
        </div>

        <Card className="flex flex-col gap-2" data-testid="earlier-topics">
          {groups.map(({ grade: g, topics }) => (
            <details
              key={g}
              data-testid="earlier-grade"
              className="rounded-2xl bg-glow-50 px-4 py-3"
            >
              <summary className="cursor-pointer text-lg font-bold text-glow-700">
                {gradeName(g)}
              </summary>

              <div className="mt-2 flex flex-col gap-2">
                {topics.map((t) => (
                  <details
                    key={t.slug}
                    data-testid="earlier-topic"
                    className="rounded-2xl bg-white px-4 py-2"
                  >
                    <summary className="cursor-pointer font-bold text-slate-700">
                      {t.title}
                    </summary>
                    <div className="mt-2 flex flex-col gap-1">
                      {t.sections.map((section, index) => (
                        <button
                          key={section.heading}
                          data-testid="earlier-section"
                          onClick={() => setPicked({ topic: t, section, index })}
                          className="min-h-touch rounded-2xl px-3 py-2 text-left text-slate-600 transition-transform hover:bg-glow-50 active:scale-95"
                        >
                          {section.heading}
                        </button>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </details>
          ))}
        </Card>
      </div>
    );
  }

  // ── 이번 주 ──────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* 이번 주의 주제. 활동 이름("과학 놀이터")은 홈 화면의 카드가 들고 있으므로
          여기서는 되풀이하지 않는다. */}
      <h1 data-testid="science-topic" className="text-center text-2xl font-bold text-glow-600">
        {thisWeek.topic.title}
      </h1>

      <LessonView lesson={thisWeek} />

      {groups.length > 0 ? (
        <div className="flex justify-center">
          <Button variant="ghost" data-testid="open-earlier" onClick={() => setListOpen(true)}>
            📚 지난 목록 보기
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * 한 주 치를 펼쳐 보여준다 — 이번에 배울 덩어리 하나, 그리고 그 주제의 영상.
 *
 * 주제 이름은 이 상자 밖(화면 맨 위)에 있고, 상자 안에는 **오늘 배울 것**만 둔다.
 */
function LessonView({ lesson }: { lesson: ScienceLesson }) {
  const { topic, section } = lesson;

  return (
    <>
      <Card className="flex flex-col items-center gap-4 text-center">
        <h2 data-testid="science-title" className="text-3xl font-bold text-slate-700">
          {section.heading}
        </h2>

        <p
          data-testid="science-section"
          className="text-left text-lg leading-relaxed text-slate-600"
        >
          {section.body}
        </p>

        {/* 스피커는 글에서 떼어 둔다. 눌러야 읽어준다 — 라윤이는 스스로 읽어야
            읽기 연습이 되고, 시윤이는 눌러서 들으면 된다. */}
        {canSpeak() ? (
          <Button
            variant="ghost"
            data-testid="science-speak"
            onClick={() => speak(`${section.heading}. ${section.body}`)}
          >
            🔊 읽어주기
          </Button>
        ) : null}
      </Card>

      <TopicVideos topic={topic} />
    </>
  );
}

/** 주제에 붙은 영상. 그 주제를 하는 몇 주 동안 같은 영상을 다시 본다. */
function TopicVideos({ topic }: { topic: ScienceTopic }) {
  return (
    <>
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
