/**
 * 맞춤법 탐험대 자료.
 *
 * 영숙님이 직접 만든 예전 앱(`files_라윤/index.html`)의 문항을 옮겼다.
 * 손으로 다듬은 자료라 새로 만들지 말고 여기를 고쳐 쓸 것.
 *
 * 옮긴 뒤 초등 3학년에게 너무 어려운 네 항목을 뺐다 —
 * 으로서/으로써(자격과 수단의 구분은 중학교에서 배운다), 삭이며/삭히며,
 * 되뇌었어요/되뇌였어요, 예삿일/예사일. 아이가 겪어 보지 못한 말은
 * 뜻을 몰라 찍게 되고, 찍은 것은 1차 점수를 흐려 단계 판단까지 어긋나게 한다.
 *
 * 국립국어원에 초등 맞춤법 낱말쌍 공개 자료가 있는지 찾아봤으나 없었다
 * (`docs/research/2026-09-05-초등-기초어휘-맞춤법-공공자료.md`).
 * 그래서 이 자료가 유일한 원본이다.
 */

export interface SpellingOption {
  /** 빈칸에 들어갈 말 */
  text: string;
  correct: boolean;
  /** 왜 맞고 왜 틀리는지. 3차 힌트와 채점 뒤 설명에 쓴다. */
  note: string;
}

export interface SpellingItem {
  /** 빈칸(___)이 있는 문장들. 한 항목에 여러 개라 낼 때마다 달라진다. */
  templates: string[];
  /** 보기. 대개 둘이고, 셋인 항목이 하나 있다. */
  options: SpellingOption[];
}

export const SPELLING_ITEMS: SpellingItem[] = [
  {
    templates: [
      "오늘은 배가 아파서 학교에 ___ 갔어요.",
      "저는 매운 음식을 ___ 먹어요."
    ],
    options: [
      {
        text: "안",
        correct: true,
        note: "'안'은 '아니'를 줄인 말이에요. 뒤에 움직임을 나타내는 낱말이 바로 와요. (안 가다, 안 먹다)"
      },
      {
        text: "않",
        correct: false,
        note: "'않다'는 '아니하다'가 줄어든 말이에요. 보통 '~지 않다'처럼 앞에 다른 동작이 있을 때 써요."
      }
    ]
  },
  {
    templates: [
      "내일 소풍을 가지 ___습니다.",
      "숙제를 아직 끝내지 ___았어요."
    ],
    options: [
      {
        text: "않",
        correct: true,
        note: "'않다'는 '아니하다'의 준말이에요. '~지 않다' 형태로 자주 써요."
      },
      {
        text: "안",
        correct: false,
        note: "'안'은 동사 바로 앞에 붙는 짧은 부정이에요. '~지 안다'처럼 쓰지 않아요."
      }
    ]
  },
  {
    templates: [
      "오늘따라 ___ 기분이 좋아요.",
      "친구가 화가 나서 ___ 몰랐어요."
    ],
    options: [
      {
        text: "왠지",
        correct: true,
        note: "'왠지'는 '왜인지'가 줄어든 말이에요. 그래서 항상 '왠'으로 써요."
      },
      {
        text: "웬지",
        correct: false,
        note: "'웬지'라는 낱말은 없어요. '왜인지'의 준말은 반드시 '왠지'로 써야 해요."
      }
    ]
  },
  {
    templates: [
      "복도에서 ___ 상자를 봤어요.",
      "이게 ___ 일이니?"
    ],
    options: [
      {
        text: "웬",
        correct: true,
        note: "'어찌 된, 무슨'이라는 뜻일 땐 '웬'을 써요. (웬 상자, 웬일이니?)"
      },
      {
        text: "왠",
        correct: false,
        note: "'왠'은 '왠지'에서만 쓰여요. '무슨'이라는 뜻일 땐 쓰지 않아요."
      }
    ]
  },
  {
    templates: [
      "여름 방학이 ___ 남았어요.",
      "개학까지 ___ 안 남았어요."
    ],
    options: [
      {
        text: "며칠",
        correct: true,
        note: "'몇 일'처럼 보이지만 표준어는 항상 '며칠'로 써요."
      },
      {
        text: "몇일",
        correct: false,
        note: "'몇일'은 표준어가 아니에요. 소리 나는 대로 '며칠'로 써야 해요."
      }
    ]
  },
  {
    templates: [
      "할머니께 옛날 ___를 들었어요.",
      "친구와 재미있는 ___를 나눴어요."
    ],
    options: [
      {
        text: "얘기",
        correct: true,
        note: "'이야기'가 줄어들면 '얘기'가 돼요."
      },
      {
        text: "예기",
        correct: false,
        note: "'예기'라는 낱말은 없어요. '이야기'의 준말은 '얘기'예요."
      }
    ]
  },
  {
    templates: [
      "화장실에 갔다가 ___ 돌아왔어요.",
      "비가 ___ 그쳤어요."
    ],
    options: [
      {
        text: "금세",
        correct: true,
        note: "'금세'는 '금시(今時)에'가 줄어든 말이에요."
      },
      {
        text: "금새",
        correct: false,
        note: "'금새'는 잘못된 표기예요. 발음이 비슷해서 헷갈리기 쉬워요."
      }
    ]
  },
  {
    templates: [
      "제 방 청소를 ___ 끝냈어요.",
      "손을 ___ 씻었어요."
    ],
    options: [
      {
        text: "깨끗이",
        correct: true,
        note: "'깨끗하다'처럼 'ㅅ' 받침으로 끝나는 낱말 뒤에는 대부분 '-이'를 붙여요."
      },
      {
        text: "깨끗히",
        correct: false,
        note: "'-히'는 주로 다른 받침의 낱말에 써요. '깨끗'에는 '-이'가 맞아요."
      }
    ]
  },
  {
    templates: [
      "선생님이 글자를 ___ 주셨어요.",
      "엄마가 숙제하는 법을 ___ 주셨어요."
    ],
    options: [
      {
        text: "가르쳐",
        correct: true,
        note: "지식이나 방법을 알려줄 땐 '가르치다'를 써요."
      },
      {
        text: "가리켜",
        correct: false,
        note: "'가리키다'는 손가락 등으로 방향이나 위치를 알려줄 때 쓰는 말이에요."
      }
    ]
  },
  {
    templates: [
      "저기 있는 산을 손가락으로 ___ 보세요.",
      "시계 바늘이 3시를 ___ 있어요."
    ],
    options: [
      {
        text: "가리켜",
        correct: true,
        note: "방향이나 위치를 알려줄 땐 '가리키다'를 써요."
      },
      {
        text: "가르쳐",
        correct: false,
        note: "'가르치다'는 지식이나 방법을 알려줄 때 쓰는 말이에요."
      }
    ]
  },
  {
    templates: [
      "숙제 다 하고 ___ 같이 놀자!",
      "___ 다시 이야기하자."
    ],
    options: [
      {
        text: "이따가",
        correct: true,
        note: "'조금 뒤에'라는 뜻일 땐 '이따가'를 써요."
      },
      {
        text: "있다가",
        correct: false,
        note: "'있다가'는 '있다'에 '~다가'가 붙은 말로, '한동안 머무르다가'라는 뜻이에요."
      }
    ]
  },
  {
    templates: [
      "이제 집에 가도 ___?",
      "여기 앉아도 ___?"
    ],
    options: [
      {
        text: "돼요",
        correct: true,
        note: "'되어요'가 줄면 '돼요'가 돼요."
      },
      {
        text: "되요",
        correct: false,
        note: "'되요'는 잘못된 표기예요. '되'만으로는 문장을 끝낼 수 없어요."
      }
    ]
  },
  {
    templates: [
      "그렇게 하면 안 ___!",
      "일이 다 ___ 다행이야."
    ],
    options: [
      {
        text: "돼",
        correct: true,
        note: "'되어'가 줄면 '돼'가 돼요. 문장을 끝맺을 땐 '돼'를 써요."
      },
      {
        text: "되",
        correct: false,
        note: "'되'만으로는 문장이 끝나지 않아요. '되어'나 '되다'처럼 뒤에 무언가 더 필요해요."
      }
    ]
  },
  {
    templates: [
      "숙제를 다 ___!",
      "드디어 방학이 ___!"
    ],
    options: [
      {
        text: "됐어요",
        correct: true,
        note: "'되었어요'가 줄면 '됐어요'가 돼요."
      },
      {
        text: "됬어요",
        correct: false,
        note: "'됬어요'는 잘못된 표기예요. '되었'이 줄어든 것이라 '됐'으로 써야 해요."
      }
    ]
  },
  {
    templates: [
      "친구를 ___에 만나서 반가웠어요.",
      "___에 놀이터에 가봤어요."
    ],
    options: [
      {
        text: "오랜만",
        correct: true,
        note: "'오래간만'이 줄어든 말이라서 '오랜만'으로 써요."
      },
      {
        text: "오랫만",
        correct: false,
        note: "'오랫만'은 잘못된 표기예요. 소리가 비슷해서 헷갈리기 쉬워요."
      }
    ]
  },
  {
    templates: [
      "___에 사는 친구랑 놀았어요.",
      "고양이가 ___에서 내려다봤어요."
    ],
    options: [
      {
        text: "위층",
        correct: true,
        note: "뒷말이 거센소리(ㅊ,ㅋ,ㅍ)로 시작하면 사이시옷 없이 '위층'으로 써요."
      },
      {
        text: "윗층",
        correct: false,
        note: "'윗층'은 잘못된 표기예요. 거센소리 앞에서는 사이시옷을 넣지 않아요."
      }
    ]
  },
  {
    templates: [
      "추워서 ___를 하나 더 입었어요.",
      "___ 단추가 떨어졌어요."
    ],
    options: [
      {
        text: "윗도리",
        correct: true,
        note: "위아래가 구분되는 옷은 '윗도리'로 써요."
      },
      {
        text: "웃도리",
        correct: false,
        note: "'웃도리'는 잘못된 표기예요. 위아래 짝이 있는 옷은 '윗-'을 붙여요."
      }
    ]
  },
  {
    templates: [
      "길에서 ___한 돌을 주웠어요.",
      "___한 접시에 과일을 담았어요."
    ],
    options: [
      {
        text: "넓적",
        correct: true,
        note: "받침 'ㄼ'을 살려서 '넓적하다'로 써요."
      },
      {
        text: "넙적",
        correct: false,
        note: "'넙적'은 잘못된 표기예요. '넓다'에서 온 말이라 받침 'ㄼ'을 살려요."
      }
    ]
  },
  {
    templates: [
      "___는 넘어져도 다시 일어나요.",
      "동생 방에 ___ 인형이 있어요."
    ],
    options: [
      {
        text: "오뚝이",
        correct: true,
        note: "'오뚝'에 '-이'가 붙은 말이라서 '오뚝이'로 써요."
      },
      {
        text: "오뚜기",
        correct: false,
        note: "'오뚜기'는 잘못된 표기예요. 소리 나는 대로 쓰면 안 돼요."
      }
    ]
  },
  {
    templates: [
      "감기가 다 ___.",
      "상처가 깨끗이 ___."
    ],
    options: [
      {
        text: "나았어요",
        correct: true,
        note: "병이나 상처가 좋아질 땐 '낫다'를 써요."
      },
      {
        text: "낳았어요",
        correct: false,
        note: "'낳다'는 아기나 새끼를 얻을 때 쓰는 전혀 다른 뜻의 말이에요."
      }
    ]
  },
  {
    templates: [
      "토끼가 아기를 ___.",
      "우리 강아지가 새끼를 다섯 마리 ___."
    ],
    options: [
      {
        text: "낳았어요",
        correct: true,
        note: "동물이나 사람이 아기를 얻는 건 '낳다'예요."
      },
      {
        text: "나았어요",
        correct: false,
        note: "'낫다'는 병이 좋아졌다는 뜻이에요. 아기를 얻는다는 뜻은 아니에요."
      }
    ]
  },
  {
    templates: [
      "이 문제 정답을 ___ 보세요.",
      "수수께끼 정답을 ___ 봐요."
    ],
    options: [
      {
        text: "맞혀",
        correct: true,
        note: "정답을 골라 알아낼 땐 '맞히다'를 써요."
      },
      {
        text: "맞춰",
        correct: false,
        note: "'맞추다'는 두 물건을 나란히 놓거나 비교할 때 쓰는 말이에요."
      }
    ]
  },
  {
    templates: [
      "친구랑 나는 좋아하는 색이 ___.",
      "우리 둘은 생각이 ___."
    ],
    options: [
      {
        text: "다르다",
        correct: true,
        note: "'다르다'는 서로 같지 않다는 뜻이에요."
      },
      {
        text: "틀리다",
        correct: false,
        note: "'틀리다'는 답이나 계산이 잘못됐다는 뜻이에요. '같지 않다'는 뜻이 아니에요."
      }
    ]
  },
  {
    templates: [
      "약속은 ___ 지켜야 해요.",
      "___ 손을 씻고 밥을 먹어요."
    ],
    options: [
      {
        text: "반드시",
        correct: true,
        note: "'꼭, 틀림없이'라는 뜻일 땐 '반드시'를 써요."
      },
      {
        text: "반듯이",
        correct: false,
        note: "'반듯이'는 반듯한 모양을 말할 때 쓰는 말이에요. (반듯이 앉다)"
      }
    ]
  },
  {
    templates: [
      "밥을 먹은 뒤에 ___를 도와드렸어요.",
      "저녁마다 ___를 해요."
    ],
    options: [
      {
        text: "설거지",
        correct: true,
        note: "예전 말 '설겆다'는 이제 쓰지 않아요. 지금은 '설거지'로만 써요."
      },
      {
        text: "설겆이",
        correct: false,
        note: "'설겆이'는 옛말에서 온 잘못된 표기예요."
      }
    ]
  },
  {
    templates: [
      "편지 봉투에 우표를 ___.",
      "벽에 그림을 ___."
    ],
    options: [
      {
        text: "붙였어요",
        correct: true,
        note: "풀이나 테이프로 딱 붙일 땐 '붙이다'를 써요."
      },
      {
        text: "부쳤어요",
        correct: false,
        note: "'부치다'는 편지나 소포를 보낼 때 쓰는 말이에요."
      }
    ]
  },
  {
    templates: [
      "이 편지를 할머니께 ___.",
      "소포를 우체국에서 ___."
    ],
    options: [
      {
        text: "부쳤어요",
        correct: true,
        note: "편지나 소포를 보낼 때는 '부치다'를 써요."
      },
      {
        text: "붙였어요",
        correct: false,
        note: "'붙이다'는 무언가를 딱 붙일 때 쓰는 말이에요. 보낸다는 뜻은 없어요."
      }
    ]
  },
  {
    templates: [
      "고구마를 간장에 ___.",
      "멸치를 간장에 ___."
    ],
    options: [
      {
        text: "조렸어요",
        correct: true,
        note: "국물 있는 음식을 바짝 익힐 땐 '조리다'를 써요."
      },
      {
        text: "졸였어요",
        correct: false,
        note: "'졸이다'는 마음을 태울 때 쓰는 말이에요. (마음을 졸이다)"
      }
    ]
  },
  {
    templates: [
      "불길이 ___을 수 없이 번졌어요.",
      "소문이 ___을 수 없이 퍼졌어요."
    ],
    options: [
      {
        text: "걷잡",
        correct: true,
        note: "상태를 붙잡아 진정시킬 수 없다는 뜻일 땐 '걷잡다'를 써요."
      },
      {
        text: "겉잡",
        correct: false,
        note: "'겉잡다'는 겉으로 대충 짐작한다는 뜻의 다른 말이에요."
      }
    ]
  },
  {
    templates: [
      "자전거가 벽에 세게 ___.",
      "머리를 문에 세게 ___."
    ],
    options: [
      {
        text: "부딪쳤어요",
        correct: true,
        note: "스스로 세게 부딪는 건 '부딪치다'를 써요."
      },
      {
        text: "부딪혔어요",
        correct: false,
        note: "'부딪히다'는 다른 것에 의해 부딪음을 당했을 때 쓰는 말이에요."
      }
    ]
  },
  {
    templates: [
      "저는 뒤에서 오던 친구에게 ___.",
      "제 어깨가 지나가던 사람에게 ___."
    ],
    options: [
      {
        text: "부딪혔어요",
        correct: true,
        note: "내가 무언가에 의해 부딪음을 당했을 땐 '부딪히다'를 써요."
      },
      {
        text: "부딪쳤어요",
        correct: false,
        note: "'부딪치다'는 내가 스스로 세게 부딪을 때 쓰는 말이에요."
      }
    ]
  },
  {
    templates: [
      "입맛을 ___ 음식을 먹었어요.",
      "호기심을 ___ 이야기였어요."
    ],
    options: [
      {
        text: "돋우는",
        correct: true,
        note: "입맛이나 기분, 흥미를 높일 땐 '돋우다'를 써요."
      },
      {
        text: "돋구는",
        correct: false,
        note: "'돋구다'는 안경 도수를 높일 때만 예외적으로 쓰는 말이에요."
      }
    ]
  },
  {
    templates: [
      "목청을 ___ 큰 소리로 노래했어요.",
      "화단의 흙을 ___ 꽃을 심었어요."
    ],
    options: [
      {
        text: "돋궈서",
        correct: true,
        note: "안경 도수를 높일 때는 예외적으로 '돋구다'를 써요."
      },
      {
        text: "돋워서",
        correct: false,
        note: "'돋우다'는 입맛이나 기분을 높일 때 써요. 안경 도수에는 '돋구다'를 써요."
      }
    ]
  },
  {
    templates: [
      "놀라서 입을 크게 ___.",
      "팔을 양옆으로 ___."
    ],
    options: [
      {
        text: "벌렸어요",
        correct: true,
        note: "공간이나 간격을 넓힐 땐 '벌리다'를 써요."
      },
      {
        text: "벌였어요",
        correct: false,
        note: "'벌이다'는 일이나 행사를 시작할 때 쓰는 말이에요."
      }
    ]
  },
  {
    templates: [
      "동네에서 잔치를 ___.",
      "학교에서 큰 행사를 ___."
    ],
    options: [
      {
        text: "벌였어요",
        correct: true,
        note: "일이나 행사를 시작할 땐 '벌이다'를 써요."
      },
      {
        text: "벌렸어요",
        correct: false,
        note: "'벌리다'는 공간이나 간격을 넓힐 때 쓰는 말이에요."
      }
    ]
  },
  {
    templates: [
      "사과 한 개를 ___ 먹었어요.",
      "빵을 ___ 삼켰어요."
    ],
    options: [
      {
        text: "통째로",
        correct: true,
        note: "나누지 않은 덩어리 그대로라는 뜻은 '통째로'가 바른 표기예요."
      },
      {
        text: "통채로",
        correct: false,
        note: "'통채로'는 잘못된 표기예요. '통째'가 표준어예요."
      }
    ]
  },
  {
    templates: [
      "저는 오늘 ___ 일어났어요.",
      "___부터 서둘러 준비했어요."
    ],
    options: [
      {
        text: "일찍이",
        correct: true,
        note: "부사 '일찍'에 '-이'를 붙여 '일찍이'로 써요."
      },
      {
        text: "일찍히",
        correct: false,
        note: "'일찍히'는 잘못된 표기예요. '일찍'에는 '-이'를 붙여요."
      }
    ]
  },
  {
    templates: [
      "복도에서는 뛰지 않도록 ___ 해요.",
      "교실에서는 큰 소리를 ___ 해요."
    ],
    options: [
      {
        text: "삼가야",
        correct: true,
        note: "'삼가다' 자체가 동사라서 '삼가야'로 써요."
      },
      {
        text: "삼가해야",
        correct: false,
        note: "'삼가해야'는 잘못된 표기예요. '삼가다'에 '-해야'를 더 붙이지 않아요."
      }
    ]
  },
  {
    templates: [
      "엄마가 카드로 물건값을 ___했어요.",
      "편의점에서 ___하고 영수증을 받았어요."
    ],
    options: [
      {
        text: "결제",
        correct: true,
        note: "물건값을 내는 것은 '결제'예요. 돈을 내서 값을 치른다는 뜻이에요."
      },
      {
        text: "결재",
        correct: false,
        note: "'결재'는 윗사람이 서류를 보고 허락해 주는 것이라 물건값을 낼 때는 쓰지 않아요."
      }
    ]
  },
  {
    templates: [
      "저는 커서 상상력을 ___하고 싶어요.",
      "꾸준한 연습으로 재능을 ___해요."
    ],
    options: [
      {
        text: "계발",
        correct: true,
        note: "재능이나 능력을 키우는 건 '계발'이에요."
      },
      {
        text: "개발",
        correct: false,
        note: "'개발'은 새로운 것을 만들거나 발전시킬 때 쓰는 말이에요. (신제품 개발)"
      }
    ]
  },
  {
    templates: [
      "생선을 소금에 ___.",
      "오이를 식초에 ___."
    ],
    options: [
      {
        text: "절였어요",
        correct: true,
        note: "소금이나 설탕, 식초에 담가 두는 건 '절이다'예요."
      },
      {
        text: "저렸어요",
        correct: false,
        note: "'저리다'는 손발이 저릴 때 쓰는 말이에요."
      }
    ]
  },
  {
    templates: [
      "밤을 ___ 시험공부를 했어요.",
      "친구가 아파서 밤을 ___ 간호했어요."
    ],
    options: [
      {
        text: "새워서",
        correct: true,
        note: "잠을 안 자고 밤을 보낼 땐 '새우다'를 써요."
      },
      {
        text: "세워서",
        correct: false,
        note: "'세우다'는 물건을 똑바로 세울 때 쓰는 말이에요."
      }
    ]
  },
  {
    templates: [
      "이 사탕 ___가 참 예뻐요.",
      "바나나 ___를 벗겼어요."
    ],
    options: [
      {
        text: "껍질",
        correct: true,
        note: "얇고 부드러운 겉면은 '껍질'이에요. (바나나 껍질, 사과 껍질)"
      },
      {
        text: "껍데기",
        correct: false,
        note: "'껍데기'는 단단하고 딱딱한 겉면을 말해요. (달걀 껍데기, 조개 껍데기)"
      }
    ]
  },
  {
    templates: [
      "고무줄을 쭉 ___.",
      "엿가락을 길게 ___."
    ],
    options: [
      {
        text: "늘였어요",
        correct: true,
        note: "길이를 길게 늘어뜨릴 땐 '늘이다'를 써요."
      },
      {
        text: "늘렸어요",
        correct: false,
        note: "'늘리다'는 크기나 수, 양을 크게 할 때 쓰는 말이에요."
      }
    ]
  },
  {
    templates: [
      "우리 반 학생 수를 ___ 싶어요.",
      "용돈을 조금 더 ___ 싶어요."
    ],
    options: [
      {
        text: "늘리고",
        correct: true,
        note: "수나 양을 많게 할 땐 '늘리다'를 써요."
      },
      {
        text: "늘이고",
        correct: false,
        note: "'늘이다'는 길이를 길게 늘어뜨릴 때 쓰는 말이에요."
      }
    ]
  },
  {
    templates: [
      "간판이 떨어질까 봐 ___ 지나갔어요.",
      "___ 유리컵을 옮겼어요."
    ],
    options: [
      {
        text: "조심스레",
        correct: true,
        note: "'-스레'는 '-스럽게'가 줄어든 말이에요. 표준어는 '조심스레'예요."
      },
      {
        text: "조심스래",
        correct: false,
        note: "'조심스래'는 잘못된 표기예요."
      }
    ]
  },
  {
    templates: [
      "쌀을 씻어서 밥솥에 ___.",
      "찌개 재료를 냄비에 ___."
    ],
    options: [
      {
        text: "안쳤어요",
        correct: true,
        note: "음식 재료를 솥이나 냄비에 넣을 땐 '안치다'를 써요."
      },
      {
        text: "앉혔어요",
        correct: false,
        note: "'앉히다'는 사람을 자리에 앉게 할 때 쓰는 말이에요."
      }
    ]
  },
  {
    templates: [
      "동생을 의자에 얌전히 ___.",
      "아이를 무릎 위에 ___."
    ],
    options: [
      {
        text: "앉혔어요",
        correct: true,
        note: "사람을 자리에 앉게 할 땐 '앉히다'를 써요."
      },
      {
        text: "안쳤어요",
        correct: false,
        note: "'안치다'는 음식 재료를 솥에 넣을 때 쓰는 말이에요."
      }
    ]
  },
  {
    templates: [
      "김장을 하려고 배추를 소금물에 ___.",
      "매실을 설탕에 ___."
    ],
    options: [
      {
        text: "담갔어요",
        correct: true,
        note: "기본형이 '담그다'라서 '담갔어요'로 써요."
      },
      {
        text: "담궜어요",
        correct: false,
        note: "'담구다'는 잘못된 표기예요. 기본형은 '담그다'예요."
      }
    ]
  },
  {
    templates: [
      "___ 걸어가고 싶어요.",
      "날씨가 ___ 좋으면 소풍을 가요."
    ],
    options: [
      {
        text: "웬만하면",
        correct: true,
        note: "기본형이 '웬만하다'라서 '웬만하면'으로 써요."
      },
      {
        text: "왠만하면",
        correct: false,
        note: "'왠만하면'은 잘못된 표기예요. '왠'은 '왠지'에서만 써요."
      }
    ]
  },
  {
    templates: [
      "친구가 장난을 쳐서 ___을 찌푸렸어요.",
      "동생이 ___을 찌푸리며 울었어요."
    ],
    options: [
      {
        text: "눈살",
        correct: true,
        note: "된소리로 나더라도 표준 표기는 '눈살'이에요."
      },
      {
        text: "눈쌀",
        correct: false,
        note: "'눈쌀'은 소리 나는 대로 잘못 쓴 표기예요."
      }
    ]
  },
  {
    templates: [
      "이 모양은 정말 ___.",
      "날씨가 ___ 따뜻해요."
    ],
    options: [
      {
        text: "희한해요",
        correct: true,
        note: "'희한(稀罕)하다'가 바른 표기예요."
      },
      {
        text: "희안해요",
        correct: false,
        note: "'희안하다'는 잘못된 표기예요."
      }
    ]
  },
  {
    templates: [
      "떡볶이가 정말 ___.",
      "엄마가 해주신 김치찌개가 ___."
    ],
    options: [
      {
        text: "맛있어요",
        correct: true,
        note: "'맛'과 '있다'가 합쳐진 말이라서 받침은 항상 'ㅅ'이에요."
      },
      {
        text: "맜있어요",
        correct: false,
        note: "'맜있어요'는 잘못된 표기예요. 발음이 [마싣따]처럼 들려도 받침은 'ㅅ'이에요."
      }
    ]
  },
  {
    templates: [
      "이 약은 너무 ___.",
      "냄새가 이상해서 ___."
    ],
    options: [
      {
        text: "맛없어요",
        correct: true,
        note: "'맛'과 '없다'가 합쳐진 말이라서 받침은 항상 'ㅅ'이에요."
      },
      {
        text: "맜없어요",
        correct: false,
        note: "'맜없어요'는 잘못된 표기예요. '맛'의 받침은 언제나 'ㅅ'이에요."
      }
    ]
  },
  {
    templates: [
      "가방 안에 필통이 ___.",
      "냉장고에 우유가 ___."
    ],
    options: [
      {
        text: "있어요",
        correct: true,
        note: "무언가 존재한다는 뜻일 땐 '있다'를 써요."
      },
      {
        text: "잇어요",
        correct: false,
        note: "'잇다'는 두 개를 서로 연결한다는 뜻의 전혀 다른 말이에요. (끈을 잇다)"
      }
    ]
  },
  {
    templates: [
      "이 책은 정말 ___.",
      "오늘 수업이 아주 ___."
    ],
    options: [
      {
        text: "재미있어요",
        correct: true,
        note: "'재미'와 '있다'가 합쳐진 말이라서 받침은 'ㅅ'이에요."
      },
      {
        text: "재미잇어요",
        correct: false,
        note: "'재미잇어요'는 잘못된 표기예요. '있다'의 받침은 언제나 'ㅅ'이에요."
      }
    ]
  },
  {
    templates: [
      "짝꿍이랑 새로 ___.",
      "친구를 새로 ___ 되었어요."
    ],
    options: [
      {
        text: "사귀었어요",
        correct: true,
        note: "기본형이 '사귀다'라서 '사귀었어요'로 써요."
      },
      {
        text: "사겼어요",
        correct: false,
        note: "'사기다'라는 말은 없어요. 기본형은 '사귀다'예요."
      }
    ]
  },
  {
    templates: [
      "합격하기를 ___.",
      "우리 팀이 이기기를 ___."
    ],
    options: [
      {
        text: "바라요",
        correct: true,
        note: "소원이나 희망을 말할 땐 '바라다'를 써요."
      },
      {
        text: "바래요",
        correct: false,
        note: "'바래다'는 색이 흐려진다는 뜻의 다른 말이에요."
      }
    ]
  },
  {
    templates: [
      "오래된 옷의 색이 ___.",
      "사진이 누렇게 ___."
    ],
    options: [
      {
        text: "바랬어요",
        correct: true,
        note: "색이 흐려질 땐 '바래다'를 써요."
      },
      {
        text: "바랐어요",
        correct: false,
        note: "'바라다'는 소원한다는 뜻이에요. 색이 흐려진다는 뜻이 아니에요."
      }
    ]
  },
  {
    templates: [
      "가스가 조금씩 ___.",
      "지붕에서 빗물이 ___."
    ],
    options: [
      {
        text: "새요",
        correct: true,
        note: "기체나 액체가 빠져나갈 땐 '새다'를 써요."
      },
      {
        text: "세요",
        correct: false,
        note: "'세다'는 힘이 강하거나 수를 헤아릴 때 쓰는 말이에요."
      }
    ]
  },
  {
    templates: [
      "아침에 일어나면 ___이 껴요.",
      "___을 떼고 세수했어요."
    ],
    options: [
      {
        text: "눈곱",
        correct: true,
        note: "표준 표기는 '눈곱'이에요."
      },
      {
        text: "눈꼽",
        correct: false,
        note: "'눈꼽'은 소리 나는 대로 잘못 쓴 표기예요."
      }
    ]
  },
  {
    templates: [
      "물을 ___ 넣어야 해요?",
      "설탕을 ___ 넣을까요?"
    ],
    options: [
      {
        text: "얼마큼",
        correct: true,
        note: "표준 표기는 '얼마큼'이에요."
      },
      {
        text: "얼만큼",
        correct: false,
        note: "'얼만큼'은 잘못된 표기예요."
      }
    ]
  },
  {
    templates: [
      "___ 우리 팀이 이겼어요.",
      "___ 숙제는 끝냈어요."
    ],
    options: [
      {
        text: "어쨌든",
        correct: true,
        note: "'어찌하였든'이 줄어든 말이라서 '어쨌든'으로 써요."
      },
      {
        text: "어쨋든",
        correct: false,
        note: "'어쨋든'은 잘못된 표기예요."
      }
    ]
  },
  {
    templates: [
      "이게 ___이니?",
      "오늘은 ___로 일찍 왔네."
    ],
    options: [
      {
        text: "웬일",
        correct: true,
        note: "'어찌 된 일'이라는 뜻일 땐 '웬일'을 써요."
      },
      {
        text: "왠일",
        correct: false,
        note: "'왠'은 '왠지'에서만 쓰여요. '웬일'에는 '웬'을 써요."
      }
    ]
  },
  {
    templates: [
      "___ 기다렸어요.",
      "___ 연습해서 잘하게 됐어요."
    ],
    options: [
      {
        text: "오랫동안",
        correct: true,
        note: "'오래'와 '동안'이 합쳐지며 사이시옷이 들어가 '오랫동안'으로 써요."
      },
      {
        text: "오랜동안",
        correct: false,
        note: "'오랜동안'은 잘못된 표기예요."
      }
    ]
  },
  {
    templates: [
      "정말 ___는 실수였어요.",
      "너무 ___서 웃음만 나왔어요."
    ],
    options: [
      {
        text: "어이없는",
        correct: true,
        note: "'어이'는 '어처구니'와 비슷한 말이에요. '어이없다'가 표준 표기예요."
      },
      {
        text: "어의없는",
        correct: false,
        note: "'어의없다'는 잘못된 표기예요. '어의'는 옛날 궁궐 의사를 뜻하는 다른 낱말이에요."
      }
    ]
  },
  {
    templates: [
      "___를 분리수거 했어요.",
      "길에 ___를 버리면 안 돼요."
    ],
    options: [
      {
        text: "쓰레기",
        correct: true,
        note: "표준 표기는 '쓰레기'예요."
      },
      {
        text: "쓰래기",
        correct: false,
        note: "소리 나는 대로 쓰면 안 돼요. '쓰래기'는 잘못된 표기예요."
      }
    ]
  },
  {
    templates: [
      "그런 ___ 짓을 하면 안 돼요.",
      "___ 병에 걸려 고생했어요."
    ],
    options: [
      {
        text: "몹쓸",
        correct: true,
        note: "'몹시 쓸모없다'는 뜻에서 온 '몹쓸'이 표준 표기예요."
      },
      {
        text: "못쓸",
        correct: false,
        note: "'못쓸'은 잘못된 표기예요."
      }
    ]
  },
  {
    templates: [
      "짜장면 ___를 시켰어요.",
      "라면 ___를 먹었어요."
    ],
    options: [
      {
        text: "곱빼기",
        correct: true,
        note: "표준 표기는 '곱빼기'예요."
      },
      {
        text: "곱배기",
        correct: false,
        note: "'곱배기'는 잘못된 표기예요."
      }
    ]
  },
  {
    templates: [
      "___ 오세요!",
      "숙제를 ___ 끝냈어요."
    ],
    options: [
      {
        text: "얼른",
        correct: true,
        note: "표준어는 '얼른'이에요."
      },
      {
        text: "얼렁",
        correct: false,
        note: "'얼렁'은 표준어가 아니에요."
      }
    ]
  },
  {
    templates: [
      "연필 끝이 ___해요.",
      "산봉우리가 ___하게 솟아 있어요."
    ],
    options: [
      {
        text: "뾰족",
        correct: true,
        note: "표준 표기는 '뾰족하다'예요."
      },
      {
        text: "뾰죽",
        correct: false,
        note: "'뾰죽'은 잘못된 표기예요."
      }
    ]
  },
  {
    templates: [
      "잘못을 ___ 넘어가려 했어요.",
      "실수를 ___ 숨기려 했어요."
    ],
    options: [
      {
        text: "어물쩍",
        correct: true,
        note: "표준 표기는 '어물쩍'이에요."
      },
      {
        text: "어물적",
        correct: false,
        note: "'어물적'은 잘못된 표기예요."
      }
    ]
  },
  {
    templates: [
      "발목이 ___했어요.",
      "계단에서 발을 ___ 삐었어요."
    ],
    options: [
      {
        text: "삐끗",
        correct: true,
        note: "표준 표기는 '삐끗'이에요."
      },
      {
        text: "삐긋",
        correct: false,
        note: "'삐긋'은 잘못된 표기예요."
      }
    ]
  },
  {
    templates: [
      "___께 인사를 잘해요.",
      "동네 ___을 만나면 먼저 인사해요."
    ],
    options: [
      {
        text: "웃어른",
        correct: true,
        note: "위아래 짝이 없는 낱말은 '웃-'을 붙여요. '웃어른'이 표준 표기예요."
      },
      {
        text: "윗어른",
        correct: false,
        note: "'어른'은 위아래로 짝이 없어서 '웃-'을 써요."
      }
    ]
  },
  {
    templates: [
      "___이 맑아야 아랫물도 맑아요.",
      "___부터 깨끗해야 해요."
    ],
    options: [
      {
        text: "윗물",
        correct: true,
        note: "위아래 짝이 있는 낱말은 '윗-'을 붙여요."
      },
      {
        text: "웃물",
        correct: false,
        note: "'웃물'은 잘못된 표기예요. 짝이 있는 낱말은 '윗-'을 써요."
      }
    ]
  },
  {
    templates: [
      "시험 결과를 기다리며 ___.",
      "내 차례를 기다리며 ___."
    ],
    options: [
      {
        text: "안절부절못했어요",
        correct: true,
        note: "'안절부절못하다'가 표준 표기예요. '못'을 빼면 안 돼요."
      },
      {
        text: "안절부절했어요",
        correct: false,
        note: "'못'이 빠지면 잘못된 표현이 돼요."
      }
    ]
  },
  {
    templates: [
      "___ 넘어질 뻔했어요.",
      "___ 버스를 놓칠 뻔했어요."
    ],
    options: [
      {
        text: "하마터면",
        correct: true,
        note: "표준 표기는 '하마터면'이에요."
      },
      {
        text: "하마트면",
        correct: false,
        note: "'하마트면'은 잘못된 표기예요."
      }
    ]
  },
  {
    templates: [
      "이번 학기 ___ 가장 재미있었던 날이에요.",
      "우리 반 ___ 가장 키가 커요."
    ],
    options: [
      {
        text: "통틀어",
        correct: true,
        note: "'통트다'에서 온 말이라 '통틀어'로 써요."
      },
      {
        text: "통털어",
        correct: false,
        note: "'통털어'는 잘못된 표기예요."
      }
    ]
  },
  {
    templates: [
      "여기서 한 발짝 더 가면 ___예요.",
      "산길이 ___로 이어져 있어요."
    ],
    options: [
      {
        text: "낭떠러지",
        correct: true,
        note: "표준 표기는 '낭떠러지'예요."
      },
      {
        text: "낭떨어지",
        correct: false,
        note: "'낭떨어지'는 잘못된 표기예요."
      }
    ]
  },
  {
    templates: [
      "길을 잃어 한참 ___.",
      "산속에서 길을 못 찾아 ___."
    ],
    options: [
      {
        text: "헤맸어요",
        correct: true,
        note: "기본형이 '헤매다'라서 '헤맸어요'로 써요."
      },
      {
        text: "헤멨어요",
        correct: false,
        note: "'헤메다'는 잘못된 표기예요. 기본형은 '헤매다'예요."
      }
    ]
  },
  {
    templates: [
      "다음에 또 ___.",
      "선생님을 곧 ___."
    ],
    options: [
      {
        text: "봬요",
        correct: true,
        note: "'뵈어요'가 줄면 '봬요'가 돼요."
      },
      {
        text: "뵈요",
        correct: false,
        note: "'뵈요'는 잘못된 표기예요. '뵈'만으로는 문장이 끝나지 않아요."
      }
    ]
  },
  {
    templates: [
      "풍선이 ___했어요.",
      "화산이 갑자기 ___했어요."
    ],
    options: [
      {
        text: "폭발",
        correct: true,
        note: "표준 표기는 '폭발'이에요."
      },
      {
        text: "폭팔",
        correct: false,
        note: "'폭팔'은 잘못된 표기예요."
      }
    ]
  },
  {
    templates: [
      "매콤한 ___을 먹었어요.",
      "점심으로 ___을 시켰어요."
    ],
    options: [
      {
        text: "육개장",
        correct: true,
        note: "소고기로 만든 '개장국'에서 온 말이라 '육개장'이 표준 표기예요."
      },
      {
        text: "육계장",
        correct: false,
        note: "닭(계)이 아니라 소고기로 만든 음식이라 '육계장'은 잘못된 표기예요."
      }
    ]
  },
  {
    templates: [
      "___가 정말 매워요.",
      "간식으로 ___를 만들었어요."
    ],
    options: [
      {
        text: "떡볶이",
        correct: true,
        note: "표준 표기는 '떡볶이'예요."
      },
      {
        text: "떡뽂이",
        correct: false,
        note: "'떡뽂이'는 잘못된 표기예요."
      }
    ]
  },
  {
    templates: [
      "저녁으로 ___를 먹었어요.",
      "엄마가 ___를 끓여주셨어요."
    ],
    options: [
      {
        text: "김치찌개",
        correct: true,
        note: "'찌개'가 표준 표기예요."
      },
      {
        text: "김치찌게",
        correct: false,
        note: "'찌게'는 잘못된 표기예요."
      }
    ]
  },
  {
    templates: [
      "___, 이리 와봐!",
      "___ 모두 여기 모여봐."
    ],
    options: [
      {
        text: "얘들아",
        correct: true,
        note: "'이 아이들아'가 줄어든 말이라서 '얘들아'로 써요."
      },
      {
        text: "애들아",
        correct: false,
        note: "'애들아'는 잘못된 표기예요. 줄임말은 '얘들아'예요."
      }
    ]
  },
  {
    templates: [
      "___ 우리는 최선을 다했어요.",
      "___ 결과는 나쁘지 않았어요."
    ],
    options: [
      {
        text: "아무튼",
        correct: true,
        note: "표준 표기는 '아무튼'이에요."
      },
      {
        text: "아뭏든",
        correct: false,
        note: "'아뭏든'은 잘못된 표기예요."
      }
    ]
  },
  {
    templates: [
      "빈칸에 ___ 말을 쓰세요.",
      "상황에 ___ 답을 고르세요."
    ],
    options: [
      {
        text: "알맞은",
        correct: true,
        note: "'알맞다'는 형용사라서 '알맞은'으로 써요."
      },
      {
        text: "알맞는",
        correct: false,
        note: "형용사에는 '-는'이 아니라 '-은'을 붙여요."
      }
    ]
  },
  {
    templates: [
      "상황에 ___ 행동을 했어요.",
      "분위기에 ___ 옷을 입었어요."
    ],
    options: [
      {
        text: "걸맞은",
        correct: true,
        note: "'걸맞다'도 형용사라서 '걸맞은'으로 써요."
      },
      {
        text: "걸맞는",
        correct: false,
        note: "형용사에는 '-는'이 아니라 '-은'을 붙여요."
      }
    ]
  },
  {
    templates: [
      "길에서 ___ 친구를 만났어요.",
      "___ 좋은 기회를 얻었어요."
    ],
    options: [
      {
        text: "우연히",
        correct: true,
        note: "'-히'로 끝나는 부사예요. '우연히'가 표준 표기예요."
      },
      {
        text: "우연이",
        correct: false,
        note: "'우연이'는 잘못된 표기예요."
      }
    ]
  },
  {
    templates: [
      "봄이 되니 ___가 피어올라요.",
      "여름날 도로 위에 ___가 보여요."
    ],
    options: [
      {
        text: "아지랑이",
        correct: true,
        note: "표준 표기는 '아지랑이'예요."
      },
      {
        text: "아지랭이",
        correct: false,
        note: "'아지랭이'는 잘못된 표기예요."
      }
    ]
  },
  {
    templates: [
      "오늘 도서관에 ___.",
      "우리 가족은 워터파크에 ___."
    ],
    options: [
      {
        text: "갔다",
        correct: true,
        note: "'가다'의 과거형은 '갔다'예요. (도서관에 갔다, 학교에 갔다)"
      },
      {
        text: "갰다",
        correct: false,
        note: "'갰다'는 '개다'의 과거형이에요. 흐렸던 날씨가 맑아졌다는 뜻이라 전혀 다른 낱말이에요. (예: 날씨가 갰다)"
      }
    ]
  },
  {
    templates: [
      "어제 친구네 집에 놀러 ___.",
      "병원에 ___."
    ],
    options: [
      {
        text: "갔다",
        correct: true,
        note: "'가다'의 과거형은 '갔다'예요. 'ㅏ'와 'ㅐ'를 헷갈리지 않도록 조심해요."
      },
      {
        text: "갰다",
        correct: false,
        note: "'갰다'로 쓰면 안 돼요. '갔다'와 '갰다'는 완전히 다른 낱말이에요."
      }
    ]
  },
  {
    templates: [
      "콘서트에 ___.",
      "롯데월드에 ___."
    ],
    options: [
      {
        text: "갔다",
        correct: true,
        note: "어딘가로 이동했다는 뜻일 땐 항상 '갔다'로 써요."
      },
      {
        text: "갰다",
        correct: false,
        note: "'갰다'는 날씨가 맑아졌을 때 쓰는 말이에요. 장소를 이동한 것과는 관계없어요."
      }
    ]
  },
  {
    templates: [
      "언니랑 같이 옷을 ___.",
      "무서운 장면을 ___."
    ],
    options: [
      {
        text: "봤다",
        correct: true,
        note: "'보다'의 과거형은 '봤다'예요. ('보았다'가 줄어든 말이에요.)"
      },
      {
        text: "뵸다",
        correct: false,
        note: "'뵸다'는 잘못된 표기예요. '보다'가 줄어들 땐 '봤다'로만 써요."
      }
    ]
  },
  {
    templates: [
      "잠잘 때 ___를 베고 자요.",
      "___로 폭신폭신한 방석을 만들었어요."
    ],
    options: [
      {
        text: "베개",
        correct: true,
        note: "머리를 받치는 물건은 '베개'예요."
      },
      {
        text: "베게",
        correct: false,
        note: "'베게'는 잘못된 표기예요. 정확한 표기는 '베개'예요."
      },
      {
        text: "배게",
        correct: false,
        note: "'배게'도 잘못된 표기예요. 소리 나는 대로 쓰지 말고 '베개'로 기억해요."
      }
    ]
  },
  {
    templates: [
      "친구랑 ___ 놀았어요.",
      "우리 가족이 ___ 여행을 갔어요."
    ],
    options: [
      {
        text: "같이",
        correct: true,
        note: "'같다'에서 온 말이라 '같이'로 써요. [가치]로 소리 나지만 표기는 달라요."
      },
      {
        text: "가치",
        correct: false,
        note: "'가치'는 소리 나는 대로 잘못 쓴 표기예요. 참고로 '가치'는 '값어치'라는 뜻의 완전히 다른 낱말이에요!"
      }
    ]
  }
];
