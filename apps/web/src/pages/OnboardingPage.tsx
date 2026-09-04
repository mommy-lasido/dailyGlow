import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button, Card } from '@dailyglow/ui';
import {
  BIRTH_DATE_MIN,
  DAILY_GOAL_OPTIONS,
  GENDER_LABEL,
  GRADES,
  GRADE_LABEL,
  gradeOrdinal,
  READING_LEVELS,
  READING_LEVEL_LABEL,
  joinName,
  recommendDailyGoalMinutes,
  recommendGrade,
  recommendReadingLevel,
  splitName,
  toISODate,
  type Gender,
  type Grade,
  type ReadingLevel,
} from '@dailyglow/utils';
import { useAuth } from '@/stores/auth';
import { useProfile } from '@/stores/profile';

const fieldClass =
  'min-h-touch rounded-2xl border-2 border-glow-100 px-4 text-lg focus:border-glow-500 focus:outline-none';

export function OnboardingPage() {
  const profile = useProfile((s) => s.profile);
  const save = useProfile((s) => s.save);
  const initializeSubjectLevels = useProfile((s) => s.initializeSubjectLevels);
  const signOut = useAuth((s) => s.signOut);
  const navigate = useNavigate();

  // 성과 이름을 따로 받는다. 프로필에는 온전한 이름(display_name)을 저장하지만,
  // 홈 화면에서는 이름(given_name)만 불러야 "안녕, 라윤아" 가 된다.
  const [familyName, setFamilyName] = useState('');
  const [givenName, setGivenName] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [birthDate, setBirthDate] = useState('');
  const [grade, setGrade] = useState<Grade | ''>('');
  const [readingLevel, setReadingLevel] = useState<ReadingLevel | ''>('');
  const [goal, setGoal] = useState<number>(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 이 화면에서 방금 저장했는지. 저장이 성공하면 profile.onboarded_at 이 채워지는데,
  // 그것만 보고 리다이렉트하면 초기 레벨 제안이 실패해도 그 이유가 화면에서 사라진다.
  const submittedHere = useRef(false);

  /**
   * 프로필에 이미 값이 있으면 폼을 그 값으로 채운다.
   * 빈 값으로 두면 여기서 저장하는 순간 기존 값이 전부 지워진다.
   */
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

  /**
   * 생일이 바뀌면 학년·읽기 수준·목표 시간에 추천값을 채운다.
   * 어디까지나 제안이라, 이후 사용자가 고르면 그 값이 유지된다.
   */
  function onBirthDateChange(value: string) {
    setBirthDate(value);
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return;

    const today = new Date();
    const g = recommendGrade(parsed, today);
    setGrade(g);
    setReadingLevel(recommendReadingLevel(g, parsed, today));
    setGoal(recommendDailyGoalMinutes(g));
  }

  /**
   * 한글 읽기를 물어볼지.
   *
   * 초2 이상에게 "한글을 읽을 수 있나요" 하고 묻는 건 이상하다. 다만 초1 은
   * 아직 배우는 중인 아이가 많아 애매하니 미취학·초1 까지만 묻는다.
   * 학년을 아직 고르지 않았으면(빈 값) 판단할 근거가 없으므로 물어본다.
   *
   * 설정 화면에서는 이 칸을 늘 보여준다 — 부모가 고쳐줄 길은 남겨둬야 한다.
   */
  const asksReadingLevel = grade === '' || gradeOrdinal(grade) <= 1;

  // 묻지 않은 학년은 한글을 뗀 것으로 본다.
  const effectiveReadingLevel: ReadingLevel | '' = asksReadingLevel ? readingLevel : 'fluent';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    submittedHere.current = true;
    setBusy(true);
    setError(null);
    const res = await save({
      display_name: joinName(familyName, givenName),
      given_name: givenName.trim(),
      gender: gender || null,
      birth_date: birthDate || null,
      grade: grade || null,
      reading_level: effectiveReadingLevel || null,
      daily_goal_minutes: goal,
      onboarded_at: new Date().toISOString(),
    });
    if (res.error) {
      setBusy(false);
      setError(res.error);
      return;
    }

    // 과목별 시작 레벨을 여기서 제안해 둔다. 이게 없으면 한글이 1단계로 취급돼
    // 4단계부터 열리는 낱말 읽기가 홈에서 통째로 빠진다.
    // 실패하면 홈으로 보내지 않는다 — 카드가 비어 있는 이유를 아무도 알 수 없게 된다.
    const levelRes = await initializeSubjectLevels(effectiveReadingLevel || null);
    setBusy(false);
    if (levelRes.error) {
      setError(levelRes.error);
      return;
    }
    navigate('/', { replace: true });
  }

  // 온보딩을 이미 마쳤으면 이 화면에 올 일이 없다.
  // 여기까지 흘러들어오면 빈 폼 저장으로 프로필이 지워질 수 있다.
  if (profile?.onboarded_at && !submittedHere.current) return <Navigate to="/" replace />;

  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-full max-w-lg">
        <h1 className="mb-2 text-center text-3xl font-bold text-glow-600">반가워요!</h1>
        <p className="mb-6 text-center text-slate-500">
          몇 가지만 알려주면 딱 맞는 공부를 준비할게요.
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
                required
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
              onChange={(e) => onBirthDateChange(e.target.value)}
            />
          </label>

          {/* 도움말 <span> 은 <label> 밖에 둔다 — 안에 넣으면 label 텍스트가 "학년" 이 아니게 된다. */}
          <div className="flex flex-col gap-1">
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
            <span className="text-xs font-normal text-slate-400">
              생일을 넣으면 추천값이 채워져요. 실제 학년과 다르면 바꿔주세요.
            </span>
          </div>

          {asksReadingLevel ? (
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
          ) : null}

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

          <Button type="submit" size="lg" disabled={busy || givenName.trim().length === 0}>
            {busy ? '저장하는 중…' : '시작하기'}
          </Button>
        </form>

        {/* 이 화면에서 빠져나갈 유일한 길. 없으면 새로고침해도 계속 여기로 돌아와서
            다른 아이 계정으로 바꿔 들어갈 수가 없다. 시작하기와 경쟁하지 않게 낮춰 둔다. */}
        <div className="mt-6 flex justify-center border-t border-glow-100 pt-4">
          <Button type="button" variant="ghost" onClick={() => void signOut()}>
            로그아웃
          </Button>
        </div>
      </Card>
    </div>
  );
}
