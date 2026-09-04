// 玩法中心主页：默认回复与「主页」导航的落点。
// 所有玩法从这里一键进入，用户全程不需要输入中文。
import { card, button, columnSet, textLine, hr } from '../cards.js';

export function buildHomeCard(aiEnabled = true) {
  const hint = aiEnabled
    ? '也可以直接说需求，例如：「发起一个下午茶投票：奶茶 / 咖啡 / 果茶」。'
    : '配置 AI_API_KEY 后，还能听懂自然语言，生成投票或信息卡片。';
  return card({
    template: 'indigo',
    icon: 'robot',
    iconColor: 'indigo',
    title: 'AGUI 卡片机器人',
    subtitle: '对话即界面，卡片里完成操作',
    tags: [{ text: aiEnabled ? 'AI 已接入' : 'AI 未接入', color: aiEnabled ? 'indigo' : 'neutral' }],
    elements: [
      textLine('豆包答题 · onboarding 必备', { icon: 'list', iconColor: 'indigo' }),
      textLine('职场测试 · MBTI / DISC / SBTI 沙雕版 / 职场摸鱼指数', { icon: 'form', iconColor: 'indigo' }),
      textLine('猜单词 · 国际化能力培训', { icon: 'help', iconColor: 'indigo' }),
      textLine('互动剧情 · 职场分歧模拟', { icon: 'pen', iconColor: 'indigo' }),
      textLine('猜拳 · Team building 职场破冰，同事感情培养', { icon: 'rock', iconColor: 'indigo' }),
      textLine('提神活动 · 牛马充电站', { icon: 'coffee', iconColor: 'indigo' }),
      textLine('解压 · 呼吸 / 54321 / 冥想，点一下跟着做', { icon: 'wind', iconColor: 'indigo' }),
      hr(),
      // 用户要求：每个按钮都带前缀图标，与上方导览 textLine 同款语义一一对应
      columnSet([
        button('豆包答题', { a: 'quiz_home', p: {} }, 'primary', { icon: 'list', width: 'fill' }),
        button('职场测试', { a: 'test_home', p: {} }, 'default', { icon: 'form', width: 'fill' }),
      ]),
      columnSet([
        button('猜单词', { a: 'hang_new', p: {} }, 'default', { icon: 'help', width: 'fill' }),
        button('互动剧情', { a: 'story_home', p: {} }, 'default', { icon: 'pen', width: 'fill' }),
      ]),
      columnSet([
        button('变形球', { a: 'ball', p: { f: 0 } }, 'default', { icon: 'volleyball', width: 'fill' }),
        button('提神活动', { a: 'refresh', p: {} }, 'default', { icon: 'coffee', width: 'fill' }),
      ]),
      columnSet([
        button('抽条冷知识', { a: 'fact', p: {} }, 'default', { icon: 'snowflake', width: 'fill' }),
        button('来一局猜拳', { a: 'help_rps', p: {} }, 'default', { icon: 'rock', width: 'fill' }),
      ]),
      // 第 9 个入口：2×4 已满，解压整行通栏（单列 columnSet 即占满两个位置）
      columnSet([button('解压放松', { a: 'calm_home', p: {} }, 'default', { icon: 'wind', width: 'fill' })]),
      hr(),
      textLine(hint, { size: 'notation', color: 'grey' }),
    ],
  });
}
