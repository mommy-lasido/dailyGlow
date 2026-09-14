import { hasStrokes, STROKES, type Stroke } from '@/lib/strokes';

/**
 * 획순 안내.
 *
 * **글자와 쓰는 법을 나란히 둔다.** 왼쪽은 아무것도 얹지 않은 검은 글자,
 * 오른쪽은 화살표와 번호로 쓰는 순서를 보여주는 그림이다.
 *
 * 한동안 글자 위에 번호를 얹어 보았는데, 번호를 읽을 만큼 키우면 글자를 가리고
 * 글자가 살 만큼 줄이면 번호가 안 읽혔다. 둘은 서로 다른 것을 보여주는 그림이라
 * 한 자리에 겹쳐 놓을 것이 아니었다 — 왼쪽은 **무엇을 쓰는지**, 오른쪽은
 * **어떻게 쓰는지**.
 *
 * 획이 그려지는 장면(애니메이션)은 만들지 않았다. 영숙님 말대로 아이들은 그런
 * 것을 한 번 보고 말지만, 번호와 화살표는 종이에 쓰는 내내 곁에 둘 수 있다.
 */

/** 획순 그림의 안내선 색 */
const GUIDE = '#5e9a44';
/** 획순 그림에서 글자를 받쳐 주는 연한 색 */
const FAINT = '#d7e3cd';
/** 안내선을 획에서 얼마나 떨어뜨릴지 */
const OFFSET = 15;

/**
 * 안내선을 어느 쪽으로 뺄지.
 *
 * 시중 쓰기표가 화살표를 두는 자리를 따른다 — **세로획은 왼쪽 옆에, 가로획은
 * 위쪽에.** 비스듬한 획(ㅅ ㅈ ㅊ)은 가는 방향을 왼쪽으로 90도 돌린 쪽으로 뺀다.
 */
function normal(a: [number, number], b: [number, number]): [number, number] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  if (Math.abs(dx) < len * 0.3) return [-1, 0];
  if (Math.abs(dy) < len * 0.3) return [0, -1];
  return [dy / len, -dx / len];
}

/**
 * 획을 옆으로 밀어 화살표가 지나갈 길을 만든다.
 *
 * **마디마다 따로 민다.** 처음 마디의 방향으로 통째로 밀면, 꺾이는 획(ㄱ ㄴ ㅁ)의
 * 뒷마디에서 안내선이 글자 위로 올라탄다. 동그라미로 닫히는 획(ㅇ, ㅎ)은 안쪽으로
 * 밀리므로 방향을 뒤집어 바깥으로 뺀다.
 */
function offsetStroke(stroke: Stroke): Stroke {
  const closed =
    stroke.length > 2 &&
    stroke[0]![0] === stroke[stroke.length - 1]![0] &&
    stroke[0]![1] === stroke[stroke.length - 1]![1];
  const sign = closed ? -1 : 1;

  return stroke.map((point, i) => {
    const before = i > 0 ? normal(stroke[i - 1]!, point) : null;
    const after = i < stroke.length - 1 ? normal(point, stroke[i + 1]!) : null;
    const nx = ((before?.[0] ?? 0) + (after?.[0] ?? 0)) / (before && after ? 2 : 1);
    const ny = ((before?.[1] ?? 0) + (after?.[1] ?? 0)) / (before && after ? 2 : 1);
    const len = Math.hypot(nx, ny) || 1;
    return [point[0] + (nx / len) * OFFSET * sign, point[1] + (ny / len) * OFFSET * sign];
  });
}

/** 획의 끝 방향(도). 화살촉을 어느 쪽으로 돌릴지 정한다. */
function endAngle(stroke: Stroke): number {
  const end = stroke[stroke.length - 1]!;
  const before = stroke[stroke.length - 2] ?? end;
  return (Math.atan2(end[1] - before[1], end[0] - before[0]) * 180) / Math.PI;
}

function points(stroke: Stroke): string {
  return stroke.map(([x, y]) => `${x},${y}`).join(' ');
}

/** 아무것도 얹지 않은 글자. 아이가 익혀야 할 모양 그대로다. */
export function LetterGlyph({ letter, className }: { letter: string; className?: string }) {
  if (!hasStrokes(letter)) return null;
  return <Glyph letter={letter} className={className ?? 'h-44 w-44'} />;
}

/** 쓰는 법만. 글자는 따로 보여주고 이것만 아래에 붙일 때 쓴다. */
export function StrokeOrder({ letter, className }: { letter: string; className?: string }) {
  if (!hasStrokes(letter)) return null;
  return <Order letter={letter} className={className ?? 'h-40 w-40'} />;
}

function Glyph({ letter, className }: { letter: string; className: string }) {
  return (
    <svg
      data-testid="stroke-glyph"
      viewBox="-6 -6 112 112"
      className={className}
      role="img"
      aria-label={letter}
    >
      {STROKES[letter]!.map((stroke, i) => (
        <polyline
          key={i}
          points={points(stroke)}
          fill="none"
          stroke="#1f2937"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

/** 쓰는 법 — 번호와 화살표로 순서를 보여준다. */
function Order({ letter, className }: { letter: string; className: string }) {
  const strokes = STROKES[letter]!;

  return (
    <svg
      data-testid="stroke-order"
      viewBox="-26 -26 152 152"
      className={className}
      role="img"
      aria-label={`${letter} 쓰는 순서`}
    >
      {/* 글자는 연하게 깔아 둔다 — 화살표가 어느 획을 가리키는지만 보이면 된다. */}
      {strokes.map((stroke, i) => (
        <polyline
          key={`faint-${i}`}
          points={points(stroke)}
          fill="none"
          stroke={FAINT}
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {strokes.map((stroke, i) => {
        const guide = offsetStroke(stroke);
        const start = guide[0]!;
        const end = guide[guide.length - 1]!;

        return (
          <g key={`order-${i}`}>
            <polyline
              data-testid="stroke-arrow-line"
              points={points(guide)}
              fill="none"
              stroke={GUIDE}
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polygon
              data-testid="stroke-arrow"
              points="0,-6 13,0 0,6"
              fill={GUIDE}
              transform={`translate(${end[0]} ${end[1]}) rotate(${endAngle(stroke)})`}
            />
            <circle cx={start[0]} cy={start[1]} r="10" fill={GUIDE} />
            <text
              data-testid="stroke-number"
              x={start[0]}
              y={start[1]}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="13"
              fontWeight="700"
              fill="#ffffff"
            >
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function StrokeGuide({ letter, size = 'lg' }: { letter: string; size?: 'lg' | 'md' }) {
  if (!hasStrokes(letter)) return null;
  const box = size === 'lg' ? 'h-44 w-44' : 'h-28 w-28';

  return (
    <div data-testid="stroke-guide" className="flex items-center justify-center gap-4">
      <Glyph letter={letter} className={box} />
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm text-slate-400">이렇게 써요</span>
        <Order letter={letter} className={box} />
      </div>
    </div>
  );
}
