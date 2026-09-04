// 豆包答题题库。answer 是 options 里的原始下标；展示顺序由每局 seed 派生的
// 排列决定（见 rng.js permutation），所以数据里答案在哪个下标都会被乱序。
// 题库按内容域拆成四个文件：行业背景 / 飞书产品 / AI 工具与 Agent 架构 / 互联网主题（演示小题量）。
import { SETS as INDUSTRY_SETS } from './trivia-industry.js';
import { SETS as FEISHU_SETS } from './trivia-feishu.js';
import { SETS as AI_SETS } from './trivia-ai.js';
import { SETS as INTERNET_SETS } from './trivia-internet.js';

export const TRIVIA_SETS = [...FEISHU_SETS, ...AI_SETS, ...INDUSTRY_SETS, ...INTERNET_SETS];
