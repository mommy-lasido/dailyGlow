/**
 * 지금 몇 번째 문제를 풀고 있는지 보여주는 줄. 모든 활동이 같은 것을 쓴다.
 *
 * 전에는 푼 만큼 발바닥(🐾)이 늘고 나머지는 가운뎃점(·)이었다. 시작하자마자
 * 화면에 점만 줄지어 있어 무언가 잘못된 것처럼 보였다. 이제 1번부터 문제 번호를
 * 그대로 적고, 푼 것은 채우고 지금 풀 것은 테두리로 짚는다.
 *
 * 1·2차에는 맞았는지 틀렸는지 알려주지 않으므로, 여기에도 정답 여부는 담지 않는다.
 * 어디까지 왔는지만 보여준다.
 */
export function Progress({ total, done }: { total: number; done: number }) {
  return (
    <ol
      data-testid="progress"
      aria-label={`${total}문제 중 ${done + 1}번째`}
      className="flex flex-wrap justify-center gap-2"
    >
      {Array.from({ length: total }).map((_, i) => {
        const passed = i < done;
        const current = i === done;
        return (
          <li
            key={i}
            data-testid="progress-step"
            data-state={passed ? 'done' : current ? 'current' : 'todo'}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              passed
                ? 'bg-glow-500 text-white'
                : current
                  ? 'bg-white text-glow-600 ring-2 ring-glow-500'
                  : 'bg-white text-slate-300'
            }`}
          >
            {i + 1}
          </li>
        );
      })}
    </ol>
  );
}
