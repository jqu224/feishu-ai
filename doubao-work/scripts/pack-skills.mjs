#!/usr/bin/env node
// 技能打包：校验 skills/ 下每个技能的 SKILL.md（frontmatter 完整性、description 长度），
// 然后打成 zip 放进 dist/，供豆包工作个人端「导入本地技能文件」与企业端 Skill Packages 上传。
// 零依赖：zip 用 store（只打包不压缩）实现——技能包都是文本，体积无所谓，省掉外部依赖。
//
// 用法：npm run pack:skills                    # 打包全部技能
//       npm run pack:skills -- xiaolong-card   # 只打包指定技能
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = path.join(ROOT, 'skills');
const DIST_DIR = path.join(ROOT, 'dist');
const MAX_DESCRIPTION = 1024; // Agent Skills 标准：description ≤1024 字符

export function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return null;
  const fields = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (kv) fields[kv[1]] = kv[2].trim();
  }
  return fields;
}

export function validateSkill(name, frontmatter) {
  const errors = [];
  if (!frontmatter) {
    return ['缺少 YAML frontmatter（必须以 --- 开头并含 name/description）'];
  }
  if (!frontmatter.name) errors.push('frontmatter 缺少 name');
  else if (frontmatter.name !== name) errors.push(`frontmatter name(${frontmatter.name}) 与目录名(${name})不一致`);
  if (!frontmatter.description) errors.push('frontmatter 缺少 description');
  else if (frontmatter.description.length > MAX_DESCRIPTION) {
    errors.push(`description ${frontmatter.description.length} 字符，超过上限 ${MAX_DESCRIPTION}`);
  }
  return errors;
}

async function collectFiles(dir, base = dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await collectFiles(full, base)));
    else out.push(path.relative(base, full));
  }
  return out.sort();
}

// ---- store-only zip ----
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function buildZip(entries) {
  const now = new Date();
  const time = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
  const date = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // 文件名 UTF-8
    local.writeUInt16LE(0, 8); // store，不压缩
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += local.length + nameBuf.length + data.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}

export async function packSkill(skillDir, outDir = DIST_DIR) {
  const name = path.basename(skillDir);
  const text = await readFile(path.join(skillDir, 'SKILL.md'), 'utf8');
  const errors = validateSkill(name, parseFrontmatter(text));
  if (errors.length) throw new Error(`${name} 校验失败：${errors.join('；')}`);

  const files = await collectFiles(skillDir);
  if (!files.includes('SKILL.md')) throw new Error(`${name}：目录里缺 SKILL.md`);
  const entries = [];
  for (const file of files) {
    entries.push({ name: file.split(path.sep).join('/'), data: await readFile(path.join(skillDir, file)) });
  }
  await mkdir(outDir, { recursive: true });
  const zipPath = path.join(outDir, `${name}.zip`);
  const buf = buildZip(entries);
  await writeFile(zipPath, buf);
  return { zipPath, fileCount: files.length, size: buf.length };
}

async function main() {
  const only = process.argv.slice(2);
  const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
  const skillDirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.')).map((e) => e.name);
  const targets = only.length ? skillDirs.filter((d) => only.includes(d)) : skillDirs;
  if (!targets.length) {
    console.error(`未找到要打包的技能（可用：${skillDirs.join(', ') || '无'}）`);
    process.exit(1);
  }
  let ok = 0;
  for (const name of targets) {
    try {
      const { zipPath, fileCount, size } = await packSkill(path.join(SKILLS_DIR, name));
      console.log(`✔ ${name} → ${path.relative(ROOT, zipPath)}（${fileCount} 个文件，${(size / 1024).toFixed(1)} KB）`);
      ok += 1;
    } catch (err) {
      console.error(`✘ ${err.message}`);
    }
  }
  console.log(`打包完成：${ok}/${targets.length}`);
  if (ok !== targets.length) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
