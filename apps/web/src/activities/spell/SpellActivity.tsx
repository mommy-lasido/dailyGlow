import { useMemo, useState } from 'react';
import { Button, Card } from '@dailyglow/ui';
import { spawnConfetti } from '@/lib/confetti';
import { mixReview, recentWrong, rememberWrong } from '@/lib/review';
import { useProfile } from '@/stores/profile';
import type { ActivityProps } from '@/activities/types';
import { lessonsOf, wordsOf, type VocabWord } from './words';
import {
  isDone,
  isNext,
  makeSpellSet,
  SPELL_PROBLEM_COUNT,
  type SpellProblem,
} from './generate';

/**
 * Spell It — 섞인 글자를 차례대로 눌러 낱말을 되살린다.
 *
 * 라윤이는 낱말의 뜻을 모르는 것이 아니라 **철자의 끝을 보지 않는다.**
 * 그래서 고르는 놀이가 아니라 한 글자씩 짚는 놀이로 만든다. 마지막 글자까지
 * 누르지 않으면 끝나지 않으므로 빠뜨릴 방법이 없다.
 *
 * **화면이 온통 영어다.** 영숙님이 정했다 — 한국어로 거들면 아이가 영어를 알아서
 * 맞힌 것인지 한국어를 보고 맞힌 것인지 갈라낼 수 없다.
 *
 * 다른 활동과 달리 1·2·3차로 나누지 않는다. 틀려도 그 자리에서 다시 누르면
 * 되고, 낱말은 맞출 때까지 화면에 남는다. **틀린 낱말은 다음 판에 다시 나온다**
 * (`lib/review`).
 */
export function SpellActivity({ lesson, onFinish }: ActivityProps) {
  const profileId = useProfile((s) => s.profile?.id ?? null);
  const book = bookOf(lesson.config);
  const lessons = useMemo(() => lessonsOf(book), [book]);

  const [chosen, setChosen] = useState<number | null>(null);
  const [problems, setProblems] = useState<SpellProblem[]>([]);
  const [at, setAt] = useState(0);
  const [typed, setTyped] = useState('');
  /** 방금 잘못 누른 글자의 자리. 잠깐 붉었다가 돌아온다. */
  const [missAt, setMissAt] = useState<number | null>(null);
  /** 이 낱말에서 한 번이라도 잘못 눌렀는가. */
  const [missed, setMissed] = useState(false);
  const [wrongWords, setWrongWords] = useState<string[]>([]);
  const [startedAt, setStartedAt] = useState(0);
  const [done, setDone] = useState(false);

  function begin(which: number) {
    const pool: VocabWord[] = mixReview(
      wordsOf(book, which),
      (w) => w.word,
      recentWrong(profileId, `spell:${book}`),
      SPELL_PROBLEM_COUNT,
    );
    setProblems(makeSpellSet(pool));
    setChosen(which);
    setAt(0);
    setTyped('');
    setMissed(false);
    setWrongWords([]);
    setStartedAt(Date.now());
  }

  function finish(wrong: string[]) {
    setDone(true);
    spawnConfetti();
    rememberWrong(profileId, `spell:${book}`, wrong);
    onFinish({
      totalCount: problems.length,
      // 한 번도 안 틀린 낱말만 센다. 고쳐서 맞힌 것은 "결국 됐다" 는 뜻이다.
      correctCount: problems.length - wrong.length,
      durationSec: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      meta: { book, lesson: chosen, wrong },
    });
  }

  function tap(letter: string, index: number) {
    const problem = problems[at];
    if (!problem) return;

    if (!isNext(problem.answer, typed, letter)) {
      setMissed(true);
      setMissAt(index);
      window.setTimeout(() => setMissAt(null), 500);
      return;
    }

    const next = typed + letter;
    setTyped(next);
    if (!isDone(problem.answer, next)) return;

    // 낱말 하나를 끝냈다.
    spawnConfetti(8);
    const wrong = missed ? [...wrongWords, problem.answer] : wrongWords;
    setWrongWords(wrong);

    window.setTimeout(() => {
      if (at + 1 >= problems.length) {
        finish(wrong);
        return;
      }
      setAt(at + 1);
      setTyped('');
      setMissed(false);
    }, 1100);
  }

  // ── 과 고르기 ────────────────────────────────────────
  if (chosen === null) {
    return (
      <Card className="flex flex-col items-center gap-5 text-center">
        <h1 className="text-3xl font-bold text-glow-600">Spell It</h1>
        <p className="text-lg text-slate-500">
          Read the meaning. Tap the letters in the right order.
        </p>
        <p className="text-sm text-slate-400">Book {book} · pick a lesson</p>

        <div className="grid w-full grid-cols-5 gap-2 sm:grid-cols-8">
          {lessons.map((n) => (
            <button
              key={n}
              type="button"
              data-testid="spell-lesson"
              onClick={() => begin(n)}
              className="min-h-touch rounded-2xl bg-glow-50 py-3 text-xl font-bold text-glow-700 transition-transform active:scale-95"
            >
              {n}
            </button>
          ))}
        </div>
      </Card>
    );
  }

  // ── 끝 ───────────────────────────────────────────────
  if (done) {
    return (
      <Card className="flex flex-col items-center gap-4 text-center">
        <span className="text-6xl">🎉</span>
        <h2 className="text-2xl font-bold text-glow-600">All done!</h2>
        <p className="text-lg text-slate-600">
          {problems.length - wrongWords.length} of {problems.length} on the first try
        </p>
        {wrongWords.length > 0 ? (
          <p data-testid="spell-wrong" className="text-slate-500">
            Words to watch: <b>{wrongWords.join(', ')}</b>
          </p>
        ) : null}
      </Card>
    );
  }

  const problem = problems[at];
  if (!problem) return null;
  const finished = isDone(problem.answer, typed);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-slate-400">
        {at + 1} / {problems.length}
      </p>

      <Card className="flex flex-col items-center gap-6 text-center">
        {/* 뜻. 영어로만 쓴다. */}
        <p data-testid="spell-clue" className="text-xl leading-relaxed text-slate-600">
          {problem.clue}
        </p>

        {/* 채워지는 칸. 다 채우면 칸이 사라지고 낱말만 남는다. */}
        {finished ? (
          <p
            data-testid="spell-word"
            className="animate-pop text-5xl font-bold tracking-wide text-glow-600"
          >
            {problem.answer}
          </p>
        ) : (
          <div className="flex flex-wrap justify-center gap-2">
            {[...problem.answer].map((_, i) => (
              <span
                key={i}
                data-testid="spell-slot"
                data-filled={i < typed.length ? 'yes' : undefined}
                className={`flex h-14 w-11 items-center justify-center rounded-xl text-3xl font-bold ${
                  i < typed.length
                    ? 'bg-glow-100 text-slate-700'
                    : 'border-2 border-dashed border-glow-300 text-transparent'
                }`}
              >
                {typed[i] ?? '·'}
              </span>
            ))}
          </div>
        )}

        {/* 섞인 글자. 이미 쓴 만큼은 흐려진다. */}
        {finished ? null : (
          <div className="flex flex-wrap justify-center gap-2">
            {problem.letters.map((letter, i) => {
              const usedCount = countOf(typed, letter);
              const haveCount = countOf(problem.letters.slice(0, i + 1).join(''), letter);
              const spent = haveCount <= usedCount;
              return (
                <button
                  key={i}
                  type="button"
                  data-testid="spell-letter"
                  data-letter={letter}
                  disabled={spent}
                  onClick={() => tap(letter, i)}
                  className={`min-h-touch w-12 rounded-2xl py-2 text-2xl font-bold transition-transform active:scale-95 ${
                    spent
                      ? 'bg-slate-50 text-slate-300'
                      : missAt === i
                        ? 'bg-rose-100 text-rose-400'
                        : 'bg-glow-50 text-slate-700'
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        )}

        <p className="min-h-[1.75rem] font-bold text-glow-600">
          {finished ? 'Nice!' : missAt !== null ? 'Not that one — look again.' : ''}
        </p>
      </Card>

      {typed.length > 0 && !finished ? (
        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => setTyped('')}>
            Start over
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** 글자가 몇 번 나오는가. 같은 글자가 여러 번 있는 낱말을 다루려고 쓴다. */
function countOf(text: string, letter: string): number {
  let n = 0;
  for (const ch of text) if (ch === letter) n += 1;
  return n;
}

/** lessons.config.book 으로 어느 권인지 정한다. 없으면 2권. */
function bookOf(config: unknown): number {
  if (config && typeof config === 'object') {
    const book = (config as { book?: unknown }).book;
    if (typeof book === 'number') return book;
  }
  return 2;
}
