import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card } from '@dailyglow/ui';
import { fetchTotalMinutes } from '@/lib/activities';
import {
  BIRTH_DATE_MIN,
  DAILY_GOAL_OPTIONS,
  hangulStage,
  HANGUL_STAGE_HIDDEN_MESSAGE,
  hangulStageHiddenReason,
  GENDER_LABEL,
  GRADES,
  GRADE_LABEL,
  READING_LEVELS,
  READING_LEVEL_LABEL,
  joinName,
  splitName,
  toISODate,
  type Gender,
  type Grade,
  type ReadingLevel,
} from '@dailyglow/utils';
import { HangulStagePicker } from '@/components/HangulStagePicker';
import { useProfile } from '@/stores/profile';
import { supabase } from '@/lib/supabase';

interface SubjectRow {
  id: string;
  slug: string;
  title: string;
}

const fieldClass =
  'min-h-touch rounded-2xl border-2 border-glow-100 px-4 text-lg focus:border-glow-500 focus:outline-none';

export function SettingsPage() {
  const profile = useProfile((s) => s.profile);
  const levels = useProfile((s) => s.levels);
  const save = useProfile((s) => s.save);
  const setSubjectLevel = useProfile((s) => s.setSubjectLevel);

  // 온보딩과 같은 규칙 — 저장은 성+이름(display_name), 부를 때는 이름(given_name).
  const [familyName, setFamilyName] = useState('');
  const [givenName, setGivenName] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [birthDate, setBirthDate] = useState('');
  const [grade, setGrade] = useState<Grade | ''>('');
  const [readingLevel, setReadingLevel] = useState<ReadingLevel | ''>('');
  const [goal, setGoal] = useState(10);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** subject_id → 그 과목 줄에 보여줄 오류 문구 */
  const [levelErrors, setLevelErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!profile) return;
    const parts = splitName(profile.display_name, profile.given_name);
    setFamilyName(parts.familyName);
    setGivenName(parts.givenName);
    setGender((profile.gender as Gender | null) ?? '');
    setBirthDate(profile.birth_date ?? '');
    setGrade((profile.grade as Grade | null) ?? '');
    setReadingLevel((profile.reading_level as ReadingLevel | null) ?? '');
    setGoal(profile.daily_goal_minutes ?? 10);
  }, [profile]);

  /** 처음부터 지금까지 쌓인 공부 시간. 부모가 보는 숫자다. */
  const { data: totalMinutes = 0 } = useQuery({
    queryKey: ['total-minutes', profile?.id],
    enabled: Boolean(profile),
    queryFn: () => fetchTotalMinutes(profile!.id),
  });

  const {
    data: subjects,
    isPending: subjectsPending,
    isError: subjectsError,
  } = useQuery({
    queryKey: ['subjects'],
    queryFn: async (): Promise<SubjectRow[]> => {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, slug, title')
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
  });

  async function onSaveProfile() {
    setError(null);
    setSaving(true);
    const res = await save({
      display_name: joinName(familyName, givenName),
      given_name: givenName.trim(),
      gender: gender || null,
      birth_date: birthDate || null,
      grade: grade || null,
      reading_level: readingLevel || null,
      daily_goal_minutes: goal,
    });
    setSaving(false);
    if (res.error) {
      setSaved(false);
      setError(res.error);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  /**
   * 한글 단계 조절 UI(단계 고르기 · 여기서 멈춰 · 단계 설명)를 보여줄지 —
   * 온보딩 화면과 같은 기준(hangulStageHiddenReason)을 쓴다. 화면에 아직 저장하지
   * 않은 학년·읽기 수준 값을 바로 반영하려고 프로필이 아니라 이 폼 상태를 본다.
   */
  const hangulHiddenReason = hangulStageHiddenReason(grade, readingLevel);

  /**
   * <select> 와 체크박스는 스토어의 levels 로 그려진다. 저장이 실패하면 스토어가
   * 그대로라 값이 예전 숫자로 되돌아가는데, 이유를 말해주지 않으면 부모는
   * 자기가 잘못 눌렀다고 생각한다. 실패한 과목 줄 옆에 이유를 붙인다.
   */
  async function onChangeLevel(subjectId: string, level: number, locked: boolean) {
    const res = await setSubjectLevel(subjectId, level, locked);
    setLevelErrors((prev) => {
      const next = { ...prev };
      if (res.error) next[subjectId] = res.error;
      else delete next[subjectId];
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <h1 className="text-3xl font-bold text-glow-600">설정</h1>
      </header>

      {/*
        지금까지 쌓인 공부 시간은 **부모가 보는 숫자**다. 아이 화면에서는 오늘 한
        것과 이번 주 도장이면 충분하고, 며칠 치를 합한 숫자는 아이가 쓸 일이 없다.
      */}
      <Card className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-bold text-glow-700">지금까지 공부한 시간</h2>
        <span data-testid="total-minutes" className="text-lg text-slate-600">
          {totalMinutes}분
        </span>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-glow-700">프로필</h2>

        {/* 도움말 <span> 은 <label> 밖에 둔다 — 안에 넣으면 label 텍스트가 "성" 이 아니게 된다. */}
        <div className="flex flex-col gap-1">
          <label className="flex flex-col gap-1 text-sm font-bold text-slate-600">
            성
            <input
              className={fieldClass}
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
            />
          </label>
          <span className="text-xs font-normal text-slate-400">비워둬도 괜찮아요.</span>
        </div>

        <div className="flex flex-col gap-1">
          <label className="flex flex-col gap-1 text-sm font-bold text-slate-600">
            이름
            <input
              className={fieldClass}
              value={givenName}
              onChange={(e) => setGivenName(e.target.value)}
            />
          </label>
          <span className="text-xs font-normal text-slate-400">
            화면에서 부를 때 쓰는 이름이에요.
          </span>
        </div>

        <label className="flex flex-col gap-1 text-sm font-bold text-slate-600">
          성별
          <select
            className={fieldClass}
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender | '')}
          >
            <option value="">고르지 않음</option>
            <option value="female">{GENDER_LABEL.female}</option>
            <option value="male">{GENDER_LABEL.male}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-bold text-slate-600">
          생일
          {/* min/max 가 없으면 202511 같은 여섯 자리 연도도 그대로 들어간다. */}
          <input
            type="date"
            className={fieldClass}
            min={BIRTH_DATE_MIN}
            max={toISODate()}
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-bold text-slate-600">
          학년
          <select
            className={fieldClass}
            value={grade}
            onChange={(e) => setGrade(e.target.value as Grade | '')}
          >
            <option value="">고르지 않음</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {GRADE_LABEL[g]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-bold text-slate-600">
          한글 읽기
          <select
            className={fieldClass}
            value={readingLevel}
            onChange={(e) => setReadingLevel(e.target.value as ReadingLevel | '')}
          >
            <option value="">고르지 않음</option>
            {READING_LEVELS.map((r) => (
              <option key={r} value={r}>
                {READING_LEVEL_LABEL[r]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-bold text-slate-600">
          하루 목표
          <select
            className={fieldClass}
            value={goal}
            onChange={(e) => setGoal(Number(e.target.value))}
          >
            {DAILY_GOAL_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}분
              </option>
            ))}
          </select>
        </label>

        {error ? <p className="text-sm font-bold text-red-500">{error}</p> : null}

        <div className="flex items-center gap-3">
          {/* 저장하는 동안 잠근다 — 두 번 누르면 저장이 두 번 나간다.
              이름이 비어 있으면(공백만 있어도) 저장을 막는다 — 온보딩과 같은 규칙. */}
          <Button
            disabled={saving || givenName.trim().length === 0}
            onClick={() => void onSaveProfile()}
          >
            {saving ? '저장하는 중…' : '프로필 저장'}
          </Button>
          {saved ? <span className="text-sm font-bold text-green-600">저장했어요</span> : null}
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-glow-700">과목별 단계</h2>
        <p className="text-sm text-slate-400">
          한글은 &lsquo;기적의 한글 학습&rsquo;(길벗스쿨) 5권 35단계를 그대로 따라가요.
          &lsquo;여기서 멈춰&rsquo;를 켜면 아이가 잘해도 다음 단계로 넘어가지 않아요.
        </p>

        {subjectsPending ? (
          <p className="text-center text-lg text-slate-400">과목 목록을 불러오는 중이에요…</p>
        ) : subjectsError ? (
          <p className="text-center text-lg text-slate-500">
            지금 연결이 잘 안 돼요. 잠시 뒤에 다시 열어봐 주세요.
          </p>
        ) : subjects.length === 0 ? (
          <p className="text-center text-lg text-slate-500">아직 등록된 과목이 없어요.</p>
        ) : (
          subjects.map((s) => {
            const current = levels[s.id] ?? { level: 1, locked: false };
            const levelError = levelErrors[s.id];
            // 한글만 단계에 뜻이 있다. 국어·영어·수학의 1~10 은 아직 아무것도
            // 가리키지 않는 자리표시자라, 골라도 달라지는 게 없는 드롭다운을
            // 보여주느니 안 보여주는 편이 낫다. 스토어 동작과 DB 행은 그대로 둔다.
            const isHangul = s.slug === 'hangul';
            const stage = hangulStage(current.level);

            return (
              <div key={s.id} className="flex flex-col gap-2 border-t border-glow-100 pt-4">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="w-16 font-bold text-slate-700">{s.title}</span>

                  {isHangul && hangulHiddenReason ? (
                    // 단계를 바꿔도 실제로는 아무것도 달라지지 않는 상태 — 조용히
                    // 사라지는 대신 왜 없는지 그 자리에서 말해준다. 값은 그대로 둔다
                    // (시윤이 골라둔 15단계 같은 값을 잠깐 숨겼다고 지우면 안 된다).
                    <p className="text-sm text-slate-400">
                      {HANGUL_STAGE_HIDDEN_MESSAGE[hangulHiddenReason]}
                    </p>
                  ) : isHangul ? (
                    <>
                      <HangulStagePicker
                        aria-label={`${s.title} 단계`}
                        className="min-h-touch max-w-full rounded-xl border-2 border-glow-100 px-3 text-lg"
                        value={current.level}
                        onChange={(level) => void onChangeLevel(s.id, level, current.locked)}
                      />

                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          aria-label={`${s.title} 여기서 멈춰`}
                          className="h-6 w-6"
                          checked={current.locked}
                          onChange={(e) =>
                            void onChangeLevel(s.id, current.level, e.target.checked)
                          }
                        />
                        여기서 멈춰
                      </label>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400">
                      단계는 이 과목의 활동이 준비되면 열려요.
                    </p>
                  )}
                </div>

                {/* 지금 고른 단계에서 무엇을 배우는지. 부모가 어디에 맞출지 정하려면
                    숫자가 아니라 내용이 보여야 한다. 단계 고르기 자체를 숨겼으면
                    (hangulHiddenReason) 이 설명도 함께 숨긴다 — 안 쓰이는 단계를
                    설명해 봐야 혼란만 늘어난다. */}
                {isHangul && !hangulHiddenReason && stage ? (
                  <div className="rounded-xl bg-glow-50 px-4 py-3">
                    <p className="text-sm font-bold text-slate-700">
                      {stage.stage}단계 · {stage.label}
                    </p>
                    {stage.examples ? (
                      <p className="mt-1 text-base text-slate-600">{stage.examples}</p>
                    ) : null}
                  </div>
                ) : null}

                {levelError ? (
                  <p className="text-sm font-bold text-red-500">{levelError}</p>
                ) : null}
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}
