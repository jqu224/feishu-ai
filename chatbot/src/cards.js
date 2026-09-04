// 卡片 v2 JSON 构建助手，视觉语言对齐 Material 3 的克制表达（Slack / Google 大厂审美）：
// - 中性表面：statRow 等统计块统一 grey-50 surface-container，禁止多 hue pastel 拼接；
//   色彩只通过数字/文字的 text_color 做语义强调（on-surface 角色）
// - 状态进 header：计数/状态放 header text_tag_list，body 不重复元信息
// - 图标纪律：同一卡片正文行图标单一主题色，禁止彩虹图标；图标全部走 icons.js，文案禁止 emoji
// - 排版：textLine 支持字号/颜色/前缀图标，statRow 输出大数字统计块，columnSet 支持权重分栏
import { icon } from './icons.js';

export const TEMPLATES = {
  rps: 'yellow',
  vote: 'turquoise',
  form: 'wathet',
  info: 'violet',
  confirm: 'red',
};

export function markdown(content) {
  return { tag: 'markdown', content };
}

// markdown 内联彩色标签（chip），color: neutral|blue|turquoise|lime|orange|violet|indigo|wathet|green|yellow|red|purple|carmine
export function chip(text, color = 'neutral') {
  return `<text_tag color='${color}'> ${text} </text_tag>`;
}

export function hr() {
  return { tag: 'hr' };
}

export function button(text, value, type = 'default', { icon: iconName, iconColor, size = 'medium', width = 'default' } = {}) {
  const btn = {
    tag: 'button',
    text: { tag: 'plain_text', content: text },
    type,
    width,
    size,
    behaviors: [{ type: 'callback', value }],
  };
  const ic = icon(iconName, iconColor);
  if (ic) btn.icon = ic;
  return btn;
}

export function linkButton(text, url, type = 'default', { icon: iconName, iconColor } = {}) {
  const btn = {
    tag: 'button',
    text: { tag: 'plain_text', content: text },
    type,
    width: 'default',
    size: 'medium',
    behaviors: [{ type: 'open_url', default_url: url }],
  };
  const ic = icon(iconName, iconColor);
  if (ic) btn.icon = ic;
  return btn;
}

// 普通文本行（div 组件）：M3 排版主力，支持字号档位与语义图标前缀
// size: heading-0..heading-4|normal|notation|large..x-small；color: 颜色枚举值或 default
export function textLine(content, { icon: iconName, iconColor, size = 'normal', color = 'default', align = 'left', lines } = {}) {
  const text = { tag: 'plain_text', content, text_size: size, text_color: color, text_align: align };
  if (lines) text.lines = lines;
  const el = { tag: 'div', text };
  const ic = icon(iconName, iconColor);
  if (ic) el.icon = ic;
  return el;
}

// 统计块：统一 grey-50 surface-container + 居中大数字 + notation 标签
// items: [{ label, value, tone, color: 数字颜色 }]
// tone 仅用于语义强调场景（原则上常规一律 grey-50，靠 color 表达语义），禁止多 hue pastel 拼接
export function statRow(items) {
  const flexMode = { 1: 'none', 2: 'bisect', 3: 'trisect' }[items.length] || 'flow';
  return {
    tag: 'column_set',
    flex_mode: flexMode,
    columns: items.map((it) => ({
      tag: 'column',
      width: 'weighted',
      weight: 1,
      vertical_align: 'center',
      background_style: it.tone || 'grey-50',
      padding: '16px 4px 16px 4px',
      elements: [
        { tag: 'div', text: { tag: 'plain_text', content: String(it.value), text_size: 'heading-2', text_color: it.color || 'default', text_align: 'center' } },
        { tag: 'div', text: { tag: 'plain_text', content: it.label, text_size: 'notation', text_color: 'grey', text_align: 'center' } },
      ],
    })),
  };
}

// 图表组件：chart_spec 遵循 VChart 声明式语法（卡片内不支持 JS 函数）。
// values: [{ name: 类目, value: 数值 }]；direction 'horizontal' 为条形图，适合选项票数对比。
// 单卡建议不超过 5 个图表；需飞书客户端较新版本渲染。
export function chart({ values = [], direction = 'horizontal', aspectRatio, colorTheme, title } = {}) {
  const spec = {
    type: 'bar',
    direction,
    data: [{ id: 'data', values: values.map((v) => ({ name: String(v.name ?? ''), value: Number(v.value) || 0 })) }],
    xField: 'value',
    yField: 'name',
  };
  if (title) spec.title = { text: title };
  const el = { tag: 'chart', chart_spec: spec };
  if (aspectRatio) el.aspect_ratio = aspectRatio;
  if (colorTheme) el.color_theme = colorTheme;
  return el;
}

// 备注行：卡片底部的灰色辅助小字（对齐 M3 的 note / 辅助文案层）。
// 注意：v1 的 note 组件在 schema 2.0 已下线（服务端报 ErrCode 200861），
// 这里用 div + notation/grey 实现同样的视觉层级。
export function note(text) {
  return {
    tag: 'div',
    text: { tag: 'plain_text', content: text, text_size: 'notation', text_color: 'grey' },
  };
}

export function input(name, { placeholder = '请输入', required = false } = {}) {
  return {
    tag: 'input',
    name,
    required,
    width: 'fill',
    placeholder: { tag: 'plain_text', content: placeholder },
    default_value: '',
  };
}

export function selectStatic(name, options = [], { placeholder = '请选择', required = false } = {}) {
  return {
    tag: 'select_static',
    name,
    required,
    width: 'fill',
    placeholder: { tag: 'plain_text', content: placeholder },
    options: options.map((o) => ({ text: { tag: 'plain_text', content: o }, value: o })),
  };
}

export function formContainer(name, elements = []) {
  return { tag: 'form', name, elements };
}

export function formSubmitButton(text, value) {
  const btn = {
    tag: 'button',
    text: { tag: 'plain_text', content: text },
    type: 'primary',
    name: 'submit',
    form_action_type: 'submit',
    behaviors: [{ type: 'callback', value }],
  };
  const ic = icon('confirm');
  if (ic) btn.icon = ic;
  return btn;
}

export function formResetButton(text = '清空') {
  const btn = {
    tag: 'button',
    text: { tag: 'plain_text', content: text },
    type: 'text',
    name: 'reset',
    form_action_type: 'reset',
  };
  const ic = icon('cancel');
  if (ic) btn.icon = ic;
  return btn;
}

// 选项平铺网格（SPIRIT.md 第四节）：选项按钮不再竖排，按数量平铺——
// 2 个→一行两列；3 个→一行三列；4 个→2×2 田字格；更多按 ≤3 个分行。
// 按钮须在列内 width: 'fill'（与石头剪刀布同一套 columnSet 方案，天然可点击）。
export function tileButtons(btns) {
  if (btns.length <= 1) return btns;
  const perRow = btns.length === 4 ? 2 : 3;
  const rows = [];
  for (let i = 0; i < btns.length; i += perRow) rows.push(columnSet(btns.slice(i, i + perRow)));
  return rows;
}

// 分栏行；按列数选择分栏模式（2 列 bisect / 3 列 trisect）
// items 元素可以是：普通元素 / 元素数组（等宽，weight 默认 1），
// 或 { content: 元素|元素数组, weight: 数字, verticalAlign: 'top'|'center'|'bottom' }（带权重分栏，向后兼容）
export function columnSet(items, flexMode) {
  // 默认：2/3 列用等分，4 列及以上用 flow（窄屏自动换行）；
  // 传入 'none' 可强制一行不换行（键盘等场景，防止手机端错位）
  const mode = flexMode || { 1: 'none', 2: 'bisect', 3: 'trisect' }[items.length] || 'flow';
  return {
    tag: 'column_set',
    flex_mode: mode,
    columns: items.map((item) => {
      // 权重规格对象必须没有 tag：markdown/div 等元素自带顶层 content 字段，
      // 仅凭 'content' in item 会把它们误判成规格并解包成裸字符串（飞书更新接口直接 400）
      const spec =
        item && !Array.isArray(item) && typeof item === 'object' && 'content' in item && !('tag' in item)
          ? item
          : null;
      const content = spec ? spec.content : item;
      const col = {
        tag: 'column',
        width: 'weighted',
        weight: spec?.weight ?? 1,
        elements: Array.isArray(content) ? content : [content],
      };
      if (spec?.verticalAlign) col.vertical_align = spec.verticalAlign;
      return col;
    }),
  };
}

export function card({
  template = 'blue',
  title = '',
  subtitle = '',
  elements = [],
  icon: iconName,
  iconColor,
  tags = [],
} = {}) {
  const header = {
    template,
    title: { tag: 'plain_text', content: title },
  };
  if (subtitle) header.subtitle = { tag: 'plain_text', content: subtitle };
  const ic = icon(iconName, iconColor);
  if (ic) header.icon = ic;
  if (tags.length) {
    header.text_tag_list = tags.map((t) => ({
      tag: 'text_tag',
      text: { tag: 'plain_text', content: t.text },
      color: t.color || 'neutral',
    }));
  }
  return {
    schema: '2.0',
    config: { wide_screen_mode: true, update_multi: true },
    header,
    body: { elements },
  };
}

// 标准庆祝 ASCII（SPIRIT.md 第七节）：结局卡原地重写后展示，零资产、双端等宽对齐。
// 选型决策：不用 GIF —— 飞书卡片图片需预上传 img_key、不支持内联自动播放、原地更新会闪。
export const CELEBRATION = {
  trophy: ['  _______', ' |       |', ' | winner |', ' |_______|', '   |   |', '  _|   |_', ' (_______)'].join('\n'),
  fireworks: ['    .  . .  .', '     . \\|/ .', '  ————  •  ————', '     . /|\\ .', "    '  ' '  '"].join('\n'),
  sparkle: ['   *  .  *', '    . * .', '   * ˘ *', '  *  .  *'].join('\n'),
  cheer: [' * \\o/ *', ' *  |  *', ' * / \\ *'].join('\n'),
};

// 庆祝图案 markdown 元素（等宽代码块居中展示）
export function celebration(name = 'cheer') {
  return { tag: 'markdown', content: `\`\`\`\n${CELEBRATION[name] || CELEBRATION.cheer}\n\`\`\`` };
}

// 底部导航栏：所有玩法卡的最后一行，让用户不输入中文也能切换玩法。
// 导航按钮一律「发新卡」而不是原地换卡，避免误点打断进行中的游戏。
const NAV_ITEMS = [
  ['主页', 'nav_home'],
  ['答题', 'nav_quiz'],
  ['测试', 'nav_test'],
  ['猜词', 'nav_hang'],
  ['剧情', 'nav_story'],
];

export function navRow() {
  // flex_mode 'none'：5 个导航按钮强制一行等宽，手机端不换行错位（SPIRIT.md 第四节）
  return columnSet(
    NAV_ITEMS.map(([label, action]) => button(label, { a: action, p: {} }, 'text', { size: 'small' })),
    'none'
  );
}

// 给一组卡片元素追加导航栏（分隔线 + 导航行）
export function withNav(elements) {
  return [...elements, hr(), navRow()];
}

