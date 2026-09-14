/**
 * 설정 잠금.
 *
 * 설정에는 아이의 단계, 학년, 하루 목표 같은 것이 들어 있다. 라윤이가 자꾸 열어
 * 이것저것 바꾸어 놓는다고 영숙님이 알려주었다. 단계를 아이가 바꾸면 그날 나오는
 * 문제가 통째로 달라지고, 부모가 보고 있던 기록도 뜻을 잃는다.
 *
 * 곱셈 문제로 막는 방법도 있었지만 초등 3학년이면 종이에 적어 풀 수 있다.
 * **네 자리 비밀번호**로 막는다.
 *
 * 비밀번호는 **이 기기에만** 둔다(localStorage). 창고에 두려면 자리를 새로 만들어야
 * 하고, 아이 계정마다 따로 두면 세 번 정해야 한다. 기기 하나에 하나면 태블릿을
 * 누가 쓰든 같은 비밀번호로 막힌다.
 *
 * 한 번 풀면 그 창을 닫을 때까지는 다시 묻지 않는다(sessionStorage). 설정을
 * 고치다가 다른 데 갔다 올 때마다 네 자리를 다시 치게 할 이유가 없다.
 */

const PIN_KEY = 'dailyglow.parentPin';
const UNLOCKED_KEY = 'dailyglow.parentUnlocked';

/** 비밀번호는 네 자리 숫자다. */
export const PIN_LENGTH = 4;

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

/** 이 기기에 비밀번호가 정해져 있는가. */
export function hasPin(): boolean {
  try {
    return Boolean(window.localStorage.getItem(PIN_KEY));
  } catch {
    // 브라우저가 저장을 막아 두었을 수 있다. 그때는 잠그지 않는다 —
    // 설정에 아예 못 들어가게 되는 쪽이 더 나쁘다.
    return false;
  }
}

export function setPin(pin: string): boolean {
  if (!isValidPin(pin)) return false;
  try {
    window.localStorage.setItem(PIN_KEY, pin);
    unlock();
    return true;
  } catch {
    return false;
  }
}

export function checkPin(pin: string): boolean {
  try {
    const saved = window.localStorage.getItem(PIN_KEY);
    if (saved && saved === pin) {
      unlock();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** 비밀번호를 지운다. 잊었을 때 다시 정하려면 이것을 부른다. */
export function clearPin(): void {
  try {
    window.localStorage.removeItem(PIN_KEY);
    window.sessionStorage.removeItem(UNLOCKED_KEY);
  } catch {
    // 지우지 못해도 화면은 그대로 돌아간다.
  }
}

function unlock(): void {
  try {
    window.sessionStorage.setItem(UNLOCKED_KEY, '1');
  } catch {
    // 기억해 두지 못하면 설정에 들어갈 때마다 다시 물을 뿐이다.
  }
}

/** 이 창에서 이미 풀었는가. */
export function isUnlocked(): boolean {
  try {
    return window.sessionStorage.getItem(UNLOCKED_KEY) === '1';
  } catch {
    return false;
  }
}
