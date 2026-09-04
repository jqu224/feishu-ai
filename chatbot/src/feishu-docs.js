// 把投票 / 报名汇总导出为表格（回答「代码怎么上传到飞书文档」并落地成功能）。
//
// 两条落地路径：
//   A. 在线表格：drive v1 import_tasks 把 CSV 导入云空间成在线 Excel（sheet）
//      1. POST /drive/v1/medias/upload_all 上传 CSV 源文件（parent_type=ccm_import_open）
//      2. POST /drive/v1/import_tasks    创建导入任务（csv -> sheet，挂载到云空间文件夹）
//      3. GET  /drive/v1/import_tasks/:ticket 轮询结果，拿到新表格 token / url
//      4. PATCH /drive/v1/permissions/:token/public 设为组织内可读（best effort）
//   B. CSV 群文件：上传为 im 文件消息直接发到会话，Excel / 飞书表格双击即开。
//      背景（2026-09-04 实测）：该租户 import_tasks 任务创建成功但立即失败
//      （job_status=2 且 job_error_msg 为空），md / txt / docx 全部同样失败，
//      判定为租户级限制；csv->sheet 大概率同样受限，因此 A 失败时自动降级 B。
//
// 权限：A 需要 `drive:drive`；B 需要 `im:resource`（文件上传）。
// 可选环境变量 FEISHU_FOLDER_TOKEN 指定挂载文件夹（不填则挂到应用云空间根目录）。
import { normalizeVote } from './actions/vote.js';

function now() {
  return new Date().toLocaleString('zh-CN', { hour12: false });
}

function safeFileName(name) {
  const cleaned = String(name || '汇总').replace(/[\\/:*?"<>|\r\n]+/g, '-').trim();
  return `${cleaned.slice(0, 40) || '汇总'}-汇总.csv`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// CSV 单元格转义：含逗号 / 引号 / 换行时整体加引号，引号双写
function csvCell(v) {
  const s = v == null || String(v).trim() === '' ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvLines(rows) {
  // BOM（\uFEFF）让 Excel 双击打开时按 UTF-8 解码，中文不乱码
  return `\uFEFF${rows.map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

// 投票结果 -> CSV 表格（元信息 + 票数统计表 + 结论）
export function voteCsv(v) {
  const nv = normalizeVote(v);
  const total = Object.values(nv.tally).reduce((a, b) => a + b, 0);
  const pct = (n) => (total ? `${Math.round((n / total) * 100)}%` : '0%');
  const rows = [
    ['投票结果', nv.q],
    ['状态', nv.closed ? '已结束' : '进行中'],
    ['总票数', total],
    ['选项数', nv.options.length],
    ['导出时间', now()],
    [],
    ['选项', '票数', '占比'],
    ...nv.options.map((o) => [o, nv.tally[o], pct(nv.tally[o])]),
  ];
  const max = Math.max(0, ...nv.options.map((o) => nv.tally[o]));
  if (max > 0) {
    const winners = nv.options.filter((o) => nv.tally[o] === max);
    rows.push([], ['结论', `领先选项：${winners.join('、')}（各 ${max} 票，共 ${total} 票参与）`]);
  } else {
    rows.push([], ['结论', '暂无人投票']);
  }
  return csvLines(rows);
}

// 报名汇总 -> CSV 表格（元信息 + 按人明细表）
export function formCsv(state = {}) {
  const title = String(state.title || '报名汇总').slice(0, 100);
  const fields = Array.isArray(state.fields) ? state.fields : [];
  const subs = Array.isArray(state.submissions) ? state.submissions : [];
  const rows = [
    ['报名汇总', title],
    ['状态', state.closed ? '已结束' : '进行中'],
    ['已提交', `${subs.length} 份`],
    ['导出时间', now()],
    [],
  ];
  if (subs.length && fields.length) {
    rows.push(['#', ...fields.map((f) => f.label), '提交时间']);
    subs.forEach((sub, i) => {
      const at = sub.at ? new Date(sub.at).toLocaleString('zh-CN', { hour12: false }) : '';
      rows.push([i + 1, ...fields.map((f) => sub.values?.[f.name] ?? ''), at]);
    });
  } else {
    rows.push(['暂无提交记录']);
  }
  return csvLines(rows);
}

// import_tasks 的 point.mount_key 必填；未配置 FEISHU_FOLDER_TOKEN 时取应用云空间根目录。
// SDK 未封装该接口（explorer/v2 老 API），走 Client 的通用 request。
async function rootFolderToken(client) {
  const r = await client.request({
    method: 'GET',
    url: 'https://open.feishu.cn/open-apis/drive/explorer/v2/root_folder/meta',
  });
  const token = r?.data?.token ?? r?.token;
  if (!token) throw new Error(`获取云空间根目录失败：${JSON.stringify(r).slice(0, 200)}`);
  return token;
}

// 汇总 .csv 作为群文件发送（im 文件消息），Excel / 飞书表格双击即开。
// 注意：必须传「普通对象 + Buffer」，不能传 spec FormData。
export async function sendCsvFile(client, chatId, csv, { fileName } = {}) {
  if (!client?.im) throw new Error('缺少可用的飞书 Client（channel.rawClient）');
  if (!chatId) throw new Error('缺少 chatId，无法发送文件');
  const buf = Buffer.from(csv, 'utf8');
  const up = await client.im.v1.file.create({
    data: {
      file_type: 'stream',
      file_name: fileName ?? safeFileName('汇总'),
      file: buf,
    },
  });
  const fileKey = up?.data?.file_key ?? up?.file_key;
  if (!fileKey) throw new Error(`上传群文件失败：${JSON.stringify(up).slice(0, 200)}`);
  await client.im.v1.message.create({
    params: { receive_id_type: 'chat_id' },
    data: {
      receive_id: chatId,
      msg_type: 'file',
      content: JSON.stringify({ file_key: fileKey }),
    },
  });
  return { fileKey, fileName: fileName ?? safeFileName('汇总') };
}

// CSV -> 云空间在线表格完整导入流程。client 传 SDK Client（channel.rawClient）。
// 轮询参数可注入便于测试；失败时抛错，由调用方降级为 CSV 群文件。
export async function exportSheetDoc(client, csv, {
  fileName,
  folderToken = process.env.FEISHU_FOLDER_TOKEN?.trim() || '',
  pollIntervalMs = 600,
  pollTimeoutMs = 30_000,
} = {}) {
  if (!client?.drive) throw new Error('缺少可用的飞书 Client（channel.rawClient）');

  // 1. 上传源文件。extra 声明导入目标类型，file_extension 必须与真实后缀严格一致（否则 1069910）。
  // 注意：必须传「普通对象 + Buffer」，不能传 spec FormData——SDK 走 axios 且手动写死
  // multipart 头，spec FormData 会被序列化成空 body（Content-Length: 0），报 1061002 params error。
  const up = await client.drive.v1.media.uploadAll({
    data: {
      file_name: fileName ?? safeFileName('汇总'),
      parent_type: 'ccm_import_open',
      size: String(Buffer.byteLength(csv, 'utf8')),
      extra: JSON.stringify({ obj_type: 'sheet', file_extension: 'csv' }),
      file: Buffer.from(csv, 'utf8'),
    },
  });
  const fileToken = up?.data?.file_token ?? up?.file_token;
  if (!fileToken) throw new Error(`上传源文件失败：${JSON.stringify(up).slice(0, 200)}`);

  // 2. 创建导入任务（mount_type=1 云空间）。
  // 两个必填坑（2026-09 实测）：type 字段必填（导入目标类型 sheet）；
  // point.mount_key 必填——未配置 FEISHU_FOLDER_TOKEN 时动态取应用云空间根目录 token。
  const mountKey = folderToken || (await rootFolderToken(client));
  const created = await client.drive.v1.importTask.create({
    data: {
      file_extension: 'csv',
      file_token: fileToken,
      type: 'sheet',
      point: { mount_type: 1, mount_key: mountKey },
    },
  });
  const ticket = created?.data?.ticket ?? created?.ticket;
  if (!ticket) throw new Error(`创建导入任务失败：${JSON.stringify(created).slice(0, 200)}`);

  // 3. 轮询（job_status：0 运行中 / 1 成功 / 2 失败；成功后 result 带 token/url）
  const deadline = Date.now() + pollTimeoutMs;
  for (;;) {
    const r = await client.drive.v1.importTask.get({ path: { ticket } });
    const result = r?.data?.result ?? r?.result;
    if (result?.token && result?.url) {
      // 4. 组织内可读，避免链接发到群里点开是「无权限」（best effort，失败不影响导出）
      try {
        await client.drive.v1.permissionPublic.patch({
          path: { token: result.token },
          params: { type: 'sheet' },
          data: { link_share_entity: 'tenant_readable' },
        });
      } catch (e) {
        console.warn('[export] 设置表格可见范围失败（不影响导出）：', e?.message ?? e);
      }
      return { token: result.token, url: result.url, type: result.type ?? 'sheet' };
    }
    if (result?.job_status === 2) {
      throw new Error(`导入任务失败：${JSON.stringify(result).slice(0, 200)}`);
    }
    if (Date.now() > deadline) throw new Error('导入超时：请稍后在云空间查看是否已生成');
    await sleep(pollIntervalMs);
  }
}
