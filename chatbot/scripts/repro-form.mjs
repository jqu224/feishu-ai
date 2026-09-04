// 端到端复现：否定选项录入 / 姓名兜底 / 结束并汇总 / 导出为文档 / 过期卡。
// 用法：node scripts/repro-form.mjs
import { handleAction } from '../src/registry.js';
import { newSession, getSession, resetSessions } from '../src/store.js';

resetSessions();
const sends = [];
const channel = {
  send: async (chatId, input) => sends.push(input),
  updateCard: async () => {},
  rawClient: null, // 导出后台任务会失败（无真实 client），但 ACK 应立即返回导出中卡
};
const mkEvt = (value, formValue, name = '小唐') => ({
  messageId: 'om_x', chatId: 'oc_x',
  operator: { openId: 'u1', name },
  action: { value, form_value: formValue },
  raw: { action: { form_value: formValue }, operator: { open_id: 'u1', name } },
});
const texts = (node, acc = []) => {
  if (Array.isArray(node)) { node.forEach((n) => texts(n, acc)); return acc; }
  if (!node || typeof node !== 'object') return acc;
  if (typeof node.content === 'string') acc.push(node.content);
  for (const v of Object.values(node)) if (v && typeof v === 'object') texts(v, acc);
  return acc;
};
const show = (label, c) =>
  console.log(`${label}`, c ? `→ 换卡「${c.header?.title?.content}」` : '→ 无响应！', c ? `| 文本: ${texts(c).join(' / ').slice(0, 120)}` : '');

const session = newSession({
  kind: 'form', title: '团建报名',
  fields: [
    { name: 'f1', label: '姓名', type: 'text', required: false },
    { name: 'f2', label: '能否参加', type: 'select', required: true, options: ['能', '不能'] },
    { name: 'f3', label: '忌口', type: 'text', required: false },
    { name: 'f4', label: '是否带家属', type: 'select', required: false, options: ['是', '否'] },
  ],
  submissions: [], closed: false,
});
const sid = session.id;

console.log('== 1. 选「不能 / 否」提交（姓名留空，应录入否定值并兜底姓名）');
show('form_submit', await handleAction(channel, mkEvt({ a: 'form_submit', p: { sessionId: sid } }, { f1: '', f2: '不能', f3: '', f4: '否' })));
const rec = getSession(sid)?.submissions?.[0];
console.log('   记录内容：', JSON.stringify(rec?.values), '| openId:', rec?.openId);

console.log('== 2. 结束并汇总 → 确认卡 → 确认执行 → 关闭 + 发文字汇总');
show('form_close ', await handleAction(channel, mkEvt({ a: 'form_close', p: { sessionId: sid } })));
show('confirm_exec', await handleAction(channel, mkEvt({ a: 'confirm_exec', p: { kind: 'publish_form', sessionId: sid } })));
console.log('   文字汇总已发：', sends.length ? JSON.stringify(sends.at(-1)).slice(0, 150) : '无！');

console.log('== 3. 导出为文档 → 确认卡 → 确认执行 → 导出中卡（后台任务无 client 会容错）');
show('export     ', await handleAction(channel, mkEvt({ a: 'export', p: { kind: 'export_form', sessionId: sid } })));
show('confirm_exec', await handleAction(channel, mkEvt({ a: 'confirm_exec', p: { kind: 'export_form', sessionId: sid } })));

console.log('== 4. 会话丢失（重启后点旧卡）→ 过期提示卡');
show('form_close ', await handleAction(channel, mkEvt({ a: 'form_close', p: { sessionId: 's_ghost' } })));
