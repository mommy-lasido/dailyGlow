/**
 * 종이에 푼 100칸 계산 사진을 읽어 준다.
 *
 * **채점은 여기서 하지 않는다.** 이 함수가 하는 일은 사진에서 **아이가 칸마다 무엇을
 * 적었는지 읽어 오는 것**뿐이고, 맞았는지 틀렸는지는 앱이 자기가 아는 정답과
 * 견주어 판단한다. 셈까지 맡기면 AI 가 계산을 틀릴 때 아이가 맞게 쓴 것을 틀렸다고
 * 하게 되는데, 그건 아이에게 가장 나쁜 종류의 잘못이다.
 *
 * 열쇠(ANTHROPIC_API_KEY)는 넷리파이 화면에서 넣는다. 저장소에는 두지 않는다 —
 * 쓸 때마다 돈이 나가는 열쇠라 밖으로 새면 안 된다.
 * 열쇠가 없으면 `available: false` 만 돌려주고, 앱은 사진 칸을 아예 감춘다.
 */

import Anthropic from '@anthropic-ai/sdk';

/** 사진 한 장의 크기 한도. 이보다 크면 받지 않는다(대략 6MB). */
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

/**
 * 값싼 쪽을 쓴다. 칸에 적힌 숫자를 읽는 일이라 가장 똑똑한 모델까지는 필요 없다.
 * 아이 글씨를 자꾸 잘못 읽으면 그때 더 좋은 모델로 올린다.
 */
const MODEL = 'claude-sonnet-5';

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp';

const ALLOWED_TYPES: ImageMediaType[] = ['image/jpeg', 'image/png', 'image/webp'];

interface ReadRequest {
  /** 사진. data: 접두어를 뺀 base64 */
  imageBase64: string;
  mediaType: ImageMediaType;
  /** 표의 셈 기호 (＋ － × ÷) */
  op: string;
  /** 가로 머리줄 */
  colHeaders: number[];
  /** 세로 머리줄 */
  rowHeaders: number[];
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export default async function handler(request: Request): Promise<Response> {
  const key = process.env.ANTHROPIC_API_KEY;

  // 앱이 사진 칸을 보여줄지 정하려고 먼저 물어본다. 열쇠를 쓰지 않으므로 돈이 안 든다.
  if (request.method === 'GET') {
    return json(200, { available: Boolean(key) });
  }

  if (request.method !== 'POST') return json(405, { error: '허용되지 않는 방법이에요.' });
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
    `이 사진은 아이가 연필로 푼 ${rows}×${cols} 계산표입니다.`,
    `맨 윗줄은 ${colHeaders.join(', ')} 이고, 맨 왼쪽 줄은 ${rowHeaders.join(', ')} 입니다.`,
    `이 두 줄은 인쇄된 것이고, 나머지 ${rows * cols}칸에 아이가 손으로 답을 적었습니다.`,
    '',
    '각 칸에 **적혀 있는 그대로** 읽어 주세요.',
    '- 셈을 하지 마세요. 맞았는지 틀렸는지도 판단하지 마세요. 보이는 것만 옮겨 적으세요.',
    '- 빈칸은 빈 문자열 "" 로 두세요.',
    '- 지우고 다시 쓴 흔적이 있으면 마지막에 쓴 것을 읽으세요.',
    '- 무엇이라 썼는지 알아볼 수 없으면 "?" 로 두세요. 짐작해서 채우지 마세요.',
    op === '÷'
      ? '- 나눗셈이라 한 칸에 몫과 나머지가 있습니다. "몫,나머지" 로 적어 주세요. (예: "3,2")'
      : '',
    '',
    `답은 JSON 만 보내 주세요. 다른 말은 붙이지 마세요.`,
    `{"cells": [[…${cols}개…], …${rows}줄…]}`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const anthropic = new Anthropic({ apiKey: key });
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: prompt },
          ],
        },
      ],
    });

    const text = message.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('')
      .trim();

    // 모델이 앞뒤에 말을 붙였을 수 있으니 가장 바깥 중괄호만 떼어 읽는다.
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end < 0) return json(502, { error: '사진을 읽지 못했어요.' });

    const parsed = JSON.parse(text.slice(start, end + 1)) as { cells?: unknown };
    const cells = parsed.cells;
    if (!Array.isArray(cells) || cells.length !== rows) {
      return json(502, { error: '표를 제대로 알아보지 못했어요. 다시 찍어볼까요?' });
    }

    const clean = cells.map((row) =>
      Array.isArray(row)
        ? Array.from({ length: cols }, (_, i) => String(row[i] ?? '').trim())
        : Array.from({ length: cols }, () => ''),
    );

    return json(200, { cells: clean });
  } catch (e) {
    // 무엇이 잘못됐는지는 넷리파이 기록에만 남기고, 아이 화면에는 쉬운 말로 알린다.
    console.error('[read-sheet]', e);
    return json(502, { error: '사진을 읽는 데 실패했어요. 잠시 뒤에 다시 해볼까요?' });
  }
}
