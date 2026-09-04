// 变形球：程序化像素生成器。飞书卡片跑不了 JS/WebGL，
// 但 bot 可以在每次点击时用一个新种子「算」出一张图 —— 种子无限，图案无限。
// 画布统一 13×13（奇数，有正中心点，呼应解压疗愈主题），⚪ 为留白底。
// 每个生成器都是 seed 的纯函数（mulberry32），可测试、可复现。

const SIZE = 13;
const C = Math.floor(SIZE / 2); // 中心轴下标 6
const BG = '⚪';

// 确定性 PRNG：同一个 seed 永远生成同一张图
export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 双色系色板（控制在两色 + 留白，克制不外溢）
const PALETTES = [
  ['🟦', '🟪'],
  ['🟥', '🟧'],
  ['🟩', '🟦'],
  ['🟪', '🟥'],
  ['🟧', '🟨'],
  ['🟦', '🟩'],
];

function pickPalette(rand) {
  return PALETTES[Math.floor(rand() * PALETTES.length)];
}

// 随机点阵：density 密度，palette 内两色按 7:3 主次分配
function noiseGrid(rand, w, h, density, palette) {
  const g = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      if (rand() < density) row.push(rand() < 0.7 ? palette[0] : palette[1]);
      else row.push(BG);
    }
    g.push(row);
  }
  return g;
}

// 象限折叠：13 的坐标折进 7 的象限（含中心轴），再折进 4 的子象限 —— 1/4 的 1/4
const fold7 = (x) => Math.min(x, SIZE - 1 - x);
const fold4 = (x) => Math.min(x, 6 - x);

function renderGrid(grid) {
  return grid.map((row) => row.join(''));
}

// 疗愈球：一圈环 + 正中心一个点（默认形态，seed 0 固定出这张）
function genHeal(rand) {
  const palette = pickPalette(rand);
  const g = [];
  for (let y = 0; y < SIZE; y++) {
    const row = [];
    for (let x = 0; x < SIZE; x++) {
      const r = Math.hypot(x - C, y - C);
      row.push(Math.round(r) === 5 || r < 0.5 ? palette[0] : BG);
    }
    g.push(row);
  }
  return g;
}

// 万花筒：随机 7×7 象限向四象限镜像；depth=2 时象限自身再由 4×4 子象限折叠（递归对称）
function genKaleido(rand) {
  const palette = pickPalette(rand);
  const density = 0.45 + rand() * 0.25;
  const depth = rand() < 0.5 ? 1 : 2;
  let src;
  if (depth === 2) {
    const sub = noiseGrid(rand, 4, 4, density, palette);
    src = Array.from({ length: 7 }, (_, y) =>
      Array.from({ length: 7 }, (_, x) => sub[fold4(y)][fold4(x)])
    );
  } else {
    src = noiseGrid(rand, 7, 7, density, palette);
  }
  return Array.from({ length: SIZE }, (_, y) =>
    Array.from({ length: SIZE }, (_, x) => src[fold7(y)][fold7(x)])
  );
}

// 拼布旗（国旗玩法）：四个象限各自独立生成 —— 每个象限自己的色板和密度，
// 一半概率象限内部再按 1/4 子象限折叠一次，像四面旗拼成一面大旗。
function genQuilt(rand) {
  const quadrants = [];
  for (let q = 0; q < 4; q++) {
    const palette = pickPalette(rand);
    const density = 0.4 + rand() * 0.3;
    if (rand() < 0.5) {
      const sub = noiseGrid(rand, 4, 4, density, palette);
      quadrants.push(
        Array.from({ length: 7 }, (_, y) =>
          Array.from({ length: 7 }, (_, x) => sub[fold4(y)][fold4(x)])
        )
      );
    } else {
      quadrants.push(noiseGrid(rand, 7, 7, density, palette));
    }
  }
  const qOf = (x, y) => (y <= C ? (x <= C ? 0 : 1) : x <= C ? 2 : 3);
  return Array.from({ length: SIZE }, (_, y) =>
    Array.from({ length: SIZE }, (_, x) => quadrants[qOf(x, y)][fold7(y)][fold7(x)])
  );
}

// 海螺：阿基米德螺线 r = a·(θ+π) 单圈，细线 + 螺心点
function genConch(rand) {
  const palette = pickPalette(rand);
  const a = 0.85 + rand() * 0.2;
  const thick = 0.5;
  const g = [];
  for (let y = 0; y < SIZE; y++) {
    const row = [];
    for (let x = 0; x < SIZE; x++) {
      const dx = x - C;
      const dy = y - C;
      const r = Math.hypot(dx, dy);
      const th = Math.atan2(dy, dx);
      row.push(Math.abs(r - a * (th + Math.PI)) < thick && r < 6 ? palette[0] : BG);
    }
    g.push(row);
  }
  g[C][C] = palette[1]; // 螺心点
  return g;
}

// 五角星：外/内顶点交替的十边形 + 射线法包含测试
function genStar(rand) {
  const palette = pickPalette(rand);
  const R = 6;
  const rIn = 2.4 + rand() * 0.6;
  const verts = [];
  for (let k = 0; k < 10; k++) {
    const ang = -Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 === 0 ? R : rIn;
    verts.push([C + rr * Math.cos(ang), C + rr * Math.sin(ang)]);
  }
  const inside = (px, py) => {
    let c = false;
    for (let i = 0, j = 9; i < 10; j = i++) {
      const [xi, yi] = verts[i];
      const [xj, yj] = verts[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  return Array.from({ length: SIZE }, (_, y) =>
    Array.from({ length: SIZE }, (_, x) => (inside(x, y) ? palette[0] : BG))
  );
}

// 谢尔宾斯基三角毯：递归三分结构 —— 「1/4 里再套 1/4」的数学本体，9×9 居中
function genCarpet(rand) {
  const palette = pickPalette(rand);
  const on = (x, y) => {
    while (x > 0 || y > 0) {
      if (x % 3 === 1 && y % 3 === 1) return false;
      x = Math.floor(x / 3);
      y = Math.floor(y / 3);
    }
    return true;
  };
  const off = 2; // 9×9 地毯居中放进 13×13
  return Array.from({ length: SIZE }, (_, y) =>
    Array.from({ length: SIZE }, (_, x) => {
      const cx = x - off;
      const cy = y - off;
      if (cx < 0 || cy < 0 || cx >= 9 || cy >= 9) return BG;
      return on(cx, cy) ? palette[0] : BG;
    })
  );
}

// 曼陀罗：玫瑰线花瓣 r < R·|sin(kθ)|（k=2.5 出五瓣）+ 外环 + 花心
function genMandala(rand) {
  const palette = pickPalette(rand);
  const k = [2.5, 3, 4][Math.floor(rand() * 3)];
  const R = 5.0 + rand() * 0.5;
  const g = [];
  for (let y = 0; y < SIZE; y++) {
    const row = [];
    for (let x = 0; x < SIZE; x++) {
      const dx = x - C;
      const dy = y - C;
      const r = Math.hypot(dx, dy);
      const th = Math.atan2(dy, dx);
      if (r < 0.5) {
        row.push(palette[0]); // 花心
      } else if (r < R * Math.abs(Math.sin(k * th))) {
        row.push(palette[1]); // 花瓣
      } else {
        row.push(Math.abs(r - 5.8) < 0.45 ? palette[0] : BG); // 外环
      }
    }
    g.push(row);
  }
  return g;
}

export const MODES = [
  { id: 'heal', name: '疗愈球', cmd: 'heal', caption: '外面很吵，中心很稳。盯着中间这个点，深呼吸。', gen: genHeal },
  { id: 'kaleido', name: '万花筒', cmd: 'kaleido', caption: '一个象限随机长出来，剩下三个是它的镜子。', gen: genKaleido },
  { id: 'quilt', name: '拼布旗', cmd: 'quilt', caption: '四个象限各自为政，拼起来又是一面新旗。', gen: genQuilt },
  { id: 'conch', name: '海螺', cmd: 'conch', caption: '把耳朵凑近，能听到像素的海。', gen: genConch },
  { id: 'star', name: '五角星', cmd: 'star', caption: '再点一下，今晚最亮的星。', gen: genStar },
  { id: 'carpet', name: '三角毯', cmd: 'fractal', caption: '大格里套小格，小格里还套着更小的。', gen: genCarpet },
  { id: 'mandala', name: '曼陀罗', cmd: 'mandala', caption: '一圈一圈往外开，开到哪算哪。', gen: genMandala },
];

// 入口：seed（整数帧号）→ 确定的一张图。seed 0 固定疗愈球，其余种子随机选生成器。
function generateGrid(seed) {
  const s = Math.abs(Math.floor(seed)) >>> 0;
  const rand = mulberry32((s * 2654435761) >>> 0);
  const mode = s === 0 ? MODES[0] : MODES[1 + Math.floor(rand() * (MODES.length - 1))];
  return { seed: s, mode, grid: mode.gen(rand) };
}

export function generateBall(seed) {
  const { seed: s, mode, grid } = generateGrid(seed);
  return { seed: s, mode, lines: renderGrid(grid) };
}

// ---------- 画布变换：转 / 缩放 ----------
// 采样方式借鉴终端渲染生态（viu/chafa/buddy）：像素画缩放用最近邻（nearest-neighbor），
// 像素边缘保持锐利、不产生混色——对 emoji 像素画是唯一正确的采样方式。

// 顺时针旋转 90°（13×13 奇数画布，中心轴不动）
export function rotateGridCW(g) {
  const n = g.length;
  return Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => g[n - 1 - x][y]));
}

// 以画布中心为锚点的最近邻缩放：k>1 放大（取中心约 13/k 区域铺满），k<1 缩小（图案收进中心，四周留白）
export function zoomGrid(g, k) {
  const n = g.length;
  return Array.from({ length: n }, (_, y) =>
    Array.from({ length: n }, (_, x) => {
      const sx = Math.round(C + (x - C) / k);
      const sy = Math.round(C + (y - C) / k);
      return sx >= 0 && sx < n && sy >= 0 && sy < n ? g[sy][sx] : BG;
    })
  );
}

// 缩放档位：z ∈ [-2, 2]；档位表与 TUI 仪表语言（▁▃▅▇█）一并导出给卡片状态行
export const ZOOM_MIN = -2;
export const ZOOM_MAX = 2;
export const ZOOM_K = { '-2': 1 / 3, '-1': 1 / 2, 0: 1, 1: 2, 2: 3 };
export const ZOOM_LABEL = { '-2': '÷3', '-1': '÷2', 0: '×1', 1: '×2', 2: '×3' };
export const ZOOM_METER = ['▁', '▃', '▅', '▇', '█']; // 下标 = z + 2

// 变（换种子）之外的两个操作：转（rot 0-3 个 90°）与缩放（z 档位）。
// 先转后缩放；缩放锚点在中心，与旋转天然可交换，顺序不影响观感。
export function transformBall(seed, r = 0, z = 0) {
  const { seed: s, mode, grid } = generateGrid(seed);
  const rot = ((Math.floor(r) % 4) + 4) % 4;
  const zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.floor(z) || 0));
  let g = grid;
  for (let i = 0; i < rot; i++) g = rotateGridCW(g);
  if (zoom !== 0) g = zoomGrid(g, ZOOM_K[zoom]);
  return { seed: s, mode, lines: renderGrid(g), rot, zoom };
}
