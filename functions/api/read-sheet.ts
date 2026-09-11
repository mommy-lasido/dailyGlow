/**
 * 종이에 푼 100칸 계산 사진을 읽어 준다. (Cloudflare Pages Function)
 *
 * **채점은 여기서 하지 않는다.** 이 함수가 하는 일은 사진에서 **아이가 칸마다 무엇을
 * 적었는지 읽어 오는 것**뿐이고, 맞았는지 틀렸는지는 앱이 자기가 아는 정답과
 * 견주어 판단한다. 셈까지 맡기면 AI 가 계산을 틀릴 때 아이가 맞게 쓴 것을 틀렸다고
 * 하게 되는데, 그건 아이에게 가장 나쁜 종류의 잘못이다.
 *
 * 열쇠(ANTHROPIC_API_KEY)는 Cloudflare 화면에서 넣는다. 저장소에는 두지 않는다 —
 * 쓸 때마다 돈이 나가는 열쇠라 밖으로 새면 안 된다.
 * 열쇠가 없으면 `available: false` 만 돌려주고, 앱은 사진 칸을 아예 감춘다.
 *
 * Anthropic 을 부를 때 꾸러미(SDK) 대신 `fetch` 를 바로 쓴다. Cloudflare 의 실행
 * 환경은 Node 가 아니라서 꾸러미가 늘 그대로 도는지 장담할 수 없고, 하는 일이
 * 요청 한 번이라 꾸러미를 쓸 까닭이 없다.
 *
 * 자리(타입)도 직접 적는다. Cloudflare 가 주는 타입 꾸러미를 받으면 이 파일 하나
 * 때문에 설치할 것이 늘어난다. Cloudflare 는 아래 두 이름만 찾으면 된다.
 */

interface Ctx {
  request: Request;
  env: Env;
}

/** 사진 한 장의 크기 한도. 이보다 크면 받지 않는다(대략 6MB). */
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

/**
 * 값싼 쪽을 쓴다. 칸에 적힌 숫자를 읽는 일이라 가장 똑똑한 모델까지는 필요 없다.
 * 아이 글씨를 자꾸 잘못 읽으면 그때 더 좋은 모델로 올린다.
 */
const MODEL = 'claude-sonnet-5';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface Env {
  ANTHROPIC_API_KEY?: string;
}

interface ReadRequest {
  /** 사진. data: 접두어를 뺀 base64 */
  imageBase64: string;
  mediaType: string;
  /** 표의 셈 기호 (＋ － × ÷) */
  op: string;
  colHeaders: number[];
  rowHeaders: number[];
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/** 앱이 사진 칸을 보여줄지 정하려고 먼저 물어본다. 열쇠를 쓰지 않으므로 돈이 안 든다. */
export const onRequestGet = ({ env }: Ctx): Response =>
  json(200, { available: Boolean(env.ANTHROPIC_API_KEY) });

export const onRequestPost = async ({ request, env }: Ctx): Promise<Response> => {
  const key = env.ANTHROPIC_API_KEY;
  if (!key) return json(503, { error: '사진 읽기가 아직 준비되지 않았어요.' });

  let body: ReadRequest;
  try {
    body = (await request.json()) as ReadRequest;
  } catch {
    return json(400, { error: '보낸 내용을 읽을 수 없어요.' });
  }

  const { imageBase64, mediaType, op, colHeaders, rowHeaders } = body ?? {};
  if (!imageBase64 || !ALLOWED_TYPES.includes(mediaType)) {
    return json(400, { error: '사진이 없거나 다룰 수 없는 형식이에요.' });
  }
  if (!Array.isArray(colHeaders) || !Array.isArray(rowHeaders) || !op) {
    return json(400, { error: '표의 모양을 함께 보내주세요.' });
  }
  // base64 는 원본보다 약 4/3 크다.
  if ((imageBase64.length * 3) / 4 > MAX_IMAGE_BYTES) {
    return json(413, { error: '사진이 너무 커요. 조금 작게 찍어주세요.' });
  }

  const rows = rowHeaders.length;
  const cols = colHeaders.length;

  const prompt = [
    `사진에 ${rows}×${cols} 계산표가 있습니다. 아이가 연필로 답을 적어 넣은 것입니다.`,
    '',
    '표의 **맨 윗줄과 맨 왼쪽 줄은 인쇄된 머리줄**이고, 그 안쪽 칸에만 아이가 손으로 썼습니다.',
    `머리줄을 빼고 **안쪽 ${rows}줄 × ${cols}칸**만 읽어 주세요.`,
    '머리줄의 숫자를 답으로 세지 마세요. 이것을 틀리면 칸이 통째로 밀립니다.',
    '',
    '각 칸에 **적혀 있는 그대로** 읽어 주세요.',
    '- 셈을 하지 마세요. 맞았는지도 판단하지 마세요. 보이는 것만 옮겨 적으세요.',
    '- 아무것도 안 쓴 칸은 빈 문자열 "" 로 두세요.',
    '- 지우고 다시 쓴 흔적이 있으면 마지막에 쓴 것을 읽으세요.',
    '- 적혀 있는데 알아볼 수 없으면 "?" 로 두세요. 짐작해서 채우지 마세요.',
    op === '÷'
      ? '- 나눗셈이라 한 칸에 몫과 나머지가 있습니다. "몫,나머지" 로 적어 주세요. (예: "3,2")'
      : '',
    '',
    '**칸이 밀렸는지 확인할 수 있도록, 사진에서 읽은 머리줄도 함께 보내 주세요.**',
    '보낸 것과 다르더라도 고치지 말고 사진에 보이는 그대로 적어 주세요.',
    '',
    'JSON 만 보내 주세요. 다른 말은 붙이지 마세요.',
    '{',
    `  "colHeaders": [맨 윗줄 숫자 ${cols}개],`,
    `  "rowHeaders": [맨 왼쪽 줄 숫자 ${rows}개],`,
    `  "cells": [[…${cols}개…], …${rows}줄…]`,
    '}',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: imageBase64 },
              },
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      // 무엇이 잘못됐는지는 기록에만 남기고, 화면에는 쉬운 말로 알린다.
      console.error('[read-sheet] anthropic', res.status, await res.text());
      return json(502, { error: '사진을 읽는 데 실패했어요. 잠시 뒤에 다시 해볼까요?' });
    }

    const payload = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (payload.content ?? [])
      .map((b) => (b.type === 'text' ? (b.text ?? '') : ''))
      .join('')
      .trim();

    // 모델이 앞뒤에 말을 붙였을 수 있으니 가장 바깥 중괄호만 떼어 읽는다.
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end < 0) return json(502, { error: '사진을 읽지 못했어요.' });

    const parsed = JSON.parse(text.slice(start, end + 1)) as {
      cells?: unknown;
      colHeaders?: unknown;
      rowHeaders?: unknown;
    };
    const cells = parsed.cells;
    if (!Array.isArray(cells) || cells.length !== rows) {
      return json(502, { error: '표를 제대로 알아보지 못했어요. 다시 찍어볼까요?' });
    }

    const clean = cells.map((row) =>
      Array.isArray(row)
        ? Array.from({ length: cols }, (_, i) => String(row[i] ?? '').trim())
        : Array.from({ length: cols }, () => ''),
    );

    const toNumbers = (v: unknown, n: number) =>
      Array.isArray(v) && v.length === n ? v.map((x) => Number(x)) : null;

    // 읽어 온 머리줄을 함께 돌려준다. 칸이 밀렸는지는 앱이 판단한다.
    return json(200, {
      cells: clean,
      colHeaders: toNumbers(parsed.colHeaders, cols),
      rowHeaders: toNumbers(parsed.rowHeaders, rows),
    });
  } catch (e) {
    console.error('[read-sheet]', e);
    return json(502, { error: '사진을 읽는 데 실패했어요. 잠시 뒤에 다시 해볼까요?' });
  }
};
