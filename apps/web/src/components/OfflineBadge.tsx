import { useEffect, useState } from 'react';

export function OfflineBadge() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (online) return null;

  return (
    <div className="mb-3 rounded-2xl bg-slate-800 px-4 py-2 text-center text-sm font-bold text-white">
      오프라인 모드 · 인터넷이 연결되면 자동으로 저장돼요
    </div>
  );
}
