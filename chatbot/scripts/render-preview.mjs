// 本地近似渲染：把 preview/*.json 渲染成 HTML 便于肉眼检查排版层级。
// 只是近似（字体/组件细节以飞书真机为准），用于验证信息层级与色彩纪律。
// 用法：node scripts/render-preview.mjs && 打开 preview/render.html
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../preview/', import.meta.url));
const only = process.argv.slice(2);
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .filter((f) => !only.length || only.some((o) => f.startsWith(o)));

const TEMPLATE_BG = {
  turquoise: '#e6f7f5', indigo: '#eef0fd', blue: '#eaf3fe', violet: '#f3effd',
  orange: '#fdf1e6', grey: '#f2f3f5', green: '#e9f7ec', red: '#fdeceb', default: '#f2f3f5',
};
const TEMPLATE_FG = {
  turquoise: '#0d8a7d', indigo: '#4954c9', blue: '#2962d9', violet: '#7a5af8',
  orange: '#d97108', grey: '#646a73', green: '#2b8a3e', red: '#d83931', default: '#1f2329',
};
const TEXT_COLORS = {
  default: '#1f2329', grey: '#8f959e', turquoise: '#0d8a7d', green: '#2b8a3e',
  red: '#d83931', blue: '#2962d9', indigo: '#4954c9', orange: '#d97108', carmine: '#d83931', violet: '#7a5af8',
};
const TAG_COLORS = {
  neutral: ['#eff0f1', '#646a73'], turquoise: ['#dcf3f0', '#0d8a7d'], indigo: ['#e3e6fa', '#4954c9'],
  blue: ['#e0eaff', '#2962d9'], green: ['#dcf2e3', '#2b8a3e'], carmine: ['#fbe2e1', '#d83931'],
};
const SIZES = { 'heading-2': '24px', 'heading-3': '20px', normal: '14px', notation: '12px', small: '13px' };

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function md(content) {
  let h = esc(content);
  h = h.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  h = h.replace(/<text_tag color='(\w+)'> (.+?) <\/text_tag>/g, (m, c, t) => {
    const [bg, fg] = TAG_COLORS[c] || TAG_COLORS.neutral;
    return `<span class="chip" style="background:${bg};color:${fg}">${esc(t)}</span>`;
  });
  return h.replace(/\n/g, '<br>');
}

function renderEl(el) {
  if (!el) return '';
  switch (el.tag) {
    case 'markdown':
      return `<div class="md">${md(el.content)}</div>`;
    case 'hr':
      return '<div class="hr"></div>';
    case 'div': {
      const t = el.text || {};
      const size = SIZES[t.text_size] || '14px';
      const color = TEXT_COLORS[t.text_color] || '#1f2329';
      const align = t.text_align || 'left';
      const icon = el.icon ? `<span class="ic"></span>` : '';
      return `<div class="line" style="font-size:${size};color:${color};text-align:${align}">${icon}${esc(t.content || '')}</div>`;
    }
    case 'button': {
      const t = el.text?.content || '';
      const cls = el.type === 'primary' ? 'btn primary' : el.type === 'danger_text' ? 'btn danger-text' : el.type === 'text' ? 'btn text' : 'btn';
      const w = el.width === 'fill' ? 'width:100%' : '';
      return `<button class="${cls}" style="${w}">${esc(t)}</button>`;
    }
    case 'column_set': {
      const cols = (el.columns || [])
        .map((c) => {
          const w = c.weight || 1;
          const va = c.vertical_align === 'center' ? 'align-items:center' : '';
          const bg = c.background_style ? `background:#f7f8fa;border-radius:8px;` : '';
          const pad = c.padding ? `padding:${c.padding};` : 'padding:4px;';
          return `<div class="col" style="flex:${w};${va}${bg}${pad}">${(c.elements || []).map(renderEl).join('')}</div>`;
        })
        .join('');
      return `<div class="colset">${cols}</div>`;
    }
    case 'form':
      return `<div class="form">${(el.elements || []).map(renderEl).join('')}</div>`;
    case 'input':
      return `<div class="fake-input">${esc(el.placeholder?.content || '')}</div>`;
    case 'select_static':
      return `<div class="fake-input">${esc(el.placeholder?.content || '请选择')} ▾</div>`;
    default:
      return `<div class="md" style="color:#bbb">[${esc(el.tag)}]</div>`;
  }
}

function renderCard(name, c) {
  const bg = TEMPLATE_BG[c.header?.template] || '#f2f3f5';
  const fg = TEMPLATE_FG[c.header?.template] || '#1f2329';
  const tags = (c.header?.text_tag_list || [])
    .map((t) => {
      const [b, f] = TAG_COLORS[t.color] || TAG_COLORS.neutral;
      return `<span class="chip" style="background:${b};color:${f}">${esc(t.text?.content || '')}</span>`;
    })
    .join('');
  const iconHtml = c.header?.icon ? '<span class="h-ic"></span>' : '';
  const sub = c.header?.subtitle?.content ? `<div class="h-sub">${esc(c.header.subtitle.content)}</div>` : '';
  return `
  <section class="card-wrap">
    <div class="card-name">${esc(name)}</div>
    <div class="card">
      <div class="reply">Reply to tqqq: …</div>
      <div class="header" style="background:${bg}">
        ${iconHtml}
        <span class="h-title" style="color:${fg}">${esc(c.header?.title?.content || '')}</span>
        ${tags}
        ${sub}
      </div>
      <div class="body">${(c.body?.elements || []).map(renderEl).join('')}</div>
    </div>
  </section>`;
}

const cards = files.map((f) => [f.replace(/\.json$/, ''), JSON.parse(readFileSync(dir + f, 'utf8'))]);

const html = `<!doctype html>
<html lang="zh"><head><meta charset="utf-8"><title>卡片近似预览</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  body { font-family: -apple-system, "PingFang SC", "Helvetica Neue", sans-serif; background: #e9ebee; padding: 32px; }
  .grid { display: flex; flex-wrap: wrap; gap: 28px; align-items: flex-start; }
  .card-wrap { width: 420px; }
  .card-name { font-size: 12px; color: #8f959e; margin-bottom: 6px; font-family: monospace; }
  .card { background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.12); }
  .reply { font-size: 13px; color: #8f959e; padding: 10px 16px 0; border-left: 2px solid #dee0e3; margin: 8px 0 0 16px; padding-left: 8px; }
  .header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 14px 16px; margin-top: 10px; }
  .h-title { font-size: 16px; font-weight: 600; }
  .h-sub { width: 100%; font-size: 14px; color: #1f2329; margin-top: 2px; }
  .h-ic { width: 18px; height: 18px; border-radius: 4px; background: currentColor; opacity: .35; display: inline-block; }
  .chip { font-size: 12px; padding: 2px 8px; border-radius: 4px; }
  .body { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
  .md { font-size: 14px; color: #1f2329; line-height: 1.6; }
  .hr { border-top: 1px solid #eff0f1; margin: 2px 0; }
  .line { line-height: 1.5; }
  .ic { display: inline-block; width: 14px; height: 14px; background: currentColor; opacity: .3; border-radius: 3px; margin-right: 6px; vertical-align: -2px; }
  .btn { border: 1px solid #dee0e3; background: #fff; border-radius: 6px; padding: 8px 12px; font-size: 14px; color: #1f2329; cursor: default; }
  .btn.primary { background: #3370ff; border-color: #3370ff; color: #fff; }
  .btn.text { border-color: transparent; color: #3370ff; }
  .btn.danger-text { border-color: transparent; color: #f54a45; }
  .colset { display: flex; gap: 8px; }
  .col { display: flex; flex-direction: column; gap: 4px; justify-content: center; min-width: 0; }
  .col .btn { width: 100%; }
  .form { display: flex; flex-direction: column; gap: 10px; }
  .fake-input { border: 1px solid #dee0e3; border-radius: 6px; padding: 8px 12px; font-size: 14px; color: #bbbfc4; }
</style></head>
<body><div class="grid">${cards.map(([n, c]) => renderCard(n, c)).join('')}</div></body></html>`;

const out = dir + 'render.html';
writeFileSync(out, html);
console.log(`渲染 ${cards.length} 张卡片 → ${out}`);
