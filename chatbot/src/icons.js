// 图标注册表：卡片内不使用 emoji，统一走飞书图标体系。
//
// 两层策略：
// 1. 默认：飞书卡片图标库的 standard_icon token（Lucide 风格的圆角线性图标，
//    官方图标库 https://open.feishu.cn/document/feishu-cards/enumerations-for-icons）。
// 2. 可选：项目根目录 icons.json 里维护 semantic -> img_key 映射（custom_icon）。
//    用 scripts/upload-icons.mjs 上传 Lucide PNG 资产后自动生成，例如：
//    { "rock": "img_v2_xxx", "scissors": "img_v2_yyy", "paper": "img_v2_zzz" }
//    （rock/scissors/paper 在飞书图标库中没有对应 token，只能走这层。）
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const STANDARD = {
  rock: null,
  scissors: null,
  paper: null,
  volleyball: null,
  coffee: null,
  pen: null,
  snowflake: null,
  wind: null, // 解压：Lucide wind（风/气息），走 custom_icon 上传层
  play: 'play_filled',
  reset: 'refresh_outlined',
  confirm: 'check_outlined',
  cancel: 'close_outlined',
  poll: 'poll_outlined',
  chart: 'insert-chart_outlined',
  form: 'todo_outlined',
  list: 'list-check_outlined',
  help: 'helpdesk_outlined',
  info: 'info_outlined',
  robot: 'robot_outlined',
  record: 'record_outlined',
  done: 'done_outlined',
  user: 'contacts_outlined',
  doc: 'file-text_outlined',
  export: 'download_outlined',
};

let custom = {};
try {
  custom = JSON.parse(readFileSync(fileURLToPath(new URL('../icons.json', import.meta.url)), 'utf8'));
} catch {
  // icons.json 是可选的，没有就走 standard_icon
}

// 生成图标节点；不支持该名称时返回 undefined（调用方直接省略 icon 字段）
export function icon(name, color) {
  if (!name) return undefined;
  const imgKey = typeof custom[name] === 'string' ? custom[name] : null;
  if (imgKey) return { tag: 'custom_icon', img_key: imgKey };
  const token = STANDARD[name];
  if (!token) return undefined;
  return color ? { tag: 'standard_icon', token, color } : { tag: 'standard_icon', token };
}

export const ICON_NAMES = Object.keys(STANDARD);
