// 导出全部卡片形态的 JSON 到 preview/ 目录。
// 用法：npm run preview
// 把生成的 JSON 粘贴到飞书卡片搭建工具（open.feishu.cn/cardkit）即可真机预览，
// 不需要启动机器人。
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildRpsCard } from '../src/actions/rps.js';
import { buildVoteCard } from '../src/actions/vote.js';
import { buildFormCard } from '../src/actions/form.js';
import { helpCard, infoCard } from '../src/bot.js';
import { confirmCard, exportingCard, exportedCard } from '../src/registry.js';
import { buildHomeCard } from '../src/actions/home.js';
import {
  getSet, balancedSeed, correctDisplayIndex, buildQuizHomeCard, buildQuestionCard, buildRevealCard, buildResultCard,
} from '../src/actions/quiz.js';
import { buildFactCard } from '../src/actions/fact.js';
import { getTest, buildTestHomeCard, buildTestQuestionCard, buildTestResultCard } from '../src/actions/test.js';
import { buildHangmanCard, newHangmanGame } from '../src/actions/hangman.js';
import { buildStoryHomeCard, buildStoryCard } from '../src/actions/story.js';
import { buildBallCard } from '../src/actions/ball.js';
import { buildRefreshCard } from '../src/actions/refresh.js';
import { buildCalmHomeCard, buildCalmStepCard } from '../src/actions/calm.js';
import { newSession, resetSessions } from '../src/store.js';

const outDir = fileURLToPath(new URL('../preview/', import.meta.url));
mkdirSync(outDir, { recursive: true });

resetSessions();
const voteSession = newSession({ kind: 'vote', q: '下午茶喝什么？', options: ['奶茶', '咖啡', '果茶'], tally: { 奶茶: 2, 咖啡: 1 }, closed: false, votes: 3 });
const formState = {
  title: '周五团建报名',
  fields: [
    { name: 'f1', label: '姓名', type: 'text', required: true },
    { name: 'f2', label: '能否参加', type: 'select', required: true, options: ['能', '不能'] },
    { name: 'f3', label: '忌口', type: 'text', required: false },
  ],
  submissions: [{ openId: 'u1', values: { f1: '张三', f2: '能', f3: '无' }, at: 0 }],
  closed: false,
};
const triviaSet = getSet('feishu-basics');
const triviaSeed = balancedSeed(triviaSet);
const mbti = getTest('mbti');
// 豆包工作 create_roster_form 的产物形态：100 人名单下拉 + 报名/不报名
const rosterState = {
  title: '全员大会报名',
  fields: [
    { name: 'f1', label: '姓名', type: 'select', required: true, options: Array.from({ length: 100 }, (_, i) => `成员${i + 1}`) },
    { name: 'f2', label: '能否参加', type: 'select', required: true, options: ['报名', '不报名'] },
  ],
  submissions: [],
  closed: false,
};

const cards = {
  'rps-idle': buildRpsCard(),
  'rps-after-move': buildRpsCard({ w: 3, l: 1, d: 2 }, { choice: 'rock', bot: 'scissors', result: 'win', text: '你赢了' }),
  'vote-open': buildVoteCard(voteSession, voteSession.id),
  'vote-closed': buildVoteCard({ ...voteSession, closed: true }, voteSession.id),
  'form-open': buildFormCard(formState, 's_preview'),
  'form-closed': buildFormCard({ ...formState, closed: true }, 's_preview'),
  'form-roster-100': buildFormCard(rosterState, 's_roster'),
  'help-on': helpCard(true),
  'help-off': helpCard(false),
  'info': infoCard({ kind: 'info', title: '版本发布通知', content: '**v2.0 已发布**\n\n本次更新：\n- 卡片视觉重构\n- 图标体系接入', buttons: [{ text: '查看详情', url: 'https://open.feishu.cn' }] }),
  'confirm': await confirmCard({ kind: 'publish_vote', sessionId: voteSession.id }),
  'export-confirm': await confirmCard({ kind: 'export_vote', sessionId: voteSession.id }),
  'exporting': exportingCard(voteSession),
  'exported': exportedCard(voteSession, { token: 'doctok', url: 'https://example.feishu.cn/docs/doctok', type: 'docx' }),
  'home': buildHomeCard(true),
  'quiz-home': buildQuizHomeCard(),
  'quiz-question': buildQuestionCard(triviaSet, triviaSeed, 0, 0),
  'quiz-reveal': buildRevealCard(triviaSet, triviaSeed, 0, correctDisplayIndex(triviaSet, triviaSeed, 0), 0),
  'quiz-result': buildResultCard(triviaSet, 8, triviaSeed),
  'fact': buildFactCard(5),
  'test-home': buildTestHomeCard(),
  'test-question': buildTestQuestionCard(mbti, 5, { E: 3 }),
  'test-result': buildTestResultCard(mbti, { E: 3, I: 0, S: 0, N: 3, T: 3, F: 0, J: 0, P: 3 }),
  'hangman-new': buildHangmanCard(newHangmanGame(11)),
  'story-home': buildStoryHomeCard(),
  'story-node': buildStoryCard('puppy', 'phone'),
  'story-ending': buildStoryCard('puppy', 'end_heart'),
  'ball': buildBallCard(0),
  'ball-42': buildBallCard(42),
  'refresh': buildRefreshCard(),
  'calm-home': buildCalmHomeCard(),
  'calm-box': buildCalmStepCard('box', 1),
  'calm-ground': buildCalmStepCard('ground', 3),
  'calm-done': buildCalmStepCard('mindful', 7),
};

for (const [name, cardJson] of Object.entries(cards)) {
  const file = `${outDir}${name}.json`;
  writeFileSync(file, `${JSON.stringify(cardJson, null, 2)}\n`);
  console.log(`写出 ${file}`);
}
console.log('\n把 JSON 粘贴到飞书卡片搭建工具预览：https://open.feishu.cn/cardkit');
