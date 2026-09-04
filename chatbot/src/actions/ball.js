// 变形球彩蛋：飞书卡片是纯 JSON 跑不了 JS/WebGL，做不了真 3D 和自动动画，
// 改为「每次点击由服务器程序化生成一张新图」：种子无限 → 图案无限（万花筒/拼布旗/海螺/五角星/三角毯/曼陀罗）。
// 本卡片的 emoji 是画面像素（用户钦点的玩法），其余卡片仍走图标体系。
// 视觉走 CLI/TUI 风（参考 Gemini CLI 终端）：图案装进等宽代码块「终端会话」，
// $ 命令行带 --mode/--seed/--rot/--zoom + 像素输出 + > 状态行（含 ▁▃▅▇█ 缩放档位表）。
// 操作行：变（换图）/ 转（顺时针 90°）/ 放大 / 缩小，4 枚极短按钮单行横排（SPIRIT.md 第四节特例）。
import { card, markdown, button, columnSet, textLine, withNav } from '../cards.js';
import { transformBall, ZOOM_LABEL, ZOOM_METER } from '../data/ball.js';

export function buildBallCard(f = 0, r = 0, z = 0) {
  const { seed, mode, lines, rot, zoom } = transformBall(f, r, z);
  const flags = [`--${mode.cmd}`, '--seed', String(seed).padStart(4, '0')];
  if (rot) flags.push('--rot', String(rot * 90));
  if (zoom) flags.push('--zoom', ZOOM_LABEL[zoom]);
  const terminal = [
    `$ morph.ball ${flags.join(' ')}`,
    '',
    ...lines,
    '',
    `> 图案 No.${seed + 1} · ${mode.name}`,
    `> 视野 ${ZOOM_METER[zoom + 2]} ${ZOOM_LABEL[zoom]}${rot ? ` · 旋转 ${rot * 90}°` : ''}`,
    '> 变 换一张 · 转 旋转 90° · 缩放看细节',
  ].join('\n');
  return card({
    template: 'grey',
    icon: 'volleyball',
    iconColor: 'indigo',
    title: '变形球',
    subtitle: `${mode.name} · 解压疗愈小玩具`,
    tags: [{ text: `No. ${seed + 1}`, color: 'indigo' }],
    elements: withNav([
      markdown(`\`\`\`\n${terminal}\n\`\`\``),
      textLine(mode.caption, { size: 'notation', color: 'grey', align: 'center' }),
      columnSet(
        [
          button('变！', { a: 'ball', p: { f: seed + 1 } }, 'primary', { width: 'fill' }),
          button('转', { a: 'ball', p: { f: seed, r: rot + 1, z: zoom } }, 'default', { width: 'fill' }),
          button('放大', { a: 'ball', p: { f: seed, r: rot, z: zoom + 1 } }, 'default', { width: 'fill' }),
          button('缩小', { a: 'ball', p: { f: seed, r: rot, z: zoom - 1 } }, 'default', { width: 'fill' }),
        ],
        'none'
      ),
    ]),
  });
}
