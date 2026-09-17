/**
 * 틀린 것을 다시 만나게 한다 — 매쓰플랫이 "쌍둥이 문제" 라고 부르는 것.
 *
 * 리포트가 "넓다를 두 번 틀렸어요" 라고 알려 주어도, 다음 판이 여전히 아무거나
 * 뽑아 낸다면 아이가 그 낱말을 다시 만날 까닭이 없다. **틀린 것은 다음 판에 더
 * 자주 나와야 한다.** 그래야 리포트가 읽고 마는 것이 아니라 학습을 바꾼다.
 *
 * 한 판을 통째로 틀린 것으로 채우지는 않는다. 그러면 아이에게는 못하는 것만
 * 줄줄이 나오는 판이 되고, 앉기 싫어진다. **절반 남짓**만 채우고 나머지는 평소처럼
 * 뽑는다.
 *
 * 기록은 **이 기기에** 둔다(localStorage). 창고에도 남지만 판을 만드는 순간은
 * 기다릴 틈이 없고, 인터넷이 끊겨도 돌아가야 한다. 아이마다 따로 담는다 —
 * 태블릿 하나를 세 아이가 쓴다.
 */

/** 한 판에서 틀린 것으로 채울 수 있는 최대 비율. */
const REVIEW_SHARE = 0.5;
/** 한 자리에 기억해 둘 개수. 오래된 것부터 밀려난다. */
const KEEP = 40;
/** 이 날수가 지나면 잊는다. 한 달 전에 틀린 것은 지금의 약점이 아니다. */
const FORGET_DAYS = 30;

interface Mark {
  label: string;
  /** 틀린 횟수. 여러 번 틀린 것이 먼저 나온다. */
  count: number;
  /** 마지막으로 틀린 날 */
  at: number;
}

function storeKey(profileId: string, area: string): string {
  return `dailyglow.review.${profileId}.${area}`;
}

function read(profileId: string, area: string): Mark[] {
  try {
    const raw = window.localStorage.getItem(storeKey(profileId, area));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const old = Date.now() - FORGET_DAYS * 24 * 60 * 60 * 1000;
    return parsed.filter(
      (m): m is Mark =>
        typeof m === 'object' &&
        m !== null &&
        typeof (m as Mark).label === 'string' &&
        typeof (m as Mark).at === 'number' &&
        (m as Mark).at > old,
    );
  } catch {
    // 저장을 막아 둔 기기라면 그냥 평소대로 문제를 낸다.
    return [];
  }
}

/** 이번 판에서 틀린 것을 적어 둔다. */
export function rememberWrong(
  profileId: string | null,
  area: string,
  labels: string[],
): void {
  if (!profileId || labels.length === 0) return;
  try {
    const marks = read(profileId, area);
    const now = Date.now();

    for (const label of labels) {
      const found = marks.find((m) => m.label === label);
      if (found) {
        found.count += 1;
        found.at = now;
      } else {
        marks.push({ label, count: 1, at: now });
      }
    }

    // 최근에 틀린 것을 남긴다.
    marks.sort((a, b) => b.at - a.at);
    window.localStorage.setItem(
      storeKey(profileId, area),
      JSON.stringify(marks.slice(0, KEEP)),
    );
  } catch {
    // 적어 두지 못해도 문제 풀이는 그대로 돌아간다.
  }
}

/** 다시 만나야 할 것들. 많이 틀린 것, 최근에 틀린 것 차례로. */
export function recentWrong(profileId: string | null, area: string): string[] {
  if (!profileId) return [];
  return read(profileId, area)
    .sort((a, b) => b.count - a.count || b.at - a.at)
    .map((m) => m.label);
}

/** 이 아이의 이 자리 기록을 지운다. 단계를 바꿀 때처럼 판이 달라지면 쓴다. */
export function clearReview(profileId: string | null, area: string): void {
  if (!profileId) return;
  try {
    window.localStorage.removeItem(storeKey(profileId, area));
  } catch {
    // 지우지 못해도 오래된 것은 저절로 잊힌다.
  }
}

/**
 * 이번 판에 낼 것을 고른다 — **틀린 것 절반, 새것 절반.**
 *
 * 돌려주는 것은 `count` 개짜리 목록이다. 활동은 이것을 그대로 문제 만드는 데
 * 쓰면 된다. 순서는 뒤섞지 않는다 — 문제를 만드는 쪽이 어차피 섞는다.
 */
export function mixReview<T>(
  pool: T[],
  label: (item: T) => string,
  wrong: string[],
  count: number,
  rand: () => number = Math.random,
): T[] {
  if (pool.length <= count) return pool;

  const byLabel = new Map(pool.map((item) => [label(item), item]));
  const picked: T[] = [];
  const used = new Set<string>();

  // ① 틀렸던 것 중 지금 낼 수 있는 것부터.
  const room = Math.floor(count * REVIEW_SHARE);
  for (const w of wrong) {
    if (picked.length >= room) break;
    const item = byLabel.get(w);
    if (!item || used.has(w)) continue;
    picked.push(item);
    used.add(w);
  }

  // ② 나머지는 평소처럼 아무거나.
  const rest = pool.filter((item) => !used.has(label(item)));
  for (let i = rest.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [rest[i], rest[j]] = [rest[j]!, rest[i]!];
  }

  return [...picked, ...rest].slice(0, count);
}
