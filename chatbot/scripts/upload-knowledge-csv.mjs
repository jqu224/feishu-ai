// 把仓库根 knowledge/ 下的 CSV 上传到飞书云文档指定文件夹，上传后列出文件夹内容核对。
// 用法：node --env-file-if-exists=.env scripts/upload-knowledge-csv.mjs
// 需要权限：drive:drive；目标文件夹需已对应用可见（上级目录共享即可）。
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as lark from '@larksuiteoapi/node-sdk';

const FOLDER_TOKEN = 'HlwSfYthplS0DYdKVgzc4ydfnMe';
const dir = fileURLToPath(new URL('../../knowledge/', import.meta.url));

const { FEISHU_APP_ID: appId, FEISHU_APP_SECRET: appSecret } = process.env;
if (!appId || !appSecret) {
  console.error('缺少 FEISHU_APP_ID / FEISHU_APP_SECRET，请在 chatbot/.env 里配置');
  process.exit(1);
}

const client = new lark.Client({ appId, appSecret, domain: lark.Domain.Feishu });

const files = readdirSync(dir).filter((f) => f.endsWith('.csv')).sort();
if (!files.length) {
  console.error('knowledge/ 下没有 CSV，先跑 node scripts/export-quiz-csv.mjs');
  process.exit(1);
}

let ok = 0;
for (const name of files) {
  const buf = readFileSync(dir + name);
  try {
    const res = await client.drive.v1.media.uploadAll({
      data: {
        file_name: name,
        parent_type: 'explorer',
        parent_node: FOLDER_TOKEN,
        size: String(buf.length),
        file: buf,
      },
    });
    const token = res?.data?.file_token ?? res?.file_token;
    if (res?.code && res.code !== 0) throw new Error(`${res.code} ${res.msg}`);
    console.log(`上传成功：${name} → file_token ${token}`);
    ok++;
  } catch (err) {
    console.error(`上传失败：${name}：${err?.message ?? err}`);
  }
}

// 核对：列出文件夹内容
try {
  const list = await client.request({
    method: 'GET',
    url: `https://open.feishu.cn/open-apis/drive/v1/files?folder_token=${FOLDER_TOKEN}&page_size=50&order_by=EditedTime&direction=DESC`,
  });
  const items = list?.data?.files ?? list?.files ?? [];
  console.log(`\n文件夹当前共 ${items.length} 个条目：`);
  for (const it of items) console.log(`- ${it.name}（${it.type}，${it.token}）`);
} catch (err) {
  console.error('\n列出文件夹内容失败：', err?.message ?? err);
}

console.log(`\n结果：${ok}/${files.length} 个 CSV 上传成功`);
process.exit(ok === files.length ? 0 : 1);
