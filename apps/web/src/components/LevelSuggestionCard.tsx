import { useState } from 'react';
import { Button, Card } from '@dailyglow/ui';
import { useProfile } from '@/stores/profile';
import {
  JUDGE_WINDOW,
  PROMOTE_RATIO,
  type LevelSuggestion,
} from '@/lib/promotion';

/**
 * "올릴 때가 된 것 같아요" 를 부모에게 물어보는 카드.
 *
 * 앱이 혼자 단계를 바꾸지 않는다는 원칙이 여기서 지켜진다. 조건을 채워도
 * 버튼을 누르기 전까지는 아무것도 바뀌지 않는다.
 */
export function LevelSuggestionCard({
  suggestion,
  onDone,
}: {
  suggestion: LevelSuggestion;
  onDone: () => void;
}) {
  const setSubjectLevel = useProfile((s) => s.setSubjectLevel);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  /** 이번에 켜 놓은 동안만 숨긴다. 다음에 열면 조건이 그대로일 때 다시 묻는다. */
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const promote = suggestion.kind === 'promote';
  const percent = Math.round(PROMOTE_RATIO * 100);

  async function apply() {
    setSaving(true);
    setError('');
    const res = await setSubjectLevel(suggestion.subjectId, suggestion.toLevel);
    setSaving(false);
    // 실패를 조용히 넘기면 부모는 바뀐 줄 알고 넘어간다.
    if (res?.error) {
      setError('지금 저장이 안 됐어요. 잠시 뒤에 다시 눌러주세요.');
      return;
    }
    onDone();
  }

  return (
    <Card
      data-testid="level-suggestion"
      className={`flex flex-col gap-3 ${promote ? 'ring-2 ring-glow-300' : ''}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-4xl">{promote ? '🌱' : '🧸'}</span>
        <h2 className="text-xl font-bold text-glow-600">
          {promote
            ? `${suggestion.subjectTitle}, 다음 단계로 넘어가도 될 것 같아요`
            : `${suggestion.subjectTitle}이 조금 어려운 것 같아요`}
        </h2>
      </div>

      <p className="text-slate-600">
        {promote ? (
          <>
            최근 {JUDGE_WINDOW}번의 <b>{suggestion.lessonTitle}</b>에서 처음 풀 때부터{' '}
            {percent}% 넘게 맞혔어요.
            {suggestion.unlocksTitle ? (
              <>
                {' '}
                올리면 <b>{suggestion.unlocksTitle}</b>이 새로 열려요.
              </>
            ) : null}
          </>
        ) : (
          <>
            최근 {JUDGE_WINDOW}번의 <b>{suggestion.lessonTitle}</b>에서 처음 풀 때 절반도
            맞히지 못했어요. 한 단계 내려서 자신감을 붙여보는 건 어떨까요?
          </>
        )}
      </p>

      {/* 점수는 1차(처음 풀 때)만 센다. 다시 풀어 고친 것은 들어가지 않으므로
          이 숫자는 아이의 실제 실력에 가깝다. */}
      <p className="text-sm text-slate-400">
        다시 풀어서 고친 것은 빼고, 처음 풀었을 때만 센 점수예요.
      </p>

      {error ? <p className="font-bold text-red-500">{error}</p> : null}

      <div className="flex gap-3">
        <Button size="lg" disabled={saving} onClick={() => void apply()}>
          {saving ? '바꾸는 중…' : promote ? '다음 단계로 올리기' : '한 단계 내리기'}
        </Button>
        <Button variant="ghost" disabled={saving} onClick={() => setDismissed(true)}>
          나중에
        </Button>
      </div>
    </Card>
  );
}
