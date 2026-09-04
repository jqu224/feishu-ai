// 提神活动：从 100 张图形（25 手工 emoji 马赛克 + 75 确定性浅色画布渐变 emoji 像素画）里随机抽一张。
// 与变形球同宗：emoji 马赛克的 emoji 是画面像素，卡片其余部分仍走图标体系。
import { card, markdown, button, columnSet, textLine, withNav } from '../cards.js';
import { REFRESH_SHAPES } from '../data/refresh.js';

// excludeId：上一张的 id，传入时保证换一张不同的
export function buildRefreshCard(excludeId) {
  let i = Math.floor(Math.random() * REFRESH_SHAPES.length);
  if (excludeId && REFRESH_SHAPES.length > 1) {
    while (REFRESH_SHAPES[i].id === excludeId) {
      i = Math.floor(Math.random() * REFRESH_SHAPES.length);
    }
  }
  const shape = REFRESH_SHAPES[i];
  return card({
    template: 'orange',
    icon: 'coffee',
    iconColor: 'orange',
    title: '提神活动',
    subtitle: shape.name,
    tags: [{ text: `第 ${i + 1} 号图形`, color: 'orange' }],
    elements: withNav([
      // 单换行：飞书 markdown 的 '\n' 是段内换行，行距紧凑；'\n\n' 是段落间距，会把像素画拉散
      markdown(shape.lines.join('\n')),
      textLine(shape.caption, { size: 'notation', color: 'grey', align: 'center' }),
      columnSet([button('再换一个', { a: 'refresh', p: { x: shape.id } }, 'primary')]),
    ]),
  });
}
