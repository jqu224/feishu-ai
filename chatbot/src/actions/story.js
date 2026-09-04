// 预制互动剧情引擎：分支对话树，节点 id 随按钮 value 往返，多结局可重开。
import { card, markdown, button, columnSet, textLine, withNav, celebration, tileButtons } from '../cards.js';
import { STORIES } from '../data/stories.js';

export function getStory(id) {
  return STORIES.find((s) => s.id === id);
}

export function countEndings(story) {
  return Object.values(story.nodes).filter((n) => n.ending).length;
}

function nodeLines(node) {
  const parts = [];
  if (node.scene) parts.push(markdown(node.scene));
  if (node.lines?.length) {
    parts.push(markdown(node.lines.map(([who, line]) => `**${who}**：${line}`).join('\n\n')));
  }
  return parts;
}

export function buildStoryHomeCard() {
  // 剧本入口两列田字格：单元格 = primary 按钮 + notation 剧情简介（SPIRIT.md 第四节）
  const cells = STORIES.map((s) => [
    button(`${s.title}（${countEndings(s)} 个结局）`, { a: 'story_go', p: { s: s.id, n: 'start' } }, 'primary'),
    // 结局数只由按钮上的 countEndings 动态展示；desc 里即使残留「，N 个结局」也剥掉，避免与实际数量打架
    textLine(s.desc.replace(/[，,]?\s*\d+\s*个结局[。.]?$/, ''), { size: 'notation', color: 'grey' }),
  ]);
  const rows = [];
  for (let i = 0; i < cells.length; i += 2) rows.push(columnSet(cells.slice(i, i + 2)));
  return card({
    template: 'carmine',
    icon: 'pen',
    iconColor: 'carmine',
    title: '互动剧情',
    subtitle: '你的选择决定结局',
    elements: withNav(rows),
  });
}

export function buildStoryCard(storyId, nodeId) {
  const story = getStory(storyId);
  if (!story) return buildStoryHomeCard();
  const node = story.nodes[nodeId] || story.nodes.start;
  if (!node) return buildStoryHomeCard();

  if (node.ending) {
    return card({
      template: 'carmine',
      icon: 'done',
      iconColor: 'carmine',
      title: story.title,
      subtitle: '结局达成',
      tags: [{ text: node.title, color: 'carmine' }],
      elements: withNav([
        celebration('fireworks'),
        ...nodeLines(node),
        columnSet([button('重新开始（换个选择试试）', { a: 'story_go', p: { s: story.id, n: 'start' } }, 'primary', { icon: 'reset' })]),
        columnSet([button('换个剧本', { a: 'story_home', p: {} }, 'text', { icon: 'list' })]),
      ]),
    });
  }

  return card({
    template: 'carmine',
    icon: 'pen',
    iconColor: 'carmine',
    title: story.title,
    elements: withNav([
      ...nodeLines(node),
      ...tileButtons(node.choices.map((c) => button(c.t, { a: 'story_go', p: { s: story.id, n: c.next } }, 'default', { width: 'fill' }))),
    ]),
  });
}
