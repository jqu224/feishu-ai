// 提神活动：100 张「看一眼就清醒」的图形。
// - 25 张手工 emoji 马赛克（7 列风格，同变形球：emoji 是画面像素，属图标纪律允许的例外）
// - 75 张确定性生成的浅色画布渐变 emoji 像素画（⬜ 画布 + 单码点方块渐变）
// 生成器在模块加载时用固定参数与固定种子确定性地产出，运行时不再随机。
import { mulberry32 } from '../rng.js';

// ---------- 手工 emoji 马赛克（25 张，全部单码点 emoji，行宽按字符数一致） ----------
const HANDMADE = [
  {
    id: 'hand-sunrise',
    name: '日出',
    caption: '太阳升起来了，你也该醒啦。',
    lines: [
      '⬜⬜🟡🟡🟡⬜⬜',
      '⬜🟡🟡🟡🟡🟡⬜',
      '🟧🟧🟧🟧🟧🟧🟧',
      '🟦🟦🟦🟦🟦🟦🟦',
      '🟦🟦🟦🟦🟦🟦🟦',
      '🟦🟦🟦🟦🟦🟦🟦',
    ],
  },
  {
    id: 'hand-coffee',
    name: '清晨咖啡',
    caption: '第一口咖啡，启动今日引擎。',
    lines: [
      '⬜⬜💨⬜💨⬜⬜',
      '⬜⬛⬛⬛⬛⬜⬜',
      '⬜🟫🟫🟫🟫🟫⬜',
      '⬜🟫🟫🟫🟫⬜⬜',
      '⬜⬜🟫🟫⬜⬜⬜',
      '⬜🟫🟫🟫🟫🟫⬜',
    ],
  },
  {
    id: 'hand-lightning',
    name: '闪电',
    caption: '困意退散，电力满格。',
    lines: [
      '⬜⬜⬜🟡🟡⬜⬜',
      '⬜⬜🟡🟡🟡⬜⬜',
      '⬜⬜🟡🟡⬜⬜⬜',
      '⬜🟡🟡🟡🟡⬜⬜',
      '⬜⬜⬜🟡🟡⬜⬜',
      '⬜⬜🟡🟡⬜⬜⬜',
    ],
  },
  {
    id: 'hand-alarm',
    name: '闹钟',
    caption: '闹钟已就位，梦想不迟到。',
    lines: [
      '⬜🔔⬜⬜⬜🔔⬜',
      '⬜🟦🟦🟦🟦🟦⬜',
      '🟦⚪⚪⬛⚪⚪🟦',
      '🟦⚪⚪⬛⬛⚪🟦',
      '🟦⚪⚪⚪⚪⚪🟦',
      '⬜🟦🟦🟦🟦🟦⬜',
    ],
  },
  {
    id: 'hand-rocket',
    name: '火箭',
    caption: '点火成功，今天也要一飞冲天。',
    lines: [
      '⬜⬜⬜🔴⬜⬜⬜',
      '⬜⬜⚪🔵⚪⬜⬜',
      '⬜⬜⚪⚪⚪⬜⬜',
      '⬜🔴⚪⚪⚪🔴⬜',
      '⬜⬜⚪⚪⚪⬜⬜',
      '⬜🟧🟡🟡🟡🟧⬜',
    ],
  },
  {
    id: 'hand-egg',
    name: '煎蛋',
    caption: '煎蛋在锅里唱歌，早餐是正经事。',
    lines: [
      '⬜⬜⬜⬜⬜⬜⬜',
      '⬜⚪⚪⚪⚪⚪⬜',
      '⚪⚪⚪🟡⚪⚪⚪',
      '⚪⚪🟡🟡🟡⚪⚪',
      '⚪⚪⚪🟡⚪⚪⚪',
      '⬜⚪⚪⚪⚪⚪⬜',
    ],
  },
  {
    id: 'hand-cat',
    name: '猫伸懒腰',
    caption: '学猫伸个懒腰，筋骨全开。',
    lines: [
      '⬜⬜⬜⬜⬜🟧⬜',
      '⬜⬜⬜⬜⬜🟧⬜',
      '🟧🟧⬜🟧🟧🟧⬜',
      '🟧🟧🟧🟧⬜🟧🟧',
      '🟧⬜⬜⬜⬜🟧⬜',
      '🟧🟧⬜⬜⬜🟧⬜',
    ],
  },
  {
    id: 'hand-dumbbell',
    name: '哑铃',
    caption: '举铁五分钟，清醒一整天。',
    lines: [
      '⬜⬜⬜⬜⬜⬜⬜',
      '⬛⬛⬜⬜⬜⬛⬛',
      '⬛⬛⬛⬜⬛⬛⬛',
      '⬛⬛⬛⬛⬛⬛⬛',
      '⬛⬛⬛⬜⬛⬛⬛',
      '⬛⬛⬜⬜⬜⬛⬛',
    ],
  },
  {
    id: 'hand-umbrella',
    name: '雨伞',
    caption: '就算下雨，也要元气出门。',
    lines: [
      '⬜⬜⬜🔴⬜⬜⬜',
      '⬜⬜🔴🔴🔴⬜⬜',
      '⬜🔴🔴🔴🔴🔴⬜',
      '🔴🔴🔴🔴🔴🔴🔴',
      '⬜⬜⬜🟫⬜⬜⬜',
      '⬜⬜🟫🟫⬜⬜⬜',
    ],
  },
  {
    id: 'hand-rainbow',
    name: '彩虹',
    caption: '雨过天晴，彩虹是天空的加油棒。',
    lines: [
      '🟥🟥🟥🟥🟥🟥🟥',
      '🟧🟧🟧🟧🟧🟧🟧',
      '🟨🟨🟨🟨🟨🟨🟨',
      '🟩🟩🟩🟩🟩🟩🟩',
      '🟦🟦🟦🟦🟦🟦🟦',
      '🟪🟪🟪🟪🟪🟪🟪',
    ],
  },
  {
    id: 'hand-road',
    name: '公路',
    caption: '路在脚下延伸，出发就是答案。',
    lines: [
      '⬛⬛⬛🟨⬛⬛⬛',
      '⬛⬛⬛⬛⬛⬛⬛',
      '⬛⬛⬛🟨⬛⬛⬛',
      '⬛⬛⬛⬛⬛⬛⬛',
      '⬛⬛⬛🟨⬛⬛⬛',
      '⬛⬛⬛⬛⬛⬛⬛',
    ],
  },
  {
    id: 'hand-mountain',
    name: '山峰',
    caption: '山在那里，爬就完了。',
    lines: [
      '⬜⬜⬜⚪⬜⬜⬜',
      '⬜⬜⚪⚪⚪⬜⬜',
      '⬜⬛⬛⬛⬛⬛⬜',
      '⬛⬛⬛⬛⬛⬛⬛',
      '⬛⬛⬛⬛⬛⬛⬛',
      '🟩🟩🟩🟩🟩🟩🟩',
    ],
  },
  {
    id: 'hand-wave',
    name: '海浪',
    caption: '海浪叫醒沙滩，也叫醒你。',
    lines: [
      '⬜⬜🟦🟦⬜⬜⬜',
      '⬜🟦⬜⬜🟦⬜⬜',
      '⬜🟦⬜⬜🟦🟦⬜',
      '🟦🟦⬜⬜⬜🟦🟦',
      '🟦🟦🟦🟦🟦🟦🟦',
      '🟦🟦🟦🟦🟦🟦🟦',
    ],
  },
  {
    id: 'hand-bulb',
    name: '灯泡',
    caption: '叮！好点子上线。',
    lines: [
      '⬜⬜🟡🟡🟡⬜⬜',
      '⬜🟡🟡🟡🟡🟡⬜',
      '⬜🟡🟡🟡🟡🟡⬜',
      '⬜⬜🟡🟡🟡⬜⬜',
      '⬜⬜⬛⬛⬛⬜⬜',
      '⬜⬜⬛⬛⬛⬜⬜',
    ],
  },
  {
    id: 'hand-battery',
    name: '电池满格',
    caption: '电量 100%，请开始表演。',
    lines: [
      '⬜⬜⬜⬜⬜⬜⬜',
      '⬛⬛⬛⬛⬛⬛⬜',
      '⬛🟩🟩🟩🟩⬛⬛',
      '⬛🟩🟩🟩🟩⬛⬛',
      '⬛⬛⬛⬛⬛⬛⬜',
      '⬜⬜⬜⬜⬜⬜⬜',
    ],
  },
  {
    id: 'hand-sun',
    name: '太阳',
    caption: '太阳当空照，精神特别好。',
    lines: [
      '⬜⬜⬜🟡⬜⬜⬜',
      '🟡⬜🟡🟡🟡⬜🟡',
      '⬜🟡🟡🟡🟡🟡⬜',
      '⬜🟡🟡🟡🟡🟡⬜',
      '🟡⬜🟡🟡🟡⬜🟡',
      '⬜⬜⬜🟡⬜⬜⬜',
    ],
  },
  {
    id: 'hand-bird',
    name: '小鸟',
    caption: '早起的鸟儿有虫吃，早起的你有咖啡喝。',
    lines: [
      '⬜⬜🟦🟦🟦⬜⬜',
      '⬜🟦⬛🟦🟦🟦⬜',
      '🟧🟦🟦🟦🟦⬜⬜',
      '⬜🟦🟦🟦🟦🟦⬜',
      '⬜⬜🟦🟦🟦⬜⬜',
      '⬜⬜🟦⬜🟦⬜⬜',
    ],
  },
  {
    id: 'hand-sprout',
    name: '树苗',
    caption: '像小树苗一样，今天也向上长一厘米。',
    lines: [
      '⬜🟩🟩⬜🟩🟩⬜',
      '⬜⬜🟩🟩🟩⬜⬜',
      '⬜⬜⬜🟩⬜⬜⬜',
      '⬜⬜⬜🟩⬜⬜⬜',
      '🟫🟫🟫🟫🟫🟫🟫',
      '🟫🟫🟫🟫🟫🟫🟫',
    ],
  },
  {
    id: 'hand-sneaker',
    name: '跑鞋',
    caption: '系好鞋带，晨跑去。',
    lines: [
      '⬜⬜⬜⬜⬜⬜⬜',
      '⬜⬜⬜🟥🟥⬜⬜',
      '⬜⬜🟥⚪🟥🟥⬜',
      '⬜🟥🟥🟥🟥🟥🟥',
      '⚪⚪⚪⚪⚪⚪⚪',
      '⬜⬜⬜⬜⬜⬜⬜',
    ],
  },
  {
    id: 'hand-glasses',
    name: '眼镜',
    caption: '戴上眼镜，世界对焦成功。',
    lines: [
      '⬜⬜⬜⬜⬜⬜⬜',
      '⬛⬛⬛⬜⬛⬛⬛',
      '⬛⚪⬛⬛⬛⚪⬛',
      '⬛⬛⬛⬜⬛⬛⬛',
      '⬜⬜⬜⬜⬜⬜⬜',
      '⬜⬜⬜⬜⬜⬜⬜',
    ],
  },
  {
    id: 'hand-book',
    name: '书本',
    caption: '翻开一页，给大脑热身。',
    lines: [
      '⬜⬜⬜⬜⬜⬜⬜',
      '⬜🟦🟦⬜🟦🟦⬜',
      '🟦⚪⚪🟦⚪⚪🟦',
      '🟦⚪⚪🟦⚪⚪🟦',
      '⬜🟦🟦🟦🟦🟦⬜',
      '⬜⬜⬜⬜⬜⬜⬜',
    ],
  },
  {
    id: 'hand-headphones',
    name: '耳机',
    caption: '戴上耳机，今日 BGM 已就绪。',
    lines: [
      '⬜⬜⬛⬛⬛⬜⬜',
      '⬜⬛⬜⬜⬜⬛⬜',
      '⬜⬛⬜⬜⬜⬛⬜',
      '⬛⬛⬛⬜⬛⬛⬛',
      '⬛⬛⬛⬜⬛⬛⬛',
      '⬜⬜⬜⬜⬜⬜⬜',
    ],
  },
  {
    id: 'hand-juice',
    name: '果汁',
    caption: '一杯橙汁，维生素 C 报到。',
    lines: [
      '⬜⬜⬜⬜⬜🟥⬜',
      '⬜⬜⬜⬜🟥⬜⬜',
      '⬜⬜⬜🟥⬜⬜⬜',
      '⬜🟧🟧🟧🟧🟧⬜',
      '⬜🟧🟧🟧🟧🟧⬜',
      '⬜🟧🟧🟧🟧🟧⬜',
    ],
  },
  {
    id: 'hand-bike',
    name: '自行车',
    caption: '骑上车，风会帮你醒。',
    lines: [
      '⬜⬜⬜🟫🟫⬜⬜',
      '⬜⬜⬛⬛⬜⬜⬜',
      '⬜⬛⬜⬛⬜⬛⬜',
      '⚫⬛⬛⬛⬛⬛⚫',
      '⬜⚫⚫⬜⚫⚫⬜',
      '⬜⬜⬜⬜⬜⬜⬜',
    ],
  },
  {
    id: 'hand-smiley',
    name: '笑脸',
    caption: '先笑一个，好运自然来。',
    lines: [
      '⬜🟡🟡🟡🟡🟡⬜',
      '🟡⬛🟡🟡🟡⬛🟡',
      '🟡🟡🟡🟡🟡🟡🟡',
      '🟡⬛🟡🟡🟡⬛🟡',
      '🟡🟡⬛⬛⬛🟡🟡',
      '⬜🟡🟡🟡🟡🟡⬜',
    ],
  },
];

// ---------- 字符几何生成器（75 张遮罩，参数与种子全部写死，加载期确定性产出） ----------
// 注意：GEN 输出的字符网格只作「遮罩」——判断每格是背景还是像素点，不再直接上卡；
// 上色由下方的渐变像素画管线完成（背景 → ⬜ 浅色画布，像素 → 渐变 ramp 按位置取色）。
function grid(w, h, fn) {
  const rows = [];
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) row += fn(x, y);
    rows.push(row);
  }
  return rows;
}

const GEN = {
  // 横向正弦波浪线（振幅随宽度收敛，保证相邻列不断线）
  wave: ({ w, h, pair: [bg, fg], ph = 0, th = 1 }) => {
    const amp = Math.min((h - 1) / 2, (w / (Math.PI * 2)) * 0.85);
    const tol = (th - 1) / 2 + 0.34;
    return grid(w, h, (x, y) => {
      const cy = (h - 1) / 2 + amp * Math.sin(((x + ph) / w) * Math.PI * 2);
      return Math.abs(y - cy) <= tol ? fg : bg;
    });
  },
  // 实心菱形（曼哈顿距离）
  diamond: ({ w, h, pair: [bg, fg], r = 1 }) => {
    const cx = (w - 1) / 2;
    const cy = (h - 1) / 2;
    return grid(w, h, (x, y) =>
      Math.abs(x - cx) / (cx || 1) + Math.abs(y - cy) / (cy || 1) <= r ? fg : bg
    );
  },
  // 棋盘格（可放大格）
  checker: ({ w, h, pair: [a, b], cell = 1 }) =>
    grid(w, h, (x, y) => ((Math.floor(x / cell) + Math.floor(y / cell)) % 2 ? b : a)),
  // 同心方框
  concentric: ({ w, h, pair: [a, b] }) =>
    grid(w, h, (x, y) => (Math.min(x, w - 1 - x, y, h - 1 - y) % 2 ? b : a)),
  // 斜纹（方向 / 周期 / 粗细可调）
  diagonal: ({ w, h, pair: [bg, fg], period = 3, th = 1, dir = 1 }) =>
    grid(w, h, (x, y) => {
      const v = (((dir > 0 ? x + y : x - y) % period) + period) % period;
      return v < th ? fg : bg;
    }),
  // 十字栅格
  cross: ({ w, h, pair: [bg, fg], period = 4 }) =>
    grid(w, h, (x, y) => (x % period === 0 || y % period === 0 ? fg : bg)),
  // 点阵星空（种子随机，加载期确定）
  starfield: ({ w, h, seed, bg = '·', stars = ['*'], density = 0.18 }) => {
    const rand = mulberry32(seed);
    return grid(w, h, () => (rand() < density ? stars[Math.floor(rand() * stars.length)] : bg));
  },
  // 方框螺旋路径（逐格行走，臂间留 1 格间距）
  spiral: ({ w, h, pair: [bg, fg] }) => {
    const cells = Array.from({ length: h }, () => Array(w).fill(bg));
    let x = -1;
    let y = 0;
    let dx = 1;
    let dy = 0;
    let horiz = w;
    let vert = h - 1;
    let firstH = true;
    for (;;) {
      if (horiz <= 0) break;
      for (let i = 0; i < horiz; i++) {
        x += dx;
        y += dy;
        cells[y][x] = fg;
      }
      [dx, dy] = [-dy, dx];
      horiz = firstH ? horiz - 1 : horiz - 2;
      firstH = false;
      if (vert <= 0) break;
      for (let i = 0; i < vert; i++) {
        x += dx;
        y += dy;
        cells[y][x] = fg;
      }
      [dx, dy] = [-dy, dx];
      vert -= 2;
    }
    return cells.map((row) => row.join(''));
  },
  // 阶梯（左右两个方向）
  stairs: ({ w, h, pair: [bg, fg], step = 2, up = true }) =>
    grid(w, h, (x, y) => {
      const edge = (y + 1) * step;
      return (up ? x >= w - edge : x < edge) ? fg : bg;
    }),
  // 迷宫格（经典 10 PRINT：╱╲ 随机铺）
  maze: ({ w, h, seed, bias = 0.5 }) => {
    const rand = mulberry32(seed);
    return grid(w, h, () => (rand() < bias ? '╱' : '╲'));
  },
};

const TYPE_NAMES = {
  wave: '波浪',
  diamond: '菱形',
  checker: '棋盘格',
  concentric: '同心方框',
  diagonal: '斜纹',
  cross: '十字',
  starfield: '点阵星空',
  spiral: '螺旋',
  stairs: '阶梯',
  maze: '迷宫格',
};

const NUMERALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

// 元气 caption 模板池（按序号确定性轮转）
const GEN_CAPTIONS = [
  '眼睛先醒，脑子随后就到。',
  '几何韵律，专治各种犯困。',
  '盯三秒，精神头回来了。',
  '像素级提神，无副作用。',
  '图案已就位，困意请退场。',
  '这波几何冲击，清醒值加十。',
  '看完这张图，效率上线。',
  '让字符给你做个眼保健操。',
  '简单的线条，不简单的元气。',
  '醒了没？没醒再看一张。',
  '图形编号已记录，元气持续供应。',
  '一张图的时间，换一口深呼吸。',
  '提神不靠咖啡，靠几何。',
  '看得越久越清醒，大概。',
  '字符画虽小，能量不小。',
];

// 75 个参数组合：类型 x 尺寸 x 字符对（x 种子）
const VARIANTS = [
  // 波浪 x 8
  { t: 'wave', w: 13, h: 6, pair: ['·', '×'], ph: 0, th: 1 },
  { t: 'wave', w: 13, h: 6, pair: ['·', '*'], ph: 1, th: 1 },
  { t: 'wave', w: 13, h: 6, pair: ['·', '◆'], ph: 2, th: 1 },
  { t: 'wave', w: 13, h: 6, pair: ['·', '●'], ph: 3, th: 1 },
  { t: 'wave', w: 13, h: 6, pair: ['·', '+'], ph: 1.5, th: 1 },
  { t: 'wave', w: 13, h: 6, pair: ['·', '○'], ph: 2.5, th: 1 },
  { t: 'wave', w: 13, h: 6, pair: ['·', '═'], ph: 0.5, th: 1 },
  { t: 'wave', w: 13, h: 6, pair: ['·', '×'], ph: 3.5, th: 2 },
  // 菱形 x 8
  { t: 'diamond', w: 11, h: 7, pair: ['·', '◆'], r: 1 },
  { t: 'diamond', w: 11, h: 7, pair: ['·', '●'], r: 0.8 },
  { t: 'diamond', w: 11, h: 7, pair: ['·', '×'], r: 1 },
  { t: 'diamond', w: 11, h: 7, pair: ['○', '●'], r: 0.9 },
  { t: 'diamond', w: 11, h: 7, pair: ['·', '*'], r: 1 },
  { t: 'diamond', w: 11, h: 7, pair: ['·', '+'], r: 0.8 },
  { t: 'diamond', w: 11, h: 7, pair: ['·', '○'], r: 1 },
  { t: 'diamond', w: 13, h: 7, pair: ['+', '×'], r: 0.9 },
  // 棋盘格 x 7
  { t: 'checker', w: 12, h: 6, pair: ['·', '◆'], cell: 1 },
  { t: 'checker', w: 12, h: 6, pair: ['○', '●'], cell: 1 },
  { t: 'checker', w: 12, h: 6, pair: ['·', '●'], cell: 2 },
  { t: 'checker', w: 12, h: 6, pair: ['+', '×'], cell: 1 },
  { t: 'checker', w: 12, h: 6, pair: ['·', '×'], cell: 2 },
  { t: 'checker', w: 12, h: 6, pair: ['·', '+'], cell: 3 },
  { t: 'checker', w: 12, h: 6, pair: ['·', '*'], cell: 2 },
  // 同心方框 x 7
  { t: 'concentric', w: 11, h: 7, pair: ['·', '◆'] },
  { t: 'concentric', w: 11, h: 7, pair: ['·', '●'] },
  { t: 'concentric', w: 11, h: 7, pair: ['○', '●'] },
  { t: 'concentric', w: 11, h: 7, pair: ['·', '+'] },
  { t: 'concentric', w: 11, h: 7, pair: ['·', '×'] },
  { t: 'concentric', w: 13, h: 7, pair: ['·', '*'] },
  { t: 'concentric', w: 11, h: 7, pair: ['·', '═'] },
  // 斜纹 x 8
  { t: 'diagonal', w: 13, h: 6, pair: ['·', '╱'], period: 2, th: 1, dir: 1 },
  { t: 'diagonal', w: 13, h: 6, pair: ['·', '╲'], period: 2, th: 1, dir: -1 },
  { t: 'diagonal', w: 13, h: 6, pair: ['·', '─'], period: 3, th: 1, dir: 1 },
  { t: 'diagonal', w: 13, h: 6, pair: ['·', '│'], period: 3, th: 1, dir: -1 },
  { t: 'diagonal', w: 13, h: 6, pair: ['·', '*'], period: 4, th: 1, dir: 1 },
  { t: 'diagonal', w: 13, h: 6, pair: ['·', '+'], period: 3, th: 2, dir: -1 },
  { t: 'diagonal', w: 13, h: 6, pair: ['·', '×'], period: 4, th: 2, dir: 1 },
  { t: 'diagonal', w: 13, h: 6, pair: ['·', '◆'], period: 5, th: 1, dir: -1 },
  // 十字 x 7
  { t: 'cross', w: 13, h: 7, pair: ['·', '+'], period: 4 },
  { t: 'cross', w: 13, h: 7, pair: ['·', '×'], period: 3 },
  { t: 'cross', w: 13, h: 7, pair: ['·', '*'], period: 4 },
  { t: 'cross', w: 13, h: 7, pair: ['·', '◆'], period: 6 },
  { t: 'cross', w: 13, h: 7, pair: ['·', '●'], period: 3 },
  { t: 'cross', w: 13, h: 7, pair: ['○', '+'], period: 4 },
  { t: 'cross', w: 13, h: 7, pair: ['·', '─'], period: 5 },
  // 点阵星空 x 8
  { t: 'starfield', w: 14, h: 6, seed: 11, stars: ['*'], density: 0.16 },
  { t: 'starfield', w: 14, h: 6, seed: 22, stars: ['◆'], density: 0.14 },
  { t: 'starfield', w: 14, h: 6, seed: 33, stars: ['*', '◆'], density: 0.2 },
  { t: 'starfield', w: 14, h: 6, seed: 44, stars: ['○', '●'], density: 0.18 },
  { t: 'starfield', w: 14, h: 6, seed: 55, stars: ['+'], density: 0.15 },
  { t: 'starfield', w: 14, h: 6, seed: 66, stars: ['*', '+', '◆'], density: 0.22 },
  { t: 'starfield', w: 14, h: 6, seed: 77, stars: ['●'], density: 0.12 },
  { t: 'starfield', w: 14, h: 6, seed: 88, stars: ['*', '○'], density: 0.2 },
  // 螺旋 x 7
  { t: 'spiral', w: 13, h: 7, pair: ['·', '●'] },
  { t: 'spiral', w: 13, h: 7, pair: ['·', '○'] },
  { t: 'spiral', w: 11, h: 7, pair: ['·', '*'] },
  { t: 'spiral', w: 13, h: 7, pair: ['·', '◆'] },
  { t: 'spiral', w: 13, h: 5, pair: ['·', '+'] },
  { t: 'spiral', w: 11, h: 7, pair: ['·', '×'] },
  { t: 'spiral', w: 13, h: 7, pair: ['○', '●'] },
  // 阶梯 x 7
  { t: 'stairs', w: 13, h: 6, pair: ['·', '◆'], step: 2, up: true },
  { t: 'stairs', w: 13, h: 6, pair: ['·', '●'], step: 2, up: false },
  { t: 'stairs', w: 13, h: 6, pair: ['·', '×'], step: 2, up: true },
  { t: 'stairs', w: 13, h: 6, pair: ['·', '+'], step: 3, up: false },
  { t: 'stairs', w: 13, h: 6, pair: ['·', '*'], step: 2, up: true },
  { t: 'stairs', w: 13, h: 6, pair: ['·', '○'], step: 3, up: true },
  { t: 'stairs', w: 13, h: 6, pair: ['·', '═'], step: 2, up: false },
  // 迷宫格 x 8
  { t: 'maze', w: 14, h: 6, seed: 3 },
  { t: 'maze', w: 14, h: 6, seed: 5 },
  { t: 'maze', w: 14, h: 6, seed: 8 },
  { t: 'maze', w: 14, h: 6, seed: 13 },
  { t: 'maze', w: 14, h: 6, seed: 21 },
  { t: 'maze', w: 14, h: 6, seed: 34 },
  { t: 'maze', w: 14, h: 6, seed: 55 },
  { t: 'maze', w: 14, h: 6, seed: 89 },
];

// ---------- 渐变像素画管线：遮罩上色为「浅色底 + 渐变」emoji 像素画 ----------
// 纪律：画布一律 ⬜ 浅色底（⬛ 黑底已禁用）；像素只用单码点方块 emoji（飞书字体里等宽，行列严格对齐）。

const CANVAS_BG = '⬜'; // 浅色画布

// 渐变 ramp：每条 3 档颜色，全部单码点方块 emoji；gemini 蓝紫红是默认主力（致敬参考图）
// 注意：ramp 不能含 ⬜——画布已是浅色底，白色像素会融进背景隐形（原「冰川」终点 ⬜ 已改 🟩）
const RAMPS = [
  ['🟦', '🟪', '🟥'], // gemini：蓝 → 紫 → 红
  ['🟨', '🟧', '🟥'], // 落日
  ['🟩', '🟦', '🟪'], // 极光
  ['🟥', '🟧', '🟨'], // 火焰
  ['🟪', '🟦', '🟩'], // 冰川：紫 → 蓝 → 绿
];

// 渐变方向：t(x, y, w, h) ∈ [0,1]，像素格颜色 = ramp[Math.round(t * (ramp.length - 1))]
const DIRS = [
  (x, y, w) => x / (w - 1 || 1), // horizontal：左 → 右
  (x, y, w, h) => y / (h - 1 || 1), // vertical：上 → 下
  (x, y, w, h) => {
    // radial：中心亮、边缘暗（到中心的归一化欧氏距离）
    const cx = (w - 1) / 2;
    const cy = (h - 1) / 2;
    return Math.min(1, Math.hypot(x - cx, y - cy) / (Math.hypot(cx, cy) || 1));
  },
  (x, y, w, h) => (x / (w - 1 || 1) + y / (h - 1 || 1)) / 2, // diagonal：左上 → 右下
];

// 遮罩背景格判定：有 pair 的变体背景是 pair[0]；迷宫格背景 '╲'（像素 '╱'）；星空背景 '·'（像素是 stars 里的字符）
function isBackgroundCell(v, ch) {
  if (v.t === 'maze') return ch === '╲';
  if (v.t === 'starfield') return ch === '·';
  return ch === v.pair[0];
}

function colorize(v, mask, ramp, dir) {
  return mask.map((row, y) =>
    [...row]
      .map((ch, x) => {
        if (isBackgroundCell(v, ch)) return CANVAS_BG;
        return ramp[Math.round(dir(x, y, v.w, v.h) * (ramp.length - 1))];
      })
      .join('')
  );
}

const typeCounters = {};
const GENERATED = VARIANTS.map((v, i) => {
  const n = (typeCounters[v.t] = (typeCounters[v.t] || 0) + 1);
  // ramp 与方向按 VARIANTS 下标确定性轮转：加载期确定、相邻变体风格错开
  const ramp = RAMPS[i % RAMPS.length];
  const dir = DIRS[Math.floor(i / RAMPS.length) % DIRS.length];
  return {
    id: `gen-${v.t}-${n}`,
    name: `${TYPE_NAMES[v.t]}·其${NUMERALS[n - 1]}`,
    caption: GEN_CAPTIONS[i % GEN_CAPTIONS.length],
    lines: colorize(v, GEN[v.t](v), ramp, dir),
  };
});

export const REFRESH_SHAPES = [...HANDMADE, ...GENERATED];

// 加载期自检：恰好 100 个、id 唯一、每个图形行宽一致
if (REFRESH_SHAPES.length !== 100) {
  throw new Error(`REFRESH_SHAPES 应恰好 100 个，实际 ${REFRESH_SHAPES.length}`);
}
const seen = new Set();
for (const s of REFRESH_SHAPES) {
  if (seen.has(s.id)) throw new Error(`REFRESH_SHAPES id 重复：${s.id}`);
  seen.add(s.id);
  const widths = new Set(s.lines.map((l) => [...l].length));
  if (widths.size !== 1) throw new Error(`REFRESH_SHAPES 行宽不一致：${s.id}`);
}
// 生成图形像素纪律：只含 ⬜ 浅色画布 + ramp 里出现过的方块，且每张至少 2 种颜色
const ALLOWED_PIXELS = new Set([CANVAS_BG, ...RAMPS.flat()]);
for (const s of GENERATED) {
  const colors = new Set();
  for (const l of s.lines) {
    for (const ch of l) {
      if (!ALLOWED_PIXELS.has(ch)) throw new Error(`GENERATED 含非法像素字符：${s.id} → ${ch}`);
      colors.add(ch);
    }
  }
  if (colors.size < 2) throw new Error(`GENERATED 颜色数不足 2：${s.id}`);
}
