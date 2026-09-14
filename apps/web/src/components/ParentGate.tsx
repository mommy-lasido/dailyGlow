import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '@dailyglow/ui';
import { checkPin, hasPin, isUnlocked, isValidPin, PIN_LENGTH, setPin } from '@/lib/parentLock';

/**
 * 설정 앞을 막는 문.
 *
 * 설정에는 아이의 단계와 학년이 들어 있어 아이가 바꾸면 그날 나오는 문제가 통째로
 * 달라진다. 라윤이가 자꾸 열어 이것저것 바꾸어 놓는다고 영숙님이 알려주었다.
 *
 * 비밀번호가 아직 없으면 **정하는 화면**을, 있으면 **묻는 화면**을 보여준다.
 * 한 번 풀면 그 창을 닫을 때까지 다시 묻지 않는다.
 */
export function ParentGate({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(() => isUnlocked());
  const [making] = useState(() => !hasPin());

  if (open) return <>{children}</>;
  return making ? <MakePin onDone={() => setOpen(true)} /> : <AskPin onDone={() => setOpen(true)} />;
}

/** 숫자만, 네 자리까지. */
function onlyDigits(text: string): string {
  return text.replace(/[^0-9]/g, '').slice(0, PIN_LENGTH);
}

/**
 * 네 자리가 다 보여야 한다.
 *
 * 글자 사이를 띄우면(`tracking`) **마지막 글자 뒤에도 그만큼 띄개가 붙는다.**
 * 가운데 맞춤은 그 띄개까지 글자로 치므로 전체가 왼쪽으로 밀리고, 칸이 좁으면
 * 네 번째 점이 밖으로 밀려 나간다. 영숙님이 점 세 개만 찍힌다고 알려주었다.
 *
 * 칸을 넉넉히 넓히고, 밀린 만큼(`indent`) 되돌려 가운데로 맞춘다.
 */
const INPUT_CLASS =
  'w-52 rounded-2xl border-2 border-glow-300 bg-white px-4 py-3 text-center text-3xl tracking-[0.4em] indent-[0.4em] text-slate-700 outline-none focus:border-glow-500';

function MakePin({ onDone }: { onDone: () => void }) {
  const [first, setFirst] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState('');

  function save() {
    if (!isValidPin(first)) return setError('숫자 네 자리로 정해주세요.');
    if (first !== again) return setError('두 번 적은 것이 서로 달라요.');
    if (!setPin(first)) return setError('이 기기에서는 비밀번호를 저장할 수 없어요.');
    onDone();
  }

  return (
    <Card className="flex flex-col items-center gap-4 text-center">
      <span className="text-5xl">🔒</span>
      <h1 className="text-2xl font-bold text-glow-600">부모님 비밀번호를 정해주세요</h1>
      <p className="text-slate-500">
        설정에 들어올 때 물어볼 숫자 네 자리예요. 아이가 모르는 숫자로 정해주세요.
        <br />
        잘못 눌러 엉뚱한 번호가 정해지지 않게 두 번 적습니다.
      </p>

      {/* 칸마다 이름을 붙여 둔다. 자리표시 글씨로 알리면 글자 사이가 넓어
          잘려 보이고, 치기 시작하면 사라져 무슨 칸인지 알 수 없게 된다. */}
      <label className="flex flex-col items-center gap-1">
        <span className="text-sm font-bold text-slate-500">비밀번호</span>
        <input
          data-testid="pin-first"
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          value={first}
          onChange={(e) => {
            setFirst(onlyDigits(e.target.value));
            setError('');
          }}
          className={INPUT_CLASS}
        />
      </label>

      <label className="flex flex-col items-center gap-1">
        <span className="text-sm font-bold text-slate-500">비밀번호 확인</span>
        <input
          data-testid="pin-again"
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          value={again}
          onChange={(e) => {
            setAgain(onlyDigits(e.target.value));
            setError('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          className={INPUT_CLASS}
        />
      </label>

      <p data-testid="pin-error" className="min-h-[1.5rem] font-bold text-rose-500">
        {error}
      </p>

      <Button size="lg" onClick={save}>
        정하기
      </Button>
      <Link to="/">
        <Button variant="ghost">← 홈으로</Button>
      </Link>
    </Card>
  );
}

function AskPin({ onDone }: { onDone: () => void }) {
  const [pin, setValue] = useState('');
  const [error, setError] = useState('');

  function submit() {
    if (checkPin(pin)) return onDone();
    setValue('');
    setError('비밀번호가 달라요.');
  }

  return (
    <Card className="flex flex-col items-center gap-4 text-center">
      <span className="text-5xl">🔒</span>
      <h1 className="text-2xl font-bold text-glow-600">부모님만 들어갈 수 있어요</h1>

      <input
        data-testid="pin-input"
        type="password"
        inputMode="numeric"
        autoComplete="current-password"
        aria-label="비밀번호"
        value={pin}
        onChange={(e) => {
          setValue(onlyDigits(e.target.value));
          setError('');
        }}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        className={INPUT_CLASS}
      />

      <p data-testid="pin-error" className="min-h-[1.5rem] font-bold text-rose-500">
        {error}
      </p>

      <Button size="lg" onClick={submit}>
        들어가기
      </Button>
      <Link to="/">
        <Button variant="ghost">← 홈으로</Button>
      </Link>
    </Card>
  );
}
