// 预制互动剧情：分支对话树。node 结构：
//   scene: 旁白/场景描述（可选）
//   lines: [[说话人, 台词], ...]（可选）
//   choices: [{ t: 选项文案, next: 下一节点 id, tone: 'pos'|'neu'|'neg' }]（非结局节点必有，恰好 3 个选项且三色调各占一个）
//   ending: true + title: 结局名（结局节点，无 choices）
import { STORIES_FUNNY_A } from './stories-funny-a.js';
import { STORIES_FUNNY_B } from './stories-funny-b.js';

const BASE_STORIES = [
  {
    id: 'puppy',
    title: '年下奶狗的深夜来电',
    desc: '深夜 11:47，手机突然响起……',
    nodes: {
      start: {
        scene: '深夜 11:47，你刚洗完澡，手机震了起来。屏幕上跳动着一个备注：「小狗（不许删）」。',
        choices: [
          { t: '接起来', next: 'phone', tone: 'pos' },
          { t: '先吹头发，让他等着', next: 'ignore', tone: 'neu' },
          { t: '假装没看见', next: 'ignore', tone: 'neg' },
        ],
      },
      phone: {
        scene: '你按下接听，那头的声音立刻亮了起来。',
        lines: [
          ['他', '姐，睡了吗？'],
          ['你', '都快十二点了，你怎么还不睡？'],
          ['他', '睡不着，就想听听你声音。'],
          ['旁白', '电话那头传来窸窸窣窣拆外卖袋的声音。'],
        ],
        choices: [
          { t: '「等等，你在偷吃什么？」', next: 'care', tone: 'neu' },
          { t: '「你是不是又没吃晚饭？」', next: 'care', tone: 'pos' },
          { t: '「少贫嘴，快去睡觉」', next: 'tease', tone: 'neg' },
        ],
      },
      care: {
        lines: [
          ['他', '嘿嘿，被发现了。给你也点了一份粥，这会儿应该快到了。'],
          ['你', '？你怎么知道我没吃晚饭。'],
          ['他', '你加班到几点，我都有数。'],
          ['旁白', '话音刚落，门铃响了。'],
        ],
        choices: [
          { t: '去开门', next: 'door', tone: 'pos' },
          { t: '「多少钱？我转你」', next: 'sleep', tone: 'neu' },
          { t: '「放门口吧，我准备睡了」', next: 'sleep', tone: 'neg' },
        ],
      },
      tease: {
        lines: [
          ['他', '遵命！那我挂了？'],
          ['你', '？'],
          ['他', '骗你的，才舍不得挂。姐，周五我生日，别人我都推掉了。'],
          ['旁白', '虽然隔着电话，你也感觉到了他的耳朵正在变红。'],
        ],
        choices: [
          { t: '「好，我一定到」', next: 'birth', tone: 'pos' },
          { t: '「送你个礼物打发行不行」', next: 'gift', tone: 'neu' },
          { t: '「不去，人多我社恐」', next: 'end_wronged', tone: 'neg' },
        ],
      },
      ignore: {
        scene: '你把手机扣在桌上。三秒后，消息一条接一条地弹出来。',
        lines: [
          ['小狗', '在吗'],
          ['小狗', '姐？'],
          ['小狗', '我知道你在看手机，你朋友圈三十秒前刚更新。'],
          ['旁白', '电话又响了，屏幕固执地亮着。'],
        ],
        choices: [
          { t: '认命，接起来', next: 'phone', tone: 'pos' },
          { t: '回个表情包，继续装死', next: 'sticker', tone: 'neu' },
          { t: '关机睡觉（狠人）', next: 'end_iron', tone: 'neg' },
        ],
      },
      sticker: {
        scene: '你回了一个「已睡，勿 cue」的表情包，把手机扣回桌上。',
        lines: [
          ['小狗', '睡了的人不会秒回。'],
          ['小狗', '姐！三分钟！就三分钟！'],
          ['旁白', '电话再次响起。这次他还发来一张照片：你家楼下的路灯，和一个拎着保温袋的影子。'],
        ],
        choices: [
          { t: '「楼下冷，快回家」', next: 'end_porridge', tone: 'neu' },
          { t: '破防了，接起来', next: 'phone', tone: 'pos' },
          { t: '静音，睡觉', next: 'end_iron', tone: 'neg' },
        ],
      },
      door: {
        scene: '门口放着一碗还冒热气的皮蛋瘦肉粥，袋子上贴着便利贴：「趁热喝。喝完才准想我。——你的小狗」。',
        lines: [
          ['旁白', '你拍了张照片发给他。'],
          ['他', '拍得好看，粥更好喝。'],
        ],
        choices: [
          { t: '「要不要上来坐坐」', next: 'end_heart', tone: 'pos' },
          { t: '「早点回家，路上小心」', next: 'end_porridge', tone: 'neu' },
          { t: '「粥我收了，你回吧」', next: 'end_wronged', tone: 'neg' },
        ],
      },
      sleep: {
        lines: [
          ['他', '那挂啦？晚安。'],
          ['你', '嗯，晚安。'],
          ['他', '等一下——今天也辛苦了。'],
          ['旁白', '挂断后，消息又弹了出来：「其实粥是两份，另一份在我手里。你要是反悔，我十分钟就到。」'],
        ],
        choices: [
          { t: '「到楼下了说一声」', next: 'end_porridge', tone: 'neu' },
          { t: '「反悔了，上来」', next: 'end_heart', tone: 'pos' },
          { t: '已读不回，睡个好觉', next: 'end_msg', tone: 'neg' },
        ],
      },
      birth: {
        scene: '周五傍晚，你推开包间门，满屋子人齐刷刷看向你。他腾地站起来，耳朵通红。',
        lines: [
          ['他', '他们、他们非要来的……'],
          ['朋友', '他非说最重要的人还没到，蛋糕都不让切！'],
        ],
        choices: [
          { t: '「哦？最重要的人？」', next: 'end_shy', tone: 'neu' },
          { t: '「那我来了，切蛋糕吧」', next: 'end_birthday', tone: 'pos' },
          { t: '（社恐发作，想溜）', next: 'end_shy', tone: 'neg' },
        ],
      },
      gift: {
        lines: [
          ['他', '礼物啊……那我想要一个别的。'],
          ['你', '说。'],
          ['他', '周五那天，你来接我放学吧。就一次。'],
        ],
        choices: [
          { t: '「多大的人了，还要接放学」', next: 'end_wronged', tone: 'neg' },
          { t: '「行，我接你」', next: 'end_school', tone: 'pos' },
          { t: '「先叫声好听的，再考虑」', next: 'end_school', tone: 'neu' },
        ],
      },
      end_iron: {
        ending: true,
        title: '铁石心肠',
        scene: '第二天早上，工位上出现了一份还温热的早餐，旁边贴着便利贴：「昨晚梦到你接我电话了，也挺好的。」',
        lines: [['旁白', '你狠心了一整晚，好像也没有赢。']],
      },
      end_porridge: {
        ending: true,
        title: '粥的温度',
        scene: '他在楼下站到你房间的灯亮起才离开。你从窗口看下去，那个影子朝你的方向挥了挥手。',
        lines: [['旁白', '有些喜欢，是连晚安都要亲眼确认的。']],
      },
      end_msg: {
        ending: true,
        title: '各自晚安',
        scene: '第二天你收到一张照片：两份粥，一份没动。「替你喝了，是甜的。」他没提昨晚的事，只说今晚再讲一个睡前故事。',
        lines: [['旁白', '有些晚安没说出口，就存到第二天再说。']],
      },
      end_heart: {
        ending: true,
        title: '夜宵与心动',
        scene: '十分钟后，门铃响了。他站在门口，头发上还沾着夜里的雾气，手里真的拎着两份粥。',
        lines: [
          ['他', '我、我就是来送粥的。'],
          ['你', '进来吧，粥凉了就不好喝了。'],
          ['旁白', '那晚的粥喝得很慢，话说得比粥还烫。他回家后发来消息：「今天可以把备注从（不许删）改成（不许跑）了吗？」'],
        ],
      },
      end_birthday: {
        ending: true,
        title: '生日快乐',
        scene: '吹蜡烛时他闭着眼，许了很久的愿。后来被追问急了才招：愿望说出来就不灵了，但反正和你有关。',
        lines: [['旁白', '满屋子起哄声里，他偷偷把奶油抹在了你鼻尖上。']],
      },
      end_shy: {
        ending: true,
        title: '最大的那块',
        scene: '他小声说：「嗯，最重要。」满屋子人「哦——」地起哄。他慌忙去切蛋糕，把最大的那块推到你面前。',
        lines: [['旁白', '那晚他一句话也没多说，只是最大的那块蛋糕、最后送你回家的路，都留给了你。']],
      },
      end_school: {
        ending: true,
        title: '校门口',
        scene: '周五的校门口，你看见他穿过人潮朝你跑来，书包带都跑歪了。他刹在你面前，喘着气笑。',
        lines: [['他', '姐！', ]],
      },
      end_wronged: {
        ending: true,
        title: '小狗的委屈',
        scene: '他「哦」了一声，说没事没事。但那之后，你的早餐、奶茶、下午茶总是准时出现。',
        lines: [['旁白', '小狗记「仇」的方式，是加倍地对你好。']],
      },
    },
  },
];

export const STORIES = [...BASE_STORIES, ...STORIES_FUNNY_A, ...STORIES_FUNNY_B];
