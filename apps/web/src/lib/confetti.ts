/**
 * 화면 위에서 이모지가 떨어지는 짧은 축하 효과.
 * 기존 시윤이 앱에 있던 것을 그대로 옮겼다. 3초 뒤 스스로 사라진다.
 */
const EMOJIS = ['🎉', '✨', '❤️', '🎈', '🌈', '💛'];

export function spawnConfetti(count = 14): void {
  if (typeof document === 'undefined') return;
  for (let i = 0; i < count; i += 1) {
    const el = document.createElement('div');
    el.className = 'confetti';
    el.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)]!;
    el.style.left = `${Math.random() * 100}vw`;
    el.style.animationDuration = `${1.6 + Math.random() * 1.2}s`;
    el.style.fontSize = `${16 + Math.random() * 14}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
}
