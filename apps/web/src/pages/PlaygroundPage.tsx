import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card } from '@dailyglow/ui';
import { ActivityIcon } from '@/components/ActivityIcon';
import { PLAYGROUNDS } from '@/lib/playgrounds';
import { PlaygroundIcon } from '@/components/PlaygroundIcon';
import { fetchCatalog, scienceDoneThisWeek, selectActivities } from '@/lib/activities';
import { stepForDay, weeklyFocus, type WeeklyFocus } from '@/lib/weekly';
import { useProfile } from '@/stores/profile';
import type { Grade } from '@dailyglow/utils';

/**
 * 놀이터 한 곳.
 *
 * 홈에는 놀이터 넷만 걸고, 활동은 그 안에서 고른다. 활동이 늘면서 홈이 한없이
 * 길어졌고, 아이가 오늘 할 것을 찾으려면 한참 내려야 했다.
 *
 * 한 겹 들어가는 대신 **놀이터 안에서는 카드를 그대로 펼쳐 둔다.** 시윤이와
 * 도윤이는 글씨가 아니라 그림을 보고 고르므로, 여기서 또 접으면 찾지 못한다.
 */
export function PlaygroundPage() {
  const { key } = useParams();
  const profile = useProfile((s) => s.profile);
  const levels = useProfile((s) => s.levels);
  const grade = (profile?.grade as Grade | null) ?? null;
  const isPreReader = profile?.reading_level === 'pre_reader';

  const place = PLAYGROUNDS.find((p) => p.key === key);

  const {
    data: lessons = [],
    isPending,
    isError,
  } = useQuery({
    queryKey: ['activity-catalog'],
    queryFn: fetchCatalog,
  });

  const { data: scienceDone = false } = useQuery({
    queryKey: ['science-done', profile?.id],
    enabled: Boolean(profile) && key === 'science',
    queryFn: () => scienceDoneThisWeek(profile!.id),
  });

  // 한글 과목이 가리키는 이번 주의 글자. 한글 레슨이 달린 과목의 단계를 그대로 쓴다.
  const hangulSubject = lessons.find((l) => l.subject_slug === 'hangul')?.subject_id;
  const weekly = hangulSubject ? weeklyFocus(levels[hangulSubject]?.level ?? 1) : null;

  if (!place) {
    return (
      <Card className="flex flex-col items-center gap-4 text-center">
        <p className="text-lg text-slate-500">그런 놀이터는 없어요.</p>
        <Link to="/">
          <Button size="lg">홈으로 가기</Button>
        </Link>
      </Card>
    );
  }

  const activities = selectActivities(lessons, grade, levels).filter((a) =>
    place.subjects.includes(a.subjectSlug),
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="flex items-center justify-center gap-3 text-2xl font-bold text-glow-600">
        <PlaygroundIcon name={place.key} title={place.title} className="h-12 w-12 shrink-0" />
        {place.title}
      </h1>

      {/* 이번 주의 글자는 한글 놀이터 안에 둔다. 오늘 할 것이라 맨 위에 온다. */}
      {place.key === 'hangul' && weekly ? (
        <WeeklyCard week={weekly} isPreReader={isPreReader} />
      ) : null}

      {isPending ? (
        <Card className="text-center text-lg text-slate-400">공부 목록을 불러오는 중이에요…</Card>
      ) : isError ? (
        <Card className="text-center text-lg text-slate-500">
          지금 연결이 잘 안 돼요. 잠시 뒤에 다시 열어봐 주세요.
        </Card>
      ) : null}

      {activities.map((a) => (
        <Link key={a.id} to={`/activity/${a.id}`}>
          <Card className="flex items-center gap-4 transition-transform hover:scale-[1.02]">
            <ActivityIcon
              id={a.iconId}
              className={`shrink-0 ${isPreReader ? 'h-24 w-24' : 'h-20 w-20'}`}
            />
            {/* min-w-0 — 예시 줄이 길어도 카드 밖으로 밀려나지 않게. */}
            <div className="min-w-0">
              <h2 className={`font-bold text-glow-700 ${isPreReader ? 'text-3xl' : 'text-2xl'}`}>
                {a.title}
              </h2>
              {a.hint ? (
                <p className={`text-slate-500 ${isPreReader ? 'text-lg' : 'text-sm'}`}>{a.hint}</p>
              ) : null}
            </div>
          </Card>
        </Link>
      ))}

      {place.key === 'english' ? (
        <SpellCard isPreReader={isPreReader} grade={profile?.grade ?? null} />
      ) : null}
      {place.key === 'science' ? (
        <ScienceCard isPreReader={isPreReader} done={scienceDone} />
      ) : null}

      {/* 한글 놀이터는 이번 주의 글자가 있으면 빈 자리가 아니다. */}
      {!isPending &&
      !isError &&
      activities.length === 0 &&
      !['english', 'science'].includes(place.key) &&
      !(place.key === 'hangul' && weekly) ? (
        <Card className="text-center text-lg text-slate-500">
          아직 준비된 공부가 없어요. 설정에서 학년과 단계를 확인해 주세요.
        </Card>
      ) : null}
    </div>
  );
}

/**
 * Spell It 카드 — 영어 철자 맞추기.
 *
 * **초등학생에게만 보인다.** 낱말이 Wordly Wise 2·3권 것이라 아직 영어를 읽지
 * 못하는 아이에게는 낼 것이 없다. 시윤이와 도윤이의 영어는 따로 정한다.
 *
 * 카드 글씨도 영어로 적는다. 영어 활동에는 한국어를 섞지 않기로 했다 —
 * 한국어로 거들면 아이가 영어를 알아서 한 것인지 알 수 없다.
 */
function SpellCard({ isPreReader, grade }: { isPreReader: boolean; grade: string | null }) {
  if (!grade || !/^g[1-9]/.test(grade)) return null;

  return (
    <Link to="/spell" data-testid="spell-card">
      <Card className="flex items-center gap-4 transition-transform hover:scale-[1.02]">
        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-sky-50 text-4xl font-bold text-sky-600">
          Aa
        </span>
        <div className="min-w-0">
          <h3 className={`font-bold text-glow-700 ${isPreReader ? 'text-3xl' : 'text-2xl'}`}>
            Spell It
          </h3>
          <p className={`text-slate-500 ${isPreReader ? 'text-lg' : 'text-sm'}`}>
            Read the meaning, then build the word
          </p>
        </div>
      </Card>
    </Link>
  );
}
/**
 * 과학 놀이터 카드.
 *
 * 다른 활동 카드는 창고에 적힌 목록에서 나오지만, 과학은 내용이 앱 안에 들어
 * 있어 창고를 거치지 않는다. 그래서 이 카드만 따로 그린다.
 *
 * 활동 목록 **맨 아래**에 둔다. 날마다 하는 한글과 수학이 먼저고, 과학은 한
 * 주에 하나이므로 그 뒤에 온다.
 */
function ScienceCard({ isPreReader, done }: { isPreReader: boolean; done: boolean }) {
  return (
    <Link to="/science" data-testid="science-card">
      <Card className="flex items-center gap-4 transition-transform hover:scale-[1.02]">
        <ActivityIcon
          id="science"
          className={`shrink-0 ${isPreReader ? 'h-24 w-24' : 'h-20 w-20'}`}
        />
        <div className="min-w-0">
          {/* 머리글이 이미 "과학 놀이터" 이므로 카드는 그 안에서 무엇을 하는지
              적는다. 같은 말이 두 번 나오면 아이가 두 개인 줄 안다. */}
          <h3 className={`font-bold text-glow-700 ${isPreReader ? 'text-3xl' : 'text-2xl'}`}>
            이번 주의 과학
          </h3>
          {/* 다 보고 나면 줄을 아예 없앤다. "다 봤어요" 라고 적어 두면 할 일이
              남은 카드와 같은 모양이라, 아이가 또 눌러 볼 것이 있는 줄 안다. */}
          {done ? null : (
            <p className={`text-slate-500 ${isPreReader ? 'text-lg' : 'text-sm'}`}>
              이번 주에 배울 것이 하나 있어요
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}
/**
 * 이번 주의 글자.
 *
 * 한 주 내내 같은 글자를 파고든다. 아이가 목록에서 아무거나 골라 풀면 그날그날
 * 다른 것을 조금씩 건드리고 끝나는데, 교재가 한 주에 글자 하나를 붙잡는 데는
 * 까닭이 있다 — 같은 글자를 여러 날에 걸쳐 여러 방식으로 만나야 남는다.
 *
 * 획순(어떻게 긋는지)은 아직 없다. 영숙님이 옆에서 알려주기로 했다.
 */
function WeeklyCard({ week, isPreReader }: { week: WeeklyFocus; isPreReader: boolean }) {
  const step = stepForDay();

  return (
    <Card className="flex flex-col gap-3">
      {/* 단계 번호는 적지 않는다. 아이가 자기가 몇 단계인지 알 까닭이 없고,
          알면 남과 견주는 숫자가 될 뿐이다. 단계는 설정에서 부모가 본다. */}
      <span className="text-xl font-bold text-glow-600">이번 주에 배울 글자</span>

      <Link to="/weekly" className="flex items-center gap-5">
        <span
          data-testid="weekly-letter"
          className="flex shrink-0 items-center justify-center rounded-3xl bg-glow-50 px-6 py-3 text-6xl font-bold text-glow-700"
        >
          {week.letters.join(' ')}
        </span>
        {/* 낱말은 여기 적지 않는다 — 들어가면 눌러서 들을 수 있고, 여기서는
            오늘 무엇을 하는지만 크게 보이면 된다. */}
        <div className="min-w-0">
          <p className="text-sm text-slate-400">오늘은</p>
          <p
            data-testid="weekly-step"
            className={`font-bold text-glow-700 ${isPreReader ? 'text-3xl' : 'text-2xl'}`}
          >
            {step.name}
          </p>
        </div>
      </Link>

      <Link to="/weekly">
        <Button size="lg" className="w-full">
          오늘의 공부 하러 가기 →
        </Button>
      </Link>
    </Card>
  );
}