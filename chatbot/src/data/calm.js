// 解压练习内容库：6 个「文字互动」练习，数据驱动（渲染引擎在 src/actions/calm.js）。
// 内容取自临床与正念领域常用的自助稳定化技术：
// - 方块呼吸 4-4-4-4（box breathing，海豹突击队训练用，四段等长）
// - 4-7-8 呼吸（Andrew Weil 推广，长呼气激活副交感神经）
// - 54321 五感着陆（grounding，焦虑/惊恐发作的一线自助技巧）
// - 正念数息（观呼吸：数到 8 回到 0，走神就轻轻拉回）
// - 身体扫描（body scan，从脚到脸逐部位放松）
// - 握拳放松（mini 渐进式肌肉放松，紧绷-松开对比）
//
// 交互分两种（2026-09 用户决策：呼吸不该靠用户手点）：
// - timed 步骤（带 secs）：服务器节拍器每秒 updateCard 推倒计时，自动切下一段，
//   全程只需点一次「开始」；进行中的卡片上只有「停止」。机器人重启后计时中断，
//   卡片停在当前段，点「停止」回到练习引导页即可重来。
// - 手动步骤（md 为字符串）：点按钮走一步——54321 找东西、读引导语的节奏是用户的。
// timed 步骤的 md 是 left（剩余秒数）的函数，倒计时大数字每秒由节拍器重渲染。

// ---------- 呼吸类：相位表 × 轮数 生成步骤（全部 timed） ----------
// bar 是呼吸条视觉：吸气由浅到深、屏息持平、呼气由深到浅（TUI 字符，与变形球状态行同族）
const IN = (secs) => ({ label: '吸气', secs, bar: '▁ ▃ ▅ ▇ █', tip: '鼻子慢慢吸，感觉腹部像气球一样鼓起' });
const HOLD = (secs) => ({ label: '屏息', secs, bar: '█ █ █ █ █', tip: '保持住，肩膀别用力' });
const OUT = (secs) => ({ label: '呼气', secs, bar: '█ ▇ ▅ ▃ ▁', tip: '嘴唇微张，缓缓地吐尽' });

function breathSteps(phases, rounds, intro) {
  const steps = [{ md: intro, btn: '开始，跟着节奏走' }];
  for (let r = 1; r <= rounds; r++) {
    for (const [k, ph] of phases.entries()) {
      steps.push({
        secs: ph.secs,
        md: (left) =>
          `**${ph.label}** · ${ph.secs} 秒\n\n# ${left}\n\n${ph.bar}\n\n第 ${r} / ${rounds} 轮 · 第 ${k + 1} / ${phases.length} 段\n${ph.tip}`,
      });
    }
  }
  return steps;
}

// ---------- 54321 五感着陆：每种感官逐样点名（手动） ----------
const SENSES = [
  { n: 5, verb: '看到', hint: '环顾四周，说出 5 样具体的东西——显示器、水杯、绿植……越具体越好。' },
  { n: 4, verb: '摸到', hint: '用手感受 4 种触感——桌面的凉、衣服的软、椅背的硬、指尖的凹凸。' },
  { n: 3, verb: '听到', hint: '安静几秒，捕捉 3 种声音——空调声、远处车流、自己的呼吸声。' },
  { n: 2, verb: '闻到', hint: '分辨 2 种气味——咖啡香、纸张味；闻不到就闻闻衣袖或水杯。' },
  { n: 1, verb: '尝到', hint: '感受嘴里的 1 种味道——白开水的淡、茶水的回甘。' },
];

const dots = (found, n) => '●'.repeat(found) + '○'.repeat(n - found);

function groundSteps() {
  const steps = [
    {
      md: '焦虑时，大脑活在「过去的反刍」或「未来的灾难」里。\n这个练习用五感把你拉回**此时此地**——身体只存在于当下。\n\n先放慢，做 3 次深呼吸，准备好了就开始。',
      btn: '开始 →',
    },
  ];
  SENSES.forEach((sense, i) => {
    for (let found = 0; found < sense.n; found++) {
      steps.push({
        md: `**${sense.verb}** · 找出 ${sense.n} 样\n\n${dots(found, sense.n)}  已找到 ${found} / ${sense.n}\n\n${sense.hint}`,
        btn: found === sense.n - 1 ? (SENSES[i + 1] ? `下一站：${SENSES[i + 1].verb} →` : '完成') : '找到一样',
      });
    }
  });
  return steps;
}

// ---------- 引导语类：固定步骤（手动） ----------
const guide = (arr) => arr.map((md, i) => ({ md, btn: i === arr.length - 1 ? '完成' : '下一步 →' }));

// ---------- 握拳放松：绷紧/松开交替，全部 timed ----------
const hold = (text, secs) => ({ secs, md: (left) => `${text}\n\n# ${left}` });

function muscleSteps() {
  return [
    {
      md: '先制造紧绷，身体才认得什么是放松。\n接下来跟着倒计时走，不用自己数。',
      btn: '开始，跟着节奏走',
    },
    hold('**握紧双拳**，用七成力——保持', 5),
    hold('**突然松开**，摊在腿上——感受血液回流的温热', 10),
    hold('**耸肩到耳朵**，再用力一点——保持', 5),
    hold('**放下**，让肩膀彻底垮掉', 10),
    hold('**皱紧整张脸**：眯眼、咬牙、皱眉——保持', 5),
    hold('**舒展面部**，打个大哈欠也可以', 10),
    { md: '深呼吸一次，对比一下：紧绷与放松，身体分得清了。', btn: '完成' },
  ];
}

export const CALM_EXERCISES = [
  {
    id: 'box',
    name: '方块呼吸',
    desc: '4-4-4-4 四段等长，自动倒计时',
    caption: '海豹突击队同款：稳住节奏，就是稳住心。',
    done: '四个方循环走完，心率应该已经慢下来了。',
    steps: breathSteps(
      [IN(4), HOLD(4), OUT(4), HOLD(4)],
      4,
      '吸 4 秒 → 屏 4 秒 → 呼 4 秒 → 屏 4 秒，像在空气里描一个正方形。\n\n找张有靠背的椅子坐好，双脚平放地面。一共 4 轮，点开始后卡片自己倒计时。'
    ),
  },
  {
    id: 'b478',
    name: '4-7-8 呼吸',
    desc: '长呼气激活副交感，睡前止焦虑',
    caption: '长呼气是身体的「放松开关」。',
    done: '那口长长的呼气，就是身体收到的「解除警戒」信号。',
    steps: breathSteps(
      [IN(4), HOLD(7), OUT(8)],
      4,
      '鼻子吸 4 秒 → 屏息 7 秒 → 噘嘴呼 8 秒。\n\n舌尖轻抵上颚（上门牙后方），呼气时发出轻轻的「呼」声。一共 4 轮，点开始后卡片自己倒计时，睡前做效果最好。'
    ),
  },
  {
    id: 'ground',
    name: '54321 着陆',
    desc: '五感逐一点名，把注意力拉回当下',
    caption: '你无法一边恐慌，一边数清地毯的纹理。',
    done: '五感全部点名完毕——你已经回到此时此地。',
    steps: groundSteps(),
  },
  {
    id: 'mindful',
    name: '正念数息',
    desc: '观呼吸数到 8，走神就轻轻拉回',
    caption: '发现走神的那一刻，就是正念本身。',
    done: '走神了又拉回来——每一次拉回，都是一次完整的练习。',
    steps: guide([
      '坐直，双脚平放地面，双手轻轻搭在腿上。',
      '闭上眼睛，或让目光垂向前下方，放松肩膀。',
      '注意呼吸经过鼻尖的感觉——**不用改变它**，只是看着它。',
      '吸气默数「0」，呼气默数「1」；下一轮呼气数「2」。',
      '一直数到 8，然后回到 0 重新来。',
      '走神了？很好——**发现走神就是正念**。不批判，轻轻拉回来，从 0 重新数。',
      '再静静地数 1 分钟，然后慢慢睁开眼。',
    ]),
  },
  {
    id: 'scan',
    name: '身体扫描',
    desc: '从脚到脸，一个部位一个部位松下来',
    caption: '身体松了，脑子才会跟着松。',
    done: '从脚到脸松了一遍，留意那种身体微微变沉的感觉。',
    steps: guide([
      '**双脚**：注意脚掌与地面的接触，松开脚趾的力。',
      '**小腿**：让小腿沉下去，像化在椅子上。',
      '**腹部**：随呼吸自然起伏，不去控制它。',
      '**双手**：摊开手掌，感受指尖微微发麻或发暖。',
      '**肩膀**：先耸到耳朵，再突然放下——这才叫放松。',
      '**面部**：松开眉心，牙关松开，舌头轻轻贴上颚。',
      '**全身**：整体扫描一遍，哪里还紧，就再松一次。',
    ]),
  },
  {
    id: 'muscle',
    name: '握拳放松',
    desc: '绷紧 5 秒松开 10 秒，自动倒计时',
    caption: '先制造紧绷，身体才认得什么是放松。',
    done: '紧绷与放松的对比感，就是身体学会的信号。',
    steps: muscleSteps(),
  },
];

export function getCalmExercise(id) {
  return CALM_EXERCISES.find((e) => e.id === id);
}

// 加载期自检：恰好 6 个、id 唯一；每步都有 md；手动步骤必须有按钮文案，timed 步骤必须有秒数
if (CALM_EXERCISES.length !== 6) {
  throw new Error(`CALM_EXERCISES 应恰好 6 个，实际 ${CALM_EXERCISES.length}`);
}
const seen = new Set();
for (const e of CALM_EXERCISES) {
  if (seen.has(e.id)) throw new Error(`CALM_EXERCISES id 重复：${e.id}`);
  seen.add(e.id);
  if (!e.steps.length) throw new Error(`${e.id} 没有步骤`);
  for (const [i, s] of e.steps.entries()) {
    if (!s.md) throw new Error(`${e.id} 第 ${i + 1} 步缺 md`);
    if (s.secs == null && !s.btn) throw new Error(`${e.id} 第 ${i + 1} 步缺 btn（手动步骤）`);
    if (s.secs != null && typeof s.md !== 'function') throw new Error(`${e.id} 第 ${i + 1} 步 timed 的 md 必须是 left 的函数`);
  }
}
