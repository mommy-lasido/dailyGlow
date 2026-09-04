import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@dailyglow/ui';
import {
  DAILY_GOAL_OPTIONS,
  GENDER_LABEL,
  GRADES,
  GRADE_LABEL,
  READING_LEVELS,
  READING_LEVEL_LABEL,
  recommendDailyGoalMinutes,
  recommendGrade,
  recommendReadingLevel,
  type Gender,
  type Grade,
  type ReadingLevel,
} from '@dailyglow/utils';
import { useProfile } from '@/stores/profile';

const fieldClass =
  'min-h-touch rounded-2xl border-2 border-glow-100 px-4 text-lg focus:border-glow-500 focus:outline-none';

export function OnboardingPage() {
  const profile = useProfile((s) => s.profile);
  const save = useProfile((s) => s.save);
  const navigate = useNavigate();

  const [name, setName] = useState(profile?.display_name ?? '');
  const [gender, setGender] = useState<Gender | ''>('');
  const [birthDate, setBirthDate] = useState('');
  const [grade, setGrade] = useState<Grade | ''>('');
  const [readingLevel, setReadingLevel] = useState<ReadingLevel | ''>('');
  const [goal, setGoal] = useState<number>(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await save({
      display_name: name.trim(),
      gender: gender || null,
      birth_date: birthDate || null,
      grade: grade || null,
      reading_level: readingLevel || null,
      daily_goal_minutes: goal,
      onboarded_at: new Date().toISOString(),
    });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    navigate('/', { replace: true });
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-full max-w-lg">
        <h1 className="mb-2 text-center text-3xl font-bold text-glow-600">반가워요!</h1>
        <p className="mb-6 text-center text-slate-500">
          몇 가지만 알려주면 딱 맞는 공부를 준비할게요.
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-bold text-slate-600">
            이름
            <input
              className={fieldClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

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
            <input
              type="date"
              className={fieldClass}
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

          <Button type="submit" size="lg" disabled={busy || name.trim().length === 0}>
            {busy ? '저장하는 중…' : '시작하기'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
