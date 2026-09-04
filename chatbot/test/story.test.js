import test from 'node:test';
import assert from 'node:assert/strict';
import { STORIES } from '../src/data/stories.js';
import { getStory, countEndings, buildStoryHomeCard, buildStoryCard } from '../src/actions/story.js';

function collectButtons(elements, acc = []) {
  for (const el of elements) {
    if (el.tag === 'button') acc.push(el);
    if (el.tag === 'column_set') for (const col of el.columns) collectButtons(col.elements, acc);
  }
  return acc;
}

test('剧情数据：所有 next 指向存在的节点', () => {
  for (const story of STORIES) {
    const ids = new Set(Object.keys(story.nodes));
    assert.ok(ids.has('start'), `${story.id} 缺少 start 节点`);
    for (const [id, node] of Object.entries(story.nodes)) {
      if (node.ending) {
        assert.ok(node.title, `${story.id}/${id} 结局缺标题`);
        assert.ok(!node.choices, `${story.id}/${id} 结局不应有选项`);
        assert.ok(node.scene || node.lines?.length, `${story.id}/${id} 结局无内容`);
      } else {
        assert.ok(node.choices?.length >= 3, `${story.id}/${id} 非结局节点至少 3 个选项`);
        const tones = new Set();
        for (const c of node.choices) {
          assert.ok(ids.has(c.next), `${story.id}/${id} 的选项指向不存在的节点 ${c.next}`);
          assert.ok(['pos', 'neu', 'neg'].includes(c.tone), `${story.id}/${id} 选项「${c.t}」tone 非法: ${c.tone}`);
          tones.add(c.tone);
        }
        for (const tone of ['pos', 'neu', 'neg']) {
          assert.ok(tones.has(tone), `${story.id}/${id} 的选项缺少 ${tone} 色调`);
        }
      }
    }
  }
});

test('剧情数据：从 start 出发所有节点可达、所有结局可达成', () => {
  for (const story of STORIES) {
    const seen = new Set();
    const endings = new Set();
    const stack = ['start'];
    while (stack.length) {
      const id = stack.pop();
      if (seen.has(id)) continue;
      seen.add(id);
      const node = story.nodes[id];
      if (node.ending) endings.add(id);
      else for (const c of node.choices) stack.push(c.next);
    }
    const all = Object.keys(story.nodes);
    assert.equal(seen.size, all.length, `${story.id} 存在不可达节点：${all.filter((x) => !seen.has(x))}`);
    assert.equal(endings.size, countEndings(story), `${story.id} 存在不可达结局`);
    assert.ok(endings.size >= 4, `${story.id} 结局太少`);
  }
});

test('每个节点都能渲染成合法卡片，选项按钮指向目标节点', () => {
  for (const story of STORIES) {
    for (const [id, node] of Object.entries(story.nodes)) {
      const c = buildStoryCard(story.id, id);
      assert.equal(c.schema, '2.0');
      const btns = collectButtons(c.body.elements);
      assert.ok(btns.some((b) => b.behaviors?.[0]?.value?.a === 'nav_home'), `${story.id}/${id} 缺导航`);
      if (node.ending) {
        assert.equal(c.header.subtitle.content, '结局达成');
        assert.ok(btns.some((b) => b.behaviors?.[0]?.value?.p?.n === 'start'), '结局卡应可重新开始');
      } else {
        const goBtns = btns.filter((b) => b.behaviors?.[0]?.value?.a === 'story_go');
        assert.equal(goBtns.length, node.choices.length);
        node.choices.forEach((choice, i) => {
          assert.equal(goBtns[i].behaviors[0].value.p.n, choice.next);
        });
      }
    }
  }
});

test('剧情选项平铺：3 个选项一行三列（SPIRIT 第四节）', () => {
  const c = buildStoryCard('puppy', 'phone');
  const row = c.body.elements.find((el) => el.tag === 'column_set' && el.columns.length === 3);
  assert.ok(row, '剧情节点应有 3 列选项行');
  const btns = row.columns.flatMap((col) => col.elements.filter((e) => e.tag === 'button'));
  assert.equal(btns.length, 3);
  for (const b of btns) assert.equal(b.width, 'fill', '列内按钮应 fill 撑满');
});

test('未知节点回退到 start，未知剧本回退到列表', () => {
  const story = getStory('puppy');
  assert.ok(buildStoryCard('puppy', 'no-such-node').body.elements.length > 0);
  assert.equal(buildStoryCard('no-such-story', 'start').header.title.content, '互动剧情');
  assert.equal(countEndings(story), Object.values(story.nodes).filter((n) => n.ending).length);
});

test('剧本列表卡列出剧本与结局数', () => {
  const c = buildStoryHomeCard();
  for (const s of STORIES) {
    assert.ok(collectButtons(c.body.elements).some((b) => b.text.content.includes(s.title)));
  }
});
