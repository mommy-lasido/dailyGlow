/**
 * 영어 어휘 목록 — Wordly Wise 3000.
 *
 * 라윤이가 국제학교에서 쓰는 교재다. 영숙님이 책 뒤쪽의 낱말 목록을 사진으로
 * 보내 주어 그대로 옮겨 적었다. 괄호 안 숫자가 그 낱말이 나오는 과(lesson)다.
 *
 * **영어 교재는 미국 것만 쓴다.** 영숙님이 정했다 — 한국에서 만든 영어 교재는
 * 후보에 올리지 않는다. Wordly Wise 3000 은 미국 EPS Learning 것이다.
 *
 * 스펠링을 맞추는 놀이에 쓰므로 **철자 하나가 틀리면 그대로 틀린 것을 가르치게
 * 된다.** 옮겨 적은 뒤 낱말 하나하나가 실제 영어 낱말인지 확인했고, 영숙님께도
 * 한 번 봐 달라고 부탁했다.
 */

export interface VocabWord {
  word: string;
  /** 몇 과에 나오는가 */
  lesson: number;
  /**
   * 낱말의 뜻 — **영어로만 쓴다.**
   *
   * 영숙님이 정했다: "영어는 문제도 영어로 해줘. 한국말로 도와주는 건 영어를 잘
   * 이해했는지 판단하기도 어려워서." 한국어 뜻을 보여주면 아이가 영어를 알아서
   * 맞힌 것인지 한국어를 보고 맞힌 것인지 갈라낼 수 없다.
   *
   * 뜻 안에 **그 낱말이 들어가면 안 된다.** 답이 새기 때문이다. 넣을 때마다
   * 검사로 확인한다.
   */
  meaning?: string;
}

export interface VocabBook {
  /** Wordly Wise 3000 의 권 번호 */
  book: number;
  words: VocabWord[];
}

const B2: [string, number, string][] = [
  ['aboard', 9, "on a ship, train, or plane"],
  ['absorb', 5, "to soak up a liquid"],
  ['accident', 2, "something bad that happens by chance"],
  ['acrobat', 2, "a person who does flips and balances in a show"],
  ['adult', 14, "a person or animal that is fully grown"],
  ['alarm', 2, "a sound that warns you"],
  ['anchor', 5, "a heavy weight that keeps a boat in place"],
  ['antenna', 3, "a feeler on an insect's head"],
  ['ape', 4, "a large animal like a gorilla or chimp"],
  ['aquarium', 8, "a glass tank where fish live"],
  ['arch', 12, "a curved shape over an opening"],
  ['astronomy', 10, "the study of stars and planets"],
  ['atlas', 11, "a book of maps"],
  ['attention', 12, "careful thinking about one thing"],
  ['award', 12, "a prize given for doing well"],
  ['aware', 11, "knowing that something is there"],
  ['badge', 7, "a small sign you wear to show who you are"],
  ['balance', 3, "to keep steady without falling"],
  ['banner', 7, "a long piece of cloth with writing on it"],
  ['base', 15, "the bottom part that holds something up"],
  ['besides', 10, "in addition to"],
  ['blast', 9, "a sudden loud burst of air or sound"],
  ['boar', 11, "a wild pig with tusks"],
  ['boulder', 3, "a very large rock"],
  ['bounce', 2, "to spring back after hitting something"],
  ['brain', 4, "the part inside your head that thinks"],
  ['branch', 4, "an arm of a tree"],
  ['brush', 5, "a tool with stiff hairs for painting or cleaning"],
  ['bud', 5, "a small bump on a plant that opens into a flower"],
  ['bustle', 13, "to move about in a busy, noisy way"],
  ['cage', 8, "a box with bars for keeping an animal"],
  ['calf', 1, "a baby cow"],
  ['career', 9, "the work a person does for many years"],
  ['cautious', 9, "careful to avoid danger"],
  ['cavern', 4, "a large cave"],
  ['center', 5, "the middle point"],
  ['channel', 13, "a narrow path of water"],
  ['chimney', 4, "a pipe that carries smoke out of a building"],
  ['claw', 1, "a sharp curved nail on an animal's foot"],
  ['cliff', 3, "a steep rock face"],
  ['club', 8, "a group of people who meet for the same hobby"],
  ['clump', 14, "a small tight group of plants or things"],
  ['collapse', 12, "to fall down suddenly"],
  ['cone', 6, "a shape round at the bottom and pointed on top"],
  ['connect', 13, "to join two things together"],
  ['core', 5, "the hard middle part"],
  ['corner', 7, "the place where two sides meet"],
  ['couple', 1, "two things of the same kind"],
  ['crater', 10, "a bowl-shaped hole in the ground"],
  ['cube', 6, "a solid shape with six square sides"],
  ['curious', 14, "wanting to know more"],
  ['cushion', 1, "a soft pad you sit or lean on"],
  ['degree', 10, "a unit for measuring heat or angles"],
  ['demolish', 12, "to knock down a building"],
  ['design', 7, "a plan for how something will look"],
  ['diameter', 10, "the distance straight across a circle"],
  ['din', 15, "a loud lasting noise"],
  ['discard', 15, "to throw away"],
  ['display', 7, "to put out where people can see"],
  ['dome', 15, "a round roof shaped like half a ball"],
  ['dozen', 4, "a group of twelve"],
  ['earth', 6, "the planet we live on"],
  ['empire', 13, "many lands ruled by one leader"],
  ['enormous', 2, "very, very big"],
  ['equator', 11, "the imaginary line around the middle of the planet"],
  ['excess', 12, "more than is needed"],
  ['factory', 5, "a building where goods are made"],
  ['fang', 11, "a long sharp tooth"],
  ['fierce', 11, "wild and angry"],
  ['faucet', 8, "a handle that lets water out"],
  ['fern', 6, "a green plant with feathery leaves"],
  ['flame', 4, "the bright part of a fire"],
  ['flap', 1, "to move up and down like wings"],
  ['flood', 8, "water spreading over dry land"],
  ['fold', 7, "to bend one part over another"],
  ['fuel', 6, "something burned to make heat or power"],
  ['gallon', 15, "a unit for measuring liquid"],
  ['gap', 2, "an empty space between two things"],
  ['gaze', 10, "to look at for a long time"],
  ['gift', 8, "something you give without asking for pay"],
  ['girder', 9, "a long metal beam that holds up a building"],
  ['grain', 6, "a small hard seed such as rice or wheat"],
  ['gratitude', 14, "a thankful feeling"],
  ['gravity', 10, "the pull that holds things to the ground"],
  ['groom', 1, "to clean and brush an animal"],
  ['herd', 14, "a large group of grazing animals"],
  ['hive', 5, "a home where bees live"],
  ['hoof', 11, "the hard foot of a horse or cow"],
  ['icicle', 8, "a hanging spike of ice"],
  ['imitate', 8, "to copy what someone does"],
  ['instrument', 15, "a tool for making music"],
  ['invent', 9, "to make something for the first time"],
  ['joint', 3, "a place where two bones meet"],
  ['journey', 11, "a long trip"],
  ['lizard', 6, "a small reptile with four legs and a tail"],
  ['local', 11, "belonging to the area near you"],
  ['luxury', 15, "something costly that you enjoy but do not need"],
  ['machine', 3, "a device with moving parts that does work"],
  ['mallet', 15, "a hammer with a wooden head"],
  ['mention', 13, "to speak about briefly"],
  ['miner', 6, "a person who digs for coal or metal"],
  ['motor', 3, "the part that makes a machine run"],
  ['muscle', 3, "the part of the body that pulls bones to move them"],
  ['net', 4, "cloth made of knotted string with holes"],
  ['newcomer', 14, "a person who has just arrived"],
  ['outline', 12, "a line showing the outer edge"],
  ['parade', 7, "a line of people marching for others to watch"],
  ['peak', 13, "the pointed top of a mountain"],
  ['pearl', 8, "a small round gem that grows inside an oyster"],
  ['plain', 14, "a wide flat stretch of land"],
  ['planet', 3, "a large body that circles a star"],
  ['present', 6, "to give in front of others"],
  ['rare', 11, "not often found"],
  ['rectangle', 7, "a shape with four sides and four square corners"],
  ['reflect', 10, "to throw back light from a surface"],
  ['rotate', 9, "to turn around a center"],
  ['salute', 7, "to raise a hand to show respect"],
  ['sapling', 5, "a young tree"],
  ['scholar', 13, "a person who studies a subject deeply"],
  ['scoop', 2, "to lift with a curved tool"],
  ['sculpture', 12, "art carved from stone or wood"],
  ['seam', 6, "the line where two pieces of cloth are sewn"],
  ['settle', 13, "to come to rest in a place"],
  ['share', 1, "to divide among others"],
  ['shelter', 1, "a place that keeps you safe from weather"],
  ['skill', 15, "the ability to do something well"],
  ['slight', 15, "small in amount"],
  ['slope', 3, "ground that goes up or down"],
  ['spade', 12, "a tool for digging"],
  ['spear', 4, "a long stick with a sharp point"],
  ['stalk', 14, "the stem of a plant"],
  ['story', 9, "a telling of what happened"],
  ['strand', 9, "a single thin thread or hair"],
  ['support', 2, "to hold up"],
  ['tangle', 2, "a twisted knotted mess"],
  ['telescope', 10, "a tube that makes far things look near"],
  ['torch', 4, "a light you carry in your hand"],
  ['tower', 9, "a tall narrow building"],
  ['tread', 7, "to step on"],
  ['trunk', 5, "the thick main stem of a tree"],
  ['tusk', 14, "a long tooth that sticks out of the mouth"],
  ['universe', 10, "everything that exists"],
  ['utensil', 12, "a tool used for eating or cooking"],
  ['valley', 8, "low land between hills"],
  ['vehicle', 13, "something that carries people, such as a car"],
  ['wealthy', 14, "having a lot of money"],
  ['weigh', 2, "to find how heavy something is"],
  ['yard', 1, "a piece of ground beside a house"],
  ['zero', 1, "the number that means none"],
  ['zigzag', 13, "a line with sharp turns"],
];

const B3: [string, number][] = [
  ['act', 7], ['additional', 7], ['adopt', 12], ['advice', 7], ['amaze', 5],
  ['ambition', 3], ['arctic', 5], ['arouse', 12], ['arrange', 12], ['attitude', 9],
  ['attract', 2], ['auction', 3], ['average', 4], ['bold', 14], ['border', 4],
  ['cable', 10], ['calendar', 13], ['carnival', 13], ['cathedral', 10], ['cell', 12],
  ['chasm', 6], ['coast', 3], ['cocoon', 4], ['confess', 9], ['contain', 8],
  ['continent', 6], ['convey', 10], ['court', 5], ['credit', 6], ['crew', 2],
  ['crumple', 7], ['cunning', 14], ['current', 3], ['cylinder', 1], ['dangle', 2],
  ['deed', 14], ['defend', 9], ['device', 10], ['diagram', 11], ['digest', 8],
  ['division', 15], ['doze', 14], ['drift', 2], ['elect', 5], ['enable', 6],
  ['event', 2], ['examine', 1], ['experience', 13], ['fan', 7], ['fatal', 1],
  ['feature', 1], ['finicky', 8], ['flutter', 4], ['foul', 6], ['frail', 3],
  ['freight', 10], ['frustrate', 11], ['govern', 13], ['gradual', 9], ['graduate', 11],
  ['grasp', 1], ['gulf', 13], ['gust', 6], ['habit', 8], ['haste', 13],
  ['hinge', 8], ['hint', 9], ['individual', 9], ['infection', 12], ['influence', 12],
  ['injure', 12], ['intelligent', 3], ['interval', 5], ['jagged', 14], ['jet', 1],
  ['landmark', 10], ['launch', 2], ['league', 5], ['limit', 5], ['malice', 9],
  ['marine', 1], ['marsh', 8], ['memorize', 7], ['mental', 15], ['method', 10],
  ['milestone', 5], ['misery', 9], ['moisture', 4], ['mystify', 7], ['nation', 13],
  ['nectar', 4], ['novel', 3], ['nursery', 8], ['opposite', 2], ['ordeal', 6],
  ['outcome', 15], ['pastime', 15], ['pattern', 12], ['pause', 7], ['plateau', 6],
  ['positive', 14], ['prank', 11], ['primary', 11], ['process', 4], ['promote', 15],
  ['rate', 15], ['recreation', 5], ['regret', 15], ['rely', 8], ['resident', 3],
  ['respect', 14], ['responsible', 14], ['reverse', 2], ['rig', 6], ['risk', 11],
  ['rod', 10], ['scar', 1], ['scatter', 13], ['schedule', 6], ['series', 12],
  ['shaft', 10], ['signal', 2], ['smuggle', 14], ['solution', 9], ['span', 4],
  ['spine', 8], ['starve', 3], ['steer', 2], ['stress', 11], ['structure', 10],
  ['suitable', 4], ['surrender', 13], ['survey', 9], ['tackle', 5], ['talent', 15],
  ['tentacle', 1], ['theory', 15], ['thrill', 13], ['thrive', 8], ['timber', 4],
  ['tournament', 15], ['transparent', 7], ['urge', 11], ['vacant', 11], ['vanish', 7],
  ['version', 14], ['vessel', 1], ['vigorous', 11], ['vision', 12], ['volunteer', 3],
];

function toBook(
  book: number,
  rows: ([string, number] | [string, number, string])[],
): VocabBook {
  return {
    book,
    words: rows.map(([word, lesson, meaning]) => ({ word, lesson, meaning })),
  };
}

export const VOCAB_BOOKS: VocabBook[] = [toBook(2, B2), toBook(3, B3)];

/**
 * 그 권의 그 과에 나오는 낱말들. 과를 비우면 그 권 전체.
 *
 * **뜻이 적힌 것만 돌려준다.** 뜻이 없으면 화면에 낼 수 없다 — 아이는 무슨
 * 낱말을 맞춰야 하는지 알 길이 없다.
 */
export function wordsOf(book: number, lesson?: number): VocabWord[] {
  const found = VOCAB_BOOKS.find((b) => b.book === book);
  if (!found) return [];
  return found.words.filter(
    (w) => Boolean(w.meaning) && (lesson === undefined || w.lesson === lesson),
  );
}

/** 이 권에 들어 있는 과 번호들. */
export function lessonsOf(book: number): number[] {
  const found = VOCAB_BOOKS.find((b) => b.book === book);
  if (!found) return [];
  return [...new Set(found.words.map((w) => w.lesson))].sort((a, b) => a - b);
}
