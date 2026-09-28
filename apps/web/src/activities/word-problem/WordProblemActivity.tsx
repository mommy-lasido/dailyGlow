import { useMemo, useState } from 'react';
import { Button, Card } from '@dailyglow/ui';
import { spawnConfetti } from '@/lib/confetti';
import type { ActivityProps } from '@/activities/types';
import { askChoices, makeSet, PROBLEM_COUNT, type WordProblem } from './generate';

/**
 * 문장제 — 묻는 것을 끝까지 읽는 연습.
 *
 * 화면에서 문장제를 내면 자칫 **보기 중에 고르기**가 된다. 답이 눈앞에 있으면
 * 아이는 계산해서 맞는 것을 찾을 뿐 문제를 해부하지 않는다. 그래서 두 걸음으로
 * 나눈다.
 *
 *   ① **무엇을 묻고 있나** — 중간값과 최종값을 갈라내는 자리. 종이에서 밑줄을
 *      긋는 일과 같다.
 *   ② **답은 얼마인가** — 보기에서 고르지 않고 숫자를 적는다. 찍을 수가 없다.
 *
 * 틀리면 답을 알려주지 않고 **어디를 잘못 봤는지**만 짚어 준다. 계산이 틀린
 * 것과 묻는 것을 잘못 읽은 것은 다른 일이라, 고치는 자리도 달라야 한다.
 */
export function WordProblemActivity({ onFinish }: ActivityProps) {
  const [problems] = useState<WordProblem[]>(() => makeSet(PROBLEM_COUNT));
  const [at, setAt] = useState(0);
  /** 지금 걸음 — 묻는 것을 고르는 중인가, 답을 적는 중인가 */
  const [step, setStep] = useState<'ask' | 'answer'>('ask');
  const [typed, setTyped] = useState('');
  /** 틀렸을 때 짚어 주는 말 */
  const [hint, setHint] = useState('');
  /** 이 문제에서 한 번이라도 틀렸는가 */
  const [missed, setMissed] = useState(false);
  const [wrong, setWrong] = useState<string[]>([]);
  const [startedAt] = useState(() => Date.now());
  const [done, setDone] = useState(false);

  const problem = problems[at] ?? null;
  // 보기 차례는 문제마다 한 번만 정한다. 누를 때마다 섞이면 아이가 읽던 자리를 잃는다.
  const choices = useMemo(() => (problem ? askChoices(problem) : []), [problem]);

  function finish(missedList: string[]) {
    setDone(true);
    spawnConfetti();
    onFinish({
      totalCount: problems.length,
      // 한 번에 맞힌 것만 센다. 고쳐서 맞힌 것은 "결국 됐다" 는 뜻이다.
      correctCount: problems.length - missedList.length,
      durationSec: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      meta: { wrong: missedList },
    });
  }

  function next(missedList: string[]) {
    if (at + 1 >= problems.length) {
      finish(missedList);
      return;
    }
    setAt(at + 1);
    setStep('ask');
    setTyped('');
    setHint('');
    setMissed(false);
  }

  function pickAsk(choice: string) {
    if (!problem) return;
    if (choice !== problem.asks) {
      setMissed(true);
      setHint(problem.askHint);
      return;
    }
    setHint('');
    setStep('answer');
  }

  function submitAnswer() {
    if (!problem || typed === '') return;
    if (Number(typed) !== problem.answer) {
      setMissed(true);
      setHint(problem.answerHint);
      setTyped('');
      return;
    }

    spawnConfetti(8);
    const nextWrong = missed ? [...wrong, problem.kind] : wrong;
    setWrong(nextWrong);
    setHint('');
    next(nextWrong);
  }

  // ── 끝 ───────────────────────────────────────────────
  if (done) {
    return (
      <Card className="flex flex-col items-center gap-4 text-center">
        <span className="text-6xl">🎉</span>
        <h2 className="text-2xl font-bold text-glow-600">다 풀었어요!</h2>
        <p className="text-lg text-slate-600">
          {problems.length}문제 중 <b>{problems.length - wrong.length}문제</b>를 한 번에
          맞혔어요
        </p>
        {/* 무엇을 틀렸는지는 적지 않는다. 함정의 이름을 아는 것은 어른의 일이고,
            아이에게는 다음 판에 같은 함정이 다시 나오는 것으로 충분하다. */}
      </Card>
    );
  }

  if (!problem) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold text-glow-600">문장제</p>
        <p className="text-slate-400">
          {at + 1} / {problems.length}
        </p>
      </div>

      {/* 문제는 두 걸음 내내 자리에 남는다. 답을 적을 때도 다시 읽을 수 있어야 한다. */}
      <Card className="flex flex-col gap-3">
        <p data-testid="problem-text" className="text-xl leading-relaxed text-slate-700">
          {problem.text}
        </p>
      </Card>

      {step === 'ask' ? (
        <Card className="flex flex-col gap-4">
          <p className="text-lg font-bold text-glow-600">이 문제는 무엇을 묻고 있나요?</p>
          <div className="flex flex-col gap-2">
            {choices.map((c) => (
              <button
                key={c}
                type="button"
                data-testid="ask-choice"
                onClick={() => pickAsk(c)}
                className="min-h-touch rounded-2xl bg-glow-50 px-4 py-3 text-left text-lg text-slate-700 transition-transform active:scale-[0.98]"
              >
                {c}
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="flex flex-col items-center gap-4">
          <p className="text-lg font-bold text-glow-600">
            {problem.asks}는 얼마일까요?
          </p>

          {/* 숫자를 적는다. 보기에서 고르면 셈해서 맞는 것을 찾을 뿐이다. */}
          <div className="flex items-center gap-2">
            <input
              data-testid="answer-input"
              inputMode="numeric"
              pattern="[0-9]*"
              value={typed}
              onChange={(e) => setTyped(e.target.value.replace(/[^0-9]/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitAnswer();
              }}
              aria-label="답"
              className="h-16 w-36 rounded-2xl bg-glow-50 text-center text-4xl font-bold text-slate-700 outline-none ring-2 ring-glow-300 focus:ring-glow-500"
            />
            <span className="text-3xl font-bold text-slate-500">{problem.unit}</span>
          </div>

          <Button size="lg" data-testid="answer-submit" disabled={typed === ''} onClick={submitAnswer}>
            이거예요!
          </Button>
        </Card>
      )}

      {/* 틀렸을 때만 나온다. 답을 알려주지 않고 어디를 잘못 봤는지만 짚어 준다. */}
      {hint ? (
        <Card data-testid="hint" className="bg-glow-50 text-lg text-glow-700">
          💡 {hint.replace(/\*\*/g, '')}
        </Card>
      ) : null}
    </div>
  );
}
