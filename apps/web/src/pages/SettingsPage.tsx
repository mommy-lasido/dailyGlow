import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card } from '@dailyglow/ui';
import {
  DAILY_GOAL_OPTIONS,
  GENDER_LABEL,
  GRADES,
  GRADE_LABEL,
  READING_LEVELS,
  READING_LEVEL_LABEL,
  type Gender,
  type Grade,
  type ReadingLevel,
} from '@dailyglow/utils';
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

  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [birthDate, setBirthDate] = useState('');
  const [grade, setGrade] = useState<Grade | ''>('');
  const [readingLevel, setReadingLevel] = useState<ReadingLevel | ''>('');
  const [goal, setGoal] = useState(10);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name ?? '');
    setGender((profile.gender as Gender | null) ?? '');
    setBirthDate(profile.birth_date ?? '');
    setGrade((profile.grade as Grade | null) ?? '');
    setReadingLevel((profile.reading_level as ReadingLevel | null) ?? '');
    setGoal(profile.daily_goal_minutes ?? 10);
  }, [profile]);

  const { data: subjects = [] } = useQuery({
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
    await save({
      display_name: name.trim(),
      gender: gender || null,
      birth_date: birthDate || null,
      grade: grade || null,
      reading_level: readingLevel || null,
      daily_goal_minutes: goal,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <Link to="/">
          <Button variant="ghost">← 홈</Button>
        </Link>
        <h1 className="text-3xl font-bold text-glow-600">설정</h1>
      </header>

      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-slate-700">프로필</h2>

        <label className="flex flex-col gap-1 text-sm font-bold text-slate-600">
          이름
          <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
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

        <div className="flex items-center gap-3">
          <Button onClick={() => void onSaveProfile()}>프로필 저장</Button>
          {saved ? <span className="text-sm font-bold text-green-600">저장했어요</span> : null}
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-slate-700">과목별 단계</h2>
        <p className="text-sm text-slate-400">
          한글은 &lsquo;기적의 한글 학습&rsquo; 단계(1~35)예요. &lsquo;여기서 멈춰&rsquo;를 켜면
          아이가 잘해도 다음 단계로 넘어가지 않아요.
        </p>

        {subjects.map((s) => {
          const current = levels[s.id] ?? { level: 1, locked: false };
          const max = s.slug === 'hangul' ? 35 : 10;
          return (
            <div key={s.id} className="flex flex-wrap items-center gap-4 border-t border-glow-100 pt-4">
              <span className="w-16 font-bold text-slate-700">{s.title}</span>

              <select
                aria-label={`${s.title} 단계`}
                className="min-h-touch rounded-xl border-2 border-glow-100 px-3 text-lg"
                value={current.level}
                onChange={(e) => void setSubjectLevel(s.id, Number(e.target.value), current.locked)}
              >
                {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}단계
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  aria-label={`${s.title} 여기서 멈춰`}
                  className="h-6 w-6"
                  checked={current.locked}
                  onChange={(e) => void setSubjectLevel(s.id, current.level, e.target.checked)}
                />
                여기서 멈춰
              </label>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
