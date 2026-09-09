/**
 * 활동 카드에 붙는 그림.
 *
 * 이모지를 쓰지 않고 직접 그린다. 이모지는 기기마다 생김새가 달라지고(같은 🔤 가
 * 아이패드와 안드로이드에서 다르게 보인다), 어떤 것은 아예 네모로 깨진다.
 * 무엇보다 이모지에는 **한글을 배우는 칸**을 뜻하는 그림이 없다.
 *
 * 모든 그림은 64×64 격자 안에 그리고 색은 앱의 색(주황 glow, 하늘 sky)만 쓴다.
 * 글자가 없어도 무엇을 하는 칸인지 알아볼 수 있어야 한다 — 이 앱을 쓰는 아이 중
 * 둘은 아직 글을 못 읽는다.
 */

const ORANGE = '#ea580c'; // glow-600
const ORANGE_MID = '#f97316'; // glow-500
const ORANGE_SOFT = '#ffedd5'; // glow-100
const ORANGE_LINE = '#fdba74'; // glow-300
const BLUE = '#0ea5e9'; // sky-500
const PAPER = '#ffffff';

/** 획은 모두 같은 굵기와 둥근 끝으로 그린다 — 한 벌처럼 보이게. */
const stroke = {
  strokeWidth: 5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
};

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 64 64" role="presentation" className="h-full w-full">
      {children}
    </svg>
  );
}

/** 자음모음 배우기 — 낱장 위에 ㄱ 과 ㅏ */
function LetterCardsIcon() {
  return (
    <Frame>
      <rect x="4" y="8" width="56" height="48" rx="12" fill={ORANGE_SOFT} />
      {/* ㄱ */}
      <path d="M17 23 H31 V43" stroke={ORANGE} {...stroke} />
      {/* ㅏ */}
      <path d="M43 19 V45" stroke={BLUE} {...stroke} />
      <path d="M43 31 H53" stroke={BLUE} {...stroke} />
    </Frame>
  );
}

/** 낱말 읽기 — 낱말 카드 두 장 */
function WordCardsIcon() {
  return (
    <Frame>
      <rect
        x="5"
        y="20"
        width="34"
        height="34"
        rx="9"
        fill={ORANGE_SOFT}
        stroke={ORANGE_LINE}
        strokeWidth="3"
      />
      <rect
        x="25"
        y="10"
        width="34"
        height="34"
        rx="9"
        fill={PAPER}
        stroke={ORANGE_MID}
        strokeWidth="3"
      />
      {/* 앞장에 적힌 낱말 두 줄 */}
      <path d="M33 22 H51" stroke={ORANGE_MID} {...stroke} strokeWidth="4" />
      <path d="M33 32 H45" stroke={ORANGE_LINE} {...stroke} strokeWidth="4" />
    </Frame>
  );
}

/** 문장 읽기 — 펼친 책 */
function ReadingCardsIcon() {
  return (
    <Frame>
      <path
        d="M32 18C26 13 15 12 7 15V47C15 44 26 45 32 50Z"
        fill={PAPER}
        stroke={ORANGE_MID}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M32 18C38 13 49 12 57 15V47C49 44 38 45 32 50Z"
        fill={ORANGE_SOFT}
        stroke={ORANGE_MID}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* 오른쪽 장에 적힌 글줄 */}
      <path d="M39 25 H50" stroke={ORANGE_LINE} {...stroke} strokeWidth="3" />
      <path d="M39 33 H50" stroke={ORANGE_LINE} {...stroke} strokeWidth="3" />
    </Frame>
  );
}

/** 쓰기 연습지 — 인쇄한 종이와 연필. 이 활동만 화면이 아니라 종이에서 한다. */
function WorksheetIcon() {
  return (
    <Frame>
      <rect
        x="10"
        y="7"
        width="36"
        height="50"
        rx="7"
        fill={PAPER}
        stroke={ORANGE_MID}
        strokeWidth="4"
      />
      <path d="M19 21 H37" stroke={ORANGE_LINE} {...stroke} strokeWidth="3" />
      <path d="M19 31 H37" stroke={ORANGE_LINE} {...stroke} strokeWidth="3" />
      <path d="M19 41 H30" stroke={ORANGE_LINE} {...stroke} strokeWidth="3" />
      {/* 연필 */}
      <path d="M52 12 L58 18 L38 38 L30 40 L32 32 Z" fill={ORANGE_SOFT} stroke={ORANGE} strokeWidth="4" strokeLinejoin="round" />
      <path d="M32 32 L38 38" stroke={ORANGE} strokeWidth="4" strokeLinecap="round" />
    </Frame>
  );
}

/** 수 세기 놀이 — 하나씩 짚어 세는 동그라미 셋 */
function CountPlayIcon() {
  return (
    <Frame>
      <circle cx="15" cy="40" r="10" fill={ORANGE_SOFT} stroke={ORANGE_MID} strokeWidth="4" />
      <circle cx="32" cy="40" r="10" fill={ORANGE_SOFT} stroke={ORANGE_MID} strokeWidth="4" />
      <circle cx="49" cy="40" r="10" fill={ORANGE_SOFT} stroke={ORANGE_MID} strokeWidth="4" />
      {/* 하나, 둘, 셋 — 세어 나가는 자취 */}
      <path d="M15 22 Q23 12 32 22 Q41 12 49 22" stroke={BLUE} {...stroke} strokeWidth="4" />
    </Frame>
  );
}

/** 더하기 놀이 — 두 묶음이 만나는 자리 */
function AddPlayIcon() {
  return (
    <Frame>
      <circle cx="14" cy="22" r="6" fill={ORANGE_MID} />
      <circle cx="14" cy="42" r="6" fill={ORANGE_MID} />
      <circle cx="50" cy="22" r="6" fill={BLUE} />
      <circle cx="50" cy="42" r="6" fill={BLUE} />
      <path d="M32 20 V44" stroke={ORANGE} {...stroke} />
      <path d="M20 32 H44" stroke={ORANGE} {...stroke} />
    </Frame>
  );
}

/** 100칸 계산 — 가로줄과 세로줄이 만나는 표 */
function GridDrillIcon() {
  return (
    <Frame>
      <rect x="7" y="7" width="50" height="50" rx="8" fill={PAPER} stroke={ORANGE_MID} strokeWidth="4" />
      {/* 머리줄 — 표의 첫 줄과 첫 칸 */}
      <path d="M7 22 H57" stroke={ORANGE_MID} strokeWidth="4" />
      <path d="M22 7 V57" stroke={ORANGE_MID} strokeWidth="4" />
      <rect x="7" y="7" width="15" height="15" fill={ORANGE_SOFT} />
      {/* 나머지 칸 */}
      <path d="M36 22 V57" stroke={ORANGE_LINE} strokeWidth="3" />
      <path d="M22 38 H57" stroke={ORANGE_LINE} strokeWidth="3" />
    </Frame>
  );
}

/** 맞춤법 탐험대 — 낱말을 들여다보는 돋보기 */
function SpellingIcon() {
  return (
    <Frame>
      <rect x="6" y="14" width="40" height="26" rx="7" fill={ORANGE_SOFT} />
      <path d="M14 24 H26" stroke={ORANGE_LINE} {...stroke} strokeWidth="4" />
      <path d="M14 32 H22" stroke={ORANGE_LINE} {...stroke} strokeWidth="4" />
      <circle cx="38" cy="36" r="14" fill="none" stroke={ORANGE} strokeWidth="5" />
      <path d="M48 46 L57 55" stroke={ORANGE} {...stroke} strokeWidth="6" />
    </Frame>
  );
}

/** 속담·사자성어 — 옛말이 적힌 두루마리 */
function SayingsIcon() {
  return (
    <Frame>
      <path
        d="M14 12H50a4 4 0 0 1 4 4v32a4 4 0 0 1-4 4H14z"
        fill={PAPER}
        stroke={ORANGE_MID}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* 말려 있는 양쪽 끝 */}
      <rect x="6" y="10" width="10" height="44" rx="5" fill={ORANGE_SOFT} stroke={ORANGE} strokeWidth="4" />
      <path d="M24 26 H46" stroke={ORANGE_LINE} {...stroke} strokeWidth="4" />
      <path d="M24 36 H40" stroke={ORANGE_LINE} {...stroke} strokeWidth="4" />
    </Frame>
  );
}

/** 아직 그림을 정하지 않은 활동 */
function DefaultIcon() {
  return (
    <Frame>
      <rect x="9" y="9" width="46" height="46" rx="11" fill={ORANGE_SOFT} stroke={ORANGE_MID} strokeWidth="4" />
      <path d="M22 26 H42" stroke={ORANGE_LINE} {...stroke} strokeWidth="4" />
      <path d="M22 38 H34" stroke={ORANGE_LINE} {...stroke} strokeWidth="4" />
    </Frame>
  );
}

export const ACTIVITY_ICONS: Record<string, () => JSX.Element> = {
  letter_cards: LetterCardsIcon,
  word_cards: WordCardsIcon,
  reading_cards: ReadingCardsIcon,
  worksheet: WorksheetIcon,
  count_play: CountPlayIcon,
  add_play: AddPlayIcon,
  grid_drill: GridDrillIcon,
  choice_quiz: SpellingIcon,
  sayings: SayingsIcon,
};

/**
 * `id` 는 활동 카드가 들고 있는 그림 이름이다. 아직 그림을 안 그린 활동은
 * 기본 그림으로 받아낸다 — 카드가 빈칸으로 남지 않게.
 */
export function ActivityIcon({ id, className }: { id: string; className?: string }) {
  const Icon = ACTIVITY_ICONS[id] ?? DefaultIcon;
  return (
    <span data-testid="activity-icon" data-icon={id} className={className}>
      <Icon />
    </span>
  );
}
