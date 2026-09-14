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
 * 비밀번호 칸 — **네 자리를 네 칸으로 나눠 보여준다.**
 *
 * 한 칸에 글자 사이만 띄워 두었더니 마지막 점이 칸 밖으로 밀려 나가, 네 자리를
 * 쳤는데 점이 셋만 보였다. 칸을 넓혀도 글꼴이나 화면 크기가 바뀌면 또 어긋난다.
 *
 * 칸을 아예 나누면 어긋날 자리가 없다. **몇 자리를 쳤는지 눈으로 셀 수 있고**,
 * 네 자리를 다 채웠는지도 한눈에 보인다.
 *
 * 글자를 받는 것은 눈에 보이지 않는 칸 하나가 맡는다. 칸을 넷으로 나눠 각각
 * 입력을 받으면 지우고 옮겨 다니는 일을 일일이 다뤄야 하는데, 그럴 까닭이 없다.
 */
function PinField({
  id,
  label,
  value,
  onChange,
  onEnter,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  onEnter?: () => void;
}) {
  return (
    <label className="flex flex-col items-center gap-1">
      <span className="text-sm font-bold text-slate-500">{label}</span>

      <span className="relative inline-block">
        <input
          data-testid={id}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={PIN_LENGTH}
          value={value}
          onChange={(e) => onChange(onlyDigits(e.target.value))}
          onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
          // 글자는 이 칸이 받되 눈에는 보이지 않는다. 보이는 것은 아래 네 칸이다.
          className="absolute inset-0 h-full w-full cursor-pointer rounded-2xl text-transparent caret-transparent opacity-0"
        />
        <span aria-hidden className="pointer-events-none flex gap-2">
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <span
              key={i}
              data-testid={`${id}-cell`}
              data-filled={i < value.length ? 'yes' : undefined}
              className={`flex h-14 w-12 items-center justify-center rounded-2xl border-2 text-3xl text-slate-700 ${
                i < value.length ? 'border-glow-500 bg-white' : 'border-glow-300 bg-glow-50'
              }`}
            >
              {i < value.length ? '●' : ''}
            </span>
          ))}
        </span>
      </span>
    </label>
  );
}

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

      {/* 칸마다 이름을 붙여 둔다. 자리표시 글씨로 알리면 치기 시작할 때 사라져
          무슨 칸인지 알 수 없게 된다. */}
      <PinField
        id="pin-first"
        label="비밀번호"
        value={first}
        onChange={(v) => {
          setFirst(v);
          setError('');
        }}
      />

      <PinField
        id="pin-again"
        label="비밀번호 확인"
        value={again}
        onChange={(v) => {
          setAgain(v);
          setError('');
        }}
        onEnter={save}
      />

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

      <PinField
        id="pin-input"
        label="비밀번호"
        value={pin}
        onChange={(v) => {
          setValue(v);
          setError('');
        }}
        onEnter={submit}
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
