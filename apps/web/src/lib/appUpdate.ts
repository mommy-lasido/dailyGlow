/**
 * 새로 올린 것을 아이 기기에 들여놓는 일.
 *
 * 이 앱은 홈 화면에 얹어 두고 쓰는 앱(PWA)이라, 화면에 보이는 것은 기기에 저장된
 * 것이다. 새로 올려도 기기는 **다음에 열 때** 새것을 내려받고, 그것이 보이는 것은
 * **그다음에 열 때**다. 그래서 영숙님이 "앱을 두 번 열어야 반영된다" 고 했다.
 *
 * 한 번에 되게 하려면 새것을 받은 그 자리에서 화면을 다시 불러야 한다. 그런데
 * **아무 때나 다시 부르면 안 된다.** 아이가 문제를 풀던 중이면 풀던 것이 날아가고,
 * 영상을 보던 중이면 처음으로 돌아간다.
 *
 * 다시 부르는 때는 둘이다.
 *
 * 1. **앱을 다시 켤 때.** 영숙님은 아이들이 없는 시간에 고쳐 올리므로, 아이가
 *    태블릿을 집어 드는 그때 새것이 이미 기다리고 있다. 잃을 것이 없다.
 * 2. **홈 화면으로 돌아왔을 때.** 활동을 마치고 나온 자리다.
 *
 * 활동 중에 새것이 도착하면 그대로 둔다. 새것은 이미 기기에 받아 두었으므로,
 * 홈으로 나오는 순간 바뀐다.
 */

import { registerSW } from 'virtual:pwa-register';

/** 새것을 받아 두었는가. */
let waiting = false;
/** 다시 부르기는 한 번이면 된다. 두 번 부르면 되풀이가 될 수 있다. */
let reloading = false;

function onHome(): boolean {
  return window.location.pathname === '/';
}

/**
 * 안전한 자리면 받아 둔 새것을 들여놓는다.
 *
 * 화면이 바뀔 때마다 부른다 — 활동에서 홈으로 돌아오는 그 순간이 가장 좋은 때다.
 */
export function applyUpdateIfSafe(justOpened = false): void {
  if (!waiting || reloading) return;
  // 앱을 다시 켠 때는 어느 화면이든 괜찮다 — 방금 집어 든 참이라 풀던 것이 없다.
  if (!justOpened && !onHome()) return;
  reloading = true;
  window.location.reload();
}

export function watchForUpdates(): void {
  try {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        waiting = true;
        applyUpdateIfSafe();
      },
      onRegisteredSW(_url, registration) {
        if (!registration) return;
        // 태블릿은 앱을 며칠씩 닫지 않는다. 한 시간에 한 번 새것이 있는지 물어본다.
        window.setInterval(() => void registration.update(), 60 * 60 * 1000);
      },
    });

    // 홈으로 돌아왔을 때, 그리고 앱을 다시 켰을 때 받아 둔 것을 들여놓는다.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') applyUpdateIfSafe(true);
    });
  } catch {
    // 새것 들여놓기가 안 되더라도 앱은 그대로 돌아간다. 다음에 열면 바뀐다.
  }
}
