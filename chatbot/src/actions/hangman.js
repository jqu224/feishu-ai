// 猜单词（hangman）：CET 词汇，26 字母键盘，6 次机会。
// 状态 {w: 词下标, g: 已猜字母位掩码, x: 答错次数} 随按钮 value 往返，
// 重复点击同一个字母幂等不扣分。
import { card, markdown, button, columnSet, textLine, statRow, withNav, celebration } from '../cards.js';
import { WORDS } from '../data/words.js';
import { mulberry32, randomSeed } from '../rng.js';

export const MAX_WRONG = 6;
// 键盘按 7/7/7/5 分行：原来 9/9/8 在手机窄屏上会被挤压换行错位
const KEY_ROWS = ['ABCDEFG', 'HIJKLMN', 'OPQRSTU', 'VWXYZ'];

// SPIRIT.md（菜单子吊死鬼模式）：结局必须给 ASCII 图案 + 战绩，正能量即时反馈
const HANGMAN_ART = ['  +---+', '  |   |', '  O   |', ' /|\\  |', ' / \\  |', '      |', '========='].join('\n');

// 战绩：答对 = 命中字母数，答错 = x，正确率 = 答对 / 总猜测
function gameStats(state) {
  const word = wordOf(state);
  const correct = [...new Set(word)].filter((ch) => state.g & bitOf(ch)).length;
  const wrong = state.x;
  const total = correct + wrong;
  return { correct, wrong, acc: total ? Math.round((correct / total) * 100) : 100 };
}

export function newHangmanGame(seed = randomSeed()) {
  const rand = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  return { w: Math.floor(rand() * WORDS.length), g: 0, x: 0 };
}

export function wordOf(state) {
  return WORDS[state.w].w.toUpperCase();
}

function bitOf(letter) {
  return 1 << (letter.charCodeAt(0) - 65);
}

export function applyGuess(state, letter) {
  const l = String(letter || '').toUpperCase();
  if (!/^[A-Z]$/.test(l)) return { state, invalid: true };
  const word = wordOf(state);
  if (state.g & bitOf(l)) return { state, repeat: true };
  const g = state.g | bitOf(l);
  const hit = word.includes(l);
  const x = state.x + (hit ? 0 : 1);
  const next = { ...state, g, x };
  return {
    state: next,
    hit,
    won: [...word].every((ch) => g & bitOf(ch)),
    lost: x >= MAX_WRONG,
  };
}

export function maskWord(state) {
  return [...wordOf(state)].map((ch) => (state.g & bitOf(ch) ? ch : '_')).join(' ');
}

// 回调入口：状态不合法（脏 value / 词库变更）时直接开新局兜底
export function playTurn(state, letter) {
  const safe = WORDS[state?.w] && Number.isInteger(state.g) && Number.isInteger(state.x) ? state : newHangmanGame();
  return buildHangmanCard(applyGuess(safe, letter).state);
}

function keyboardElements(state) {
  return KEY_ROWS.map((row) =>
    columnSet(
      [...row].map((letter) => {
        const guessed = (state.g & bitOf(letter)) !== 0;
        if (!guessed) {
          return button(letter, { a: 'hang', p: { ...state, l: letter } }, 'default', { size: 'small' });
        }
        // 已猜字母用同尺寸按钮占位：行高一致，手机端不错位；
        // 命中标 primary、猜错标 danger；回调保留但重复猜测幂等不扣分（见 applyGuess）
        return button(letter, { a: 'hang', p: { ...state, l: letter } }, wordOf(state).includes(letter) ? 'primary' : 'danger', { size: 'small' });
      }),
      'none' // 强制一行不换行，列等宽收缩
    )
  );
}

function wrongLetters(state) {
  const wrongs = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].filter(
    (l) => (state.g & bitOf(l)) !== 0 && !wordOf(state).includes(l)
  );
  if (!wrongs.length) return null;
  return markdown(`已猜错：${wrongs.map((l) => `~~${l}~~`).join(' ')}`);
}

export function buildHangmanCard(state) {
  const word = wordOf(state);
  const entry = WORDS[state.w];
  const won = [...word].every((ch) => state.g & bitOf(ch));
  const lost = !won && state.x >= MAX_WRONG;

  if (won || lost) {
    const { correct, wrong, acc } = gameStats(state);
    // 文字行不带 icon：header 已是同款 done/cancel，同卡 icon 不重复
    const elements = [
      textLine(won ? `答案是 **${word}**（${entry.h}），太强了。` : `答案是 **${word}**（${entry.h}），下次紫腚行！`, {
        color: won ? 'green' : 'red',
      }),
    ];
    if (won) {
      elements.push(
        statRow([
          { label: '答对', value: `${correct} 次`, tone: 'grey-50', color: 'green' },
          { label: '答错', value: `${wrong} 次`, tone: 'grey-50', color: wrong ? 'orange' : 'default' },
          { label: '正确率', value: `${acc}%`, tone: 'grey-50', color: 'default' },
        ]),
        celebration('cheer'),
        markdown('**漂亮！继续保持这个手感～**')
      );
    } else {
      elements.push(markdown(`\`\`\`\n${HANGMAN_ART}\n\`\`\``));
    }
    elements.push(columnSet([button('再来一局', { a: 'hang_new', p: {} }, 'primary', { icon: 'reset' })]));

    return card({
      template: won ? 'green' : 'orange',
      icon: won ? 'done' : 'cancel',
      iconColor: won ? 'green' : 'orange',
      title: '猜单词',
      subtitle: won ? '猜对了' : '机会用完',
      tags: [{ text: `${entry.h}`, color: 'neutral' }],
      elements: withNav(elements),
    });
  }

  const elements = [
    markdown(`**\`${maskWord(state)}\`**`),
    textLine(`提示：${entry.h}`, { icon: 'info', iconColor: 'grey', color: 'grey', size: 'notation' }),
    statRow([
      { label: '剩余机会', value: `${MAX_WRONG - state.x} / ${MAX_WRONG}`, tone: 'grey-50', color: state.x >= 4 ? 'red' : 'default' },
    ]),
  ];
  const wrong = wrongLetters(state);
  if (wrong) elements.push(wrong);
  elements.push(...keyboardElements(state));

  return card({
    template: 'green',
    icon: 'record',
    iconColor: 'green',
    title: '猜单词',
    subtitle: '点击字母猜词，猜错 6 次判负',
    tags: [{ text: `CET 词汇 · ${word.length} 个字母`, color: 'green' }],
    elements: withNav(elements),
  });
}
