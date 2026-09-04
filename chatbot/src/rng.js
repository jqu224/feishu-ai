// 种子随机（mulberry32）：卡片按钮 value 里只存一个 seed，
// 渲染和判题时用同一 seed 复现同样的乱序/抽题结果，游戏状态无需落库。
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed() {
  return Math.floor(Math.random() * 0x7fffffff);
}

export function shuffled(array, rand) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 第 salt 号条目（题目/单词）在给定 seed 下的排列，逐条独立洗牌，
// 因此正确答案不会固定落在某个字母上，也不会出现 ABCD 循环规律。
export function permutation(seed, salt, n) {
  return shuffled([...Array(n).keys()], mulberry32((seed * 31 + salt) >>> 0));
}

export function pickBySeed(seed, array) {
  const rand = mulberry32(seed);
  return array[Math.floor(rand() * array.length)];
}
