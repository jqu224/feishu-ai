// 把 assets/icons/ 下的 PNG 上传到飞书，生成 icons.json（semantic -> img_key）。
// 用法：npm run icons:upload
//
// 这是「真 Lucide 图标」通道：飞书卡片不能内嵌 SVG，只能用已上传的 img_key。
// 准备资产：到 lucide.dev 把需要的图标导出为 PNG（建议 96px），按语义命名放进
// assets/icons/，例如 rock.png(grab)、scissors.png(scissors)、paper.png(hand)。
// 未上传的语义自动回落到 src/icons.js 里的飞书标准图标。
import { createReadStream, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as lark from '@larksuiteoapi/node-sdk';

const assetsDir = fileURLToPath(new URL('../assets/icons/', import.meta.url));
const outFile = fileURLToPath(new URL('../icons.json', import.meta.url));

const appId = process.env.FEISHU_APP_ID;
const appSecret = process.env.FEISHU_APP_SECRET;
if (!appId || !appSecret) {
  console.error('缺少 FEISHU_APP_ID / FEISHU_APP_SECRET（从 .env 读取），先配置再运行。');
  process.exit(1);
}
if (!existsSync(assetsDir)) {
  console.error(`未找到 ${assetsDir}。先在该目录放置 <semantic>.png，如 rock.png、scissors.png、paper.png。`);
  process.exit(1);
}

const client = new lark.Client({ appId, appSecret, domain: lark.Domain.Feishu });

const files = readdirSync(assetsDir).filter((f) => f.endsWith('.png'));
if (!files.length) {
  console.error(`${assetsDir} 下没有 PNG。`);
  process.exit(1);
}

const result = {};
for (const file of files) {
  const name = file.replace(/\.png$/, '');
  // SDK 图片上传走文件流；原生 FormData+Blob 会被服务端 400（code 234001）拒绝。
  // 返回体即数据本体：res.image_key（不是 res.data.image_key）
  const res = await client.im.v1.image.create({
    data: { image_type: 'message', image: createReadStream(`${assetsDir}${file}`) },
  });
  const imageKey = res?.image_key ?? res?.data?.image_key;
  if (!imageKey) {
    console.error(`上传失败：${file}`, res?.msg || res);
    process.exit(1);
  }
  result[name] = imageKey;
  console.log(`已上传 ${file} -> ${result[name]}`);
}

writeFileSync(outFile, `${JSON.stringify(result, null, 2)}\n`);
console.log(`\n已写入 ${outFile}，重启机器人后生效。`);
