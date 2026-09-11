import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button, Card } from '@dailyglow/ui';
import { useAuth } from '@/stores/auth';

export function LoginPage() {
  const status = useAuth((s) => s.status);
  const signIn = useAuth((s) => s.signInWithPassword);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === 'signed-in') return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn(email, password);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    navigate('/', { replace: true });
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-full max-w-md">
        {/* 영문 이름이 위에 크게, 한글 이름은 그 아래. 영숙님이 "데일리글로우" 라는
            이름이 더 예쁘다고 해서 순서를 바꿨다. 영문은 장식 글씨(Pacifico)로 쓴다. */}
        <div className="mb-6 text-center">
          <h1 className="font-display text-5xl leading-tight text-glow-600">DailyGlow</h1>
          <p className="mt-2 text-xl font-bold tracking-wide text-glow-700">하루배움</p>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-bold text-slate-600">
            이메일
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-touch rounded-2xl border-2 border-glow-100 px-4 text-lg focus:border-glow-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold text-slate-600">
            비밀번호
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-touch rounded-2xl border-2 border-glow-100 px-4 text-lg focus:border-glow-500 focus:outline-none"
            />
          </label>
          {error ? <p className="text-sm font-bold text-red-500">{error}</p> : null}
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? '들어가는 중…' : '시작하기'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
