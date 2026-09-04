// 人格测试题库与结果计算。一套通用格式跑四套题：
//   questions: [{ q, options: [{ t, w: {维度: 分值} }] }]（选择题，选项带权重）
//   resolve(counters) -> { key, name, color, desc }（计分规则各测试自定义）
// 计数器随按钮 value 往返，全部本地计算，不依赖任何外部状态。
import { chip } from '../cards.js';

// ---------- MBTI（12 题二元选择，E/I、S/N、T/F、J/P 各 3 题） ----------

const MBTI_RESULTS = {
  INTJ: { name: '建筑师', color: 'violet', desc: '冷静的战略家，眼里全是计划和远见。' },
  INTP: { name: '逻辑学家', color: 'violet', desc: '脑洞宇宙的常驻居民，想比做快乐。' },
  ENTJ: { name: '指挥官', color: 'violet', desc: '天生的组织者，说到就要做到。' },
  ENTP: { name: '辩论家', color: 'violet', desc: '抬杠界的天才，点子永动机。' },
  INFJ: { name: '提倡者', color: 'turquoise', desc: '温柔又坚定的理想主义者。' },
  INFP: { name: '调停者', color: 'turquoise', desc: '内心戏很足的老灵魂，共情力拉满。' },
  ENFJ: { name: '主人公', color: 'turquoise', desc: '人群里的暖光，天生的知心人。' },
  ENFP: { name: '竞选者', color: 'turquoise', desc: '行走的快乐小狗，好奇心永不熄火。' },
  ISTJ: { name: '物流师', color: 'blue', desc: '靠谱本谱，细节控，说到做到。' },
  ISFJ: { name: '守卫者', color: 'blue', desc: '安静的保护者，记着所有人的好。' },
  ESTJ: { name: '总经理', color: 'blue', desc: '执行力怪物，秩序就是安全感。' },
  ESFJ: { name: '执政官', color: 'blue', desc: '气氛组组长兼终极大管家。' },
  ISTP: { name: '鉴赏家', color: 'green', desc: '沉默的手艺人，万物皆可拆。' },
  ISFP: { name: '探险家', color: 'green', desc: '温柔的艺术灵魂，活在当下。' },
  ESTP: { name: '企业家', color: 'green', desc: '行动派玩家，人生就是大冒险。' },
  ESFP: { name: '表演者', color: 'green', desc: '天生的舞台中心，快乐制造机。' },
};

function mbtiResolve(c) {
  const type =
    (c.E >= c.I ? 'E' : 'I') + (c.S >= c.N ? 'S' : 'N') + (c.T >= c.F ? 'T' : 'F') + (c.J >= c.P ? 'J' : 'P');
  const r = MBTI_RESULTS[type];
  return { key: type, name: `${type} · ${r.name}`, color: r.color, desc: r.desc };
}

// ---------- DISC 职场人格（20 题四选一，D/I/S/C 每题各覆盖一次） ----------

const DISC_SINGLE = {
  D: {
    name: '支配型 · 指挥官', color: 'red',
    desc: '结果导向、说干就干，是团队里的发动机：目标一到手就直线冲刺，「犹豫」两个字不在你的字典里。建议：冲之前停三秒听听反对意见，胜算更大。',
  },
  I: {
    name: '影响型 · 社交家', color: 'orange',
    desc: '热情健谈、自带感染力，哪里有你哪里就有气氛：动员、破冰、讲故事都是你的主场。建议：点子起飞之后记得落地，配一张待办清单效果更佳。',
  },
  S: {
    name: '稳健型 · 支持者', color: 'green',
    desc: '耐心靠谱、善于倾听，是团队的定海神针：答应的事一定办到，协作体验满分。建议：变化来了别硬扛，你的稳定感同样可以迁移到新轨道。',
  },
  C: {
    name: '谨慎型 · 分析者', color: 'blue',
    desc: '严谨细致、按规则办事，是质量守门员：经你手的交付物几乎挑不出错。建议：别让完美主义拖住发版，80 分上线也好过 100 分缺席。',
  },
};

const DISC_DUAL = {
  DI: { name: '支配+影响 · 开路先锋', color: 'red', desc: '敢拍板也会带节奏：方向你定，士气你也包，团队跟着你既有目标又有劲。' },
  DS: { name: '支配+稳健 · 定盘星', color: 'red', desc: '外能冲刺、内能压阵：目标感与稳定性双在线，是少见的「又快又稳」选手。' },
  DC: { name: '支配+谨慎 · 冷面攻坚手', color: 'red', desc: '出手果断、下手严谨：别人还在争论，你已经带着验证过的方案在路上了。' },
  IS: { name: '影响+稳健 · 团队黏合剂', color: 'orange', desc: '热场又暖心：既能把气氛带起来，也能把每个人照顾好，是离职率的隐形天敌。' },
  IC: { name: '影响+谨慎 · 知性主持人', color: 'orange', desc: '既能说又会算：台上有感染力，台下有数据撑腰，汇报场合的六边形战士。' },
  SC: { name: '稳健+谨慎 · 靠谱质检官', color: 'green', desc: '耐心加严谨，是交付质量的双保险：交给你盯的事，领导可以放心去开会。' },
};

function discResolve(c) {
  const dims = ['D', 'I', 'S', 'C'];
  const line = dims.map((d) => `${d} ${c[d] || 0}`).join(' · ');
  // 稳定排序：平分时按 D/I/S/C 的顺序取，保证同一组计数永远得到同一结果
  const sorted = dims.map((d) => [d, c[d] || 0]).sort((a, b) => b[1] - a[1]);
  if (sorted[0][1] === sorted[1][1]) {
    const key = sorted[0][0] + sorted[1][0];
    const r = DISC_DUAL[key];
    return { key, name: r.name, color: r.color, desc: `${line}\n\n${r.desc}` };
  }
  const r = DISC_SINGLE[sorted[0][0]];
  return { key: sorted[0][0], name: r.name, color: r.color, desc: `${line}\n\n${r.desc}` };
}

// ---------- SBTI 沙雕人格（8 题，四个搞笑维度） ----------

const SBTI_DIMS = [
  {
    a: 'FAN', b: 'FIT', wordA: '干饭', wordB: '减肥',
    tagA: '干饭不积极，思想有问题', tagB: '嘴上喊着减肥，身体很诚实',
  },
  {
    a: 'NIU', b: 'KONG', wordA: '社牛', wordB: '社恐',
    tagA: '走到哪儿都是气氛担当', tagB: '能发文字绝不发语音',
  },
  {
    a: 'YE', b: 'YANG', wordA: '夜猫', wordB: '养生',
    tagA: '凌晨的月亮是常客', tagB: '保温杯里泡枸杞',
  },
  {
    a: 'QIAN', b: 'LIAN', wordA: '搞钱', wordB: '恋爱',
    tagA: '爱情会跑，但钱不会', tagB: '人间清醒，但必须要甜',
  },
];

function sbtiResolve(c) {
  const words = [];
  const tags = [];
  for (const d of SBTI_DIMS) {
    const a = c[d.a] || 0;
    const b = c[d.b] || 0;
    if (a >= b) {
      words.push(d.wordA);
      tags.push(d.tagA);
    } else {
      words.push(d.wordB);
      tags.push(d.tagB);
    }
  }
  return {
    key: words.join(''),
    name: `${words.join(' · ')}型`,
    color: 'orange',
    desc: `${tags.join('；')}。`,
  };
}

// ---------- 职场摸鱼指数（8 题，FISH 累计 0-24 分） ----------

const WORK_BANDS = [
  { min: 18, name: '躺平仙人', color: 'green', desc: '肉身在职，灵魂已退休。公司的电费里有一度是你贡献的快乐。' },
  { min: 12, name: '带薪养生大师', color: 'turquoise', desc: '工作要摸，鱼要带薪摸。你深谙可持续发展的奥义。' },
  { min: 6, name: '稳定输出螺丝钉', color: 'blue', desc: '偶尔摸鱼回血，大部分时间靠谱。团队离不开你这样的人。' },
  { min: 0, name: '卷王预备役', color: 'carmine', desc: '摸鱼？那是什么。你的快乐来自待办清单一项项被划掉。' },
];

function workResolve(c) {
  const total = c.FISH || 0;
  const band = WORK_BANDS.find((b) => total >= b.min) || WORK_BANDS[WORK_BANDS.length - 1];
  return { key: `fish-${band.min}`, name: `${band.name} · ${total} 分`, color: band.color, desc: band.desc };
}

// ---------- 题目 ----------

export const TESTS = [
  {
    id: 'mbti',
    title: 'MBTI 16 型人格 · 简易版',
    desc: '12 道二选一，测出你的四字母人格',
    color: 'purple',
    resolve: mbtiResolve,
    questions: [
      { q: '周末聚会散场后，你更想？', options: [
        { t: '约下一场，正嗨着呢', w: { E: 1 } },
        { t: '独自回家，安静回血', w: { I: 1 } },
      ] },
      { q: '进一个新群，你通常？', options: [
        { t: '很快混熟，开始冒泡', w: { E: 1 } },
        { t: '潜水观察一阵再说', w: { I: 1 } },
      ] },
      { q: '遇到烦心事，你会？', options: [
        { t: '找朋友倒苦水', w: { E: 1 } },
        { t: '自己消化想通', w: { I: 1 } },
      ] },
      { q: '看一部电影，你更在意？', options: [
        { t: '情节是否讲得通', w: { S: 1 } },
        { t: '背后的隐喻和彩蛋', w: { N: 1 } },
      ] },
      { q: '上手一个新工具，你偏好？', options: [
        { t: '按教程一步步来', w: { S: 1 } },
        { t: '凭直觉先瞎摸索', w: { N: 1 } },
      ] },
      { q: '别人说一段话，你更常？', options: [
        { t: '听清字面意思就好', w: { S: 1 } },
        { t: '自动脑补他真正想说什么', w: { N: 1 } },
      ] },
      { q: '朋友emo了找你倾诉，你先？', options: [
        { t: '帮他分析问题出在哪', w: { T: 1 } },
        { t: '先共情，陪他骂一顿', w: { F: 1 } },
      ] },
      { q: '做重要决定时，你更看？', options: [
        { t: '利弊和逻辑', w: { T: 1 } },
        { t: '感受和关系', w: { F: 1 } },
      ] },
      { q: '和人起争执，你会？', options: [
        { t: '就事论事讲道理', w: { T: 1 } },
        { t: '更在意对方的态度语气', w: { F: 1 } },
      ] },
      { q: '出门旅行，你会？', options: [
        { t: '提前做攻略排日程', w: { J: 1 } },
        { t: '到了再说，随心走', w: { P: 1 } },
      ] },
      { q: '你的桌面通常是？', options: [
        { t: '物归原位，整整齐齐', w: { J: 1 } },
        { t: '乱中有序，自成体系', w: { P: 1 } },
      ] },
      { q: 'deadline 对你来说是？', options: [
        { t: '提前几天完成的发令枪', w: { J: 1 } },
        { t: '灵感迸发的加速器', w: { P: 1 } },
      ] },
    ],
  },
  {
    id: 'disc',
    title: 'DISC 职场人格',
    desc: '20 道四选一，经典 DISC，测你在团队里的行为风格',
    color: 'blue',
    resolve: discResolve,
    questions: [
      { q: '团队讨论陷入僵局，你通常？', options: [
        { t: '直接拍板，先定个方向再说', w: { D: 1 } },
        { t: '讲个段子，把气氛盘活再聊', w: { I: 1 } },
        { t: '先听完每个人的想法再说', w: { S: 1 } },
        { t: '把分歧点列出来逐条分析', w: { C: 1 } },
      ] },
      { q: '接到一个模糊不清的任务，你？', options: [
        { t: '找发起人边聊边对齐', w: { I: 1 } },
        { t: '先要文档，把边界搞清楚', w: { C: 1 } },
        { t: '按自己的理解先干起来', w: { D: 1 } },
        { t: '问问做过的同事怎么处理', w: { S: 1 } },
      ] },
      { q: 'deadline 只剩一天，进度还差点？', options: [
        { t: '对着清单核对，别出差错', w: { C: 1 } },
        { t: '稳住节奏，一项项收尾', w: { S: 1 } },
        { t: '喊人一起冲刺，互相打气', w: { I: 1 } },
        { t: '砍掉枝节，保结果先交付', w: { D: 1 } },
      ] },
      { q: '和同事意见冲突，你会？', options: [
        { t: '找个双方都能接受的折中', w: { S: 1 } },
        { t: '摆事实，说服对方按我的来', w: { D: 1 } },
        { t: '拉数据和流程，让规则说话', w: { C: 1 } },
        { t: '先聊感情，再聊事情本身', w: { I: 1 } },
      ] },
      { q: '轮到你组织会议，你会？', options: [
        { t: '开场先来点轻松的破冰', w: { I: 1 } },
        { t: '直奔主题，十五分钟搞定', w: { D: 1 } },
        { t: '提前发好议程和材料', w: { C: 1 } },
        { t: '挨个确认大家的时间安排', w: { S: 1 } },
      ] },
      { q: '公司突然调整业务方向，你？', options: [
        { t: '变化就是机会，冲就完了', w: { D: 1 } },
        { t: '先评估影响，再调整计划', w: { C: 1 } },
        { t: '拉着大家聊聊怎么玩转它', w: { I: 1 } },
        { t: '有点不安，但会慢慢适应', w: { S: 1 } },
      ] },
      { q: '做一个重要决策时，你更靠？', options: [
        { t: '过往经验和稳妥的判断', w: { S: 1 } },
        { t: '和大家讨论出来的共识', w: { I: 1 } },
        { t: '直觉和魄力，快刀斩乱麻', w: { D: 1 } },
        { t: '数据、逻辑和利弊清单', w: { C: 1 } },
      ] },
      { q: '向领导汇报工作，你习惯？', options: [
        { t: '备好数据，防住追问的坑', w: { C: 1 } },
        { t: '结论先行，三十秒说重点', w: { D: 1 } },
        { t: '按时间顺序如实讲清楚', w: { S: 1 } },
        { t: '先讲亮点故事再补细节', w: { I: 1 } },
      ] },
      { q: '新项目启动会上，你最想？', options: [
        { t: '认识一下新加入的伙伴', w: { I: 1 } },
        { t: '确认自己能稳定支持的部分', w: { S: 1 } },
        { t: '把分工和里程碑定义清楚', w: { C: 1 } },
        { t: '定个让所有人一振的目标', w: { D: 1 } },
      ] },
      { q: '被领导当众批评，你第一反应？', options: [
        { t: '当场把情况说清楚', w: { D: 1 } },
        { t: '先听着，回头私下沟通', w: { S: 1 } },
        { t: '打个圆场，别太难堪', w: { I: 1 } },
        { t: '记下问题，会后逐项复盘', w: { C: 1 } },
      ] },
      { q: '给团队分配任务，你会？', options: [
        { t: '按能力和流程精细分工', w: { C: 1 } },
        { t: '先聊聊大家想做什么', w: { I: 1 } },
        { t: '按目标直接分，限期要结果', w: { D: 1 } },
        { t: '照顾每个人的负荷和状态', w: { S: 1 } },
      ] },
      { q: '难得的空闲下午，你会？', options: [
        { t: '泡杯茶，按自己的节奏来', w: { S: 1 } },
        { t: '整理文档和待办清单', w: { C: 1 } },
        { t: '串个门，和邻座聊聊天', w: { I: 1 } },
        { t: '找点有挑战的事先垫上', w: { D: 1 } },
      ] },
      { q: '遇到一个棘手问题，你先？', options: [
        { t: '上手先试，错了再改', w: { D: 1 } },
        { t: '拆解问题，找到根因再动手', w: { C: 1 } },
        { t: '问问有经验的人怎么想', w: { S: 1 } },
        { t: '拉个小组头脑风暴', w: { I: 1 } },
      ] },
      { q: '团队气氛有点低落，你会？', options: [
        { t: '组织点小活动冲冲喜', w: { I: 1 } },
        { t: '挨个聊聊，看谁需要帮忙', w: { S: 1 } },
        { t: '带大家打场胜仗提提气', w: { D: 1 } },
        { t: '分析原因，写个改进方案', w: { C: 1 } },
      ] },
      { q: '面对繁琐的规则流程，你？', options: [
        { t: '严格执行，流程是保护', w: { C: 1 } },
        { t: '能绕就绕，结果最重要', w: { D: 1 } },
        { t: '吐槽两句，然后照办', w: { I: 1 } },
        { t: '理解它的存在，耐心走完', w: { S: 1 } },
      ] },
      { q: '客户气冲冲来投诉，你先？', options: [
        { t: '安抚情绪，耐心听他说完', w: { S: 1 } },
        { t: '核实事实，按条款处理', w: { C: 1 } },
        { t: '直接给解决方案和时间点', w: { D: 1 } },
        { t: '用热情先把火气降下来', w: { I: 1 } },
      ] },
      { q: '跨部门协作推不动，你会？', options: [
        { t: '请对方喝杯咖啡先处关系', w: { I: 1 } },
        { t: '拉上双方领导对齐拍板', w: { D: 1 } },
        { t: '找双方都能接受的节奏', w: { S: 1 } },
        { t: '把依赖关系写成文档对齐', w: { C: 1 } },
      ] },
      { q: '高风险高回报的机会来了，你？', options: [
        { t: '先算清最坏情况扛不扛得住', w: { C: 1 } },
        { t: '很兴奋，想拉人一起上', w: { I: 1 } },
        { t: '更情愿守住手里稳的事', w: { S: 1 } },
        { t: '机会不等人，先拿下再说', w: { D: 1 } },
      ] },
      { q: '你的工作节奏更接近？', options: [
        { t: '快节奏冲刺，闲下来难受', w: { D: 1 } },
        { t: '匀速稳定，不喜欢被打乱', w: { S: 1 } },
        { t: '按计划和清单一步步推进', w: { C: 1 } },
        { t: '时快时慢，看心情和氛围', w: { I: 1 } },
      ] },
      { q: '项目拿了第一，庆功时你？', options: [
        { t: '默默开心，挨个感谢大家', w: { S: 1 } },
        { t: '复盘完马上定下一个目标', w: { D: 1 } },
        { t: '组局庆祝，快乐人人有份', w: { I: 1 } },
        { t: '总结成功经验，沉淀方法论', w: { C: 1 } },
      ] },
    ],
  },
  {
    id: 'sbti',
    title: 'SBTI 沙雕人格',
    desc: '8 道题，干饭/社恐/熬夜/搞钱，组合出 16 种沙雕人格',
    color: 'yellow',
    resolve: sbtiResolve,
    questions: [
      { q: '晚上十点刷到炸鸡视频，你？', options: [
        { t: '立刻下单，快乐三十分钟送达', w: { FAN: 1 } },
        { t: '咽下口水，关掉手机', w: { FIT: 1 } },
      ] },
      { q: '部门下午茶到了，你？', options: [
        { t: '冲在最前面挑最大块的', w: { FAN: 1 } },
        { t: '宣称自己在减脂期，拿最小块', w: { FIT: 1 } },
      ] },
      { q: '电梯里遇到不熟的同事，你？', options: [
        { t: '主动找话题聊到目的地', w: { NIU: 1 } },
        { t: '掏出手机假装很忙', w: { KONG: 1 } },
      ] },
      { q: '团建到了唱歌环节，你？', options: [
        { t: '抢麦，开个人演唱会', w: { NIU: 1 } },
        { t: '默默当分母并鼓掌', w: { KONG: 1 } },
      ] },
      { q: '你的睡眠时间通常是？', options: [
        { t: '凌晨一点，夜生活刚开始', w: { YE: 1 } },
        { t: '十一点前睡，是底线', w: { YANG: 1 } },
      ] },
      { q: '购物车里更多的是？', options: [
        { t: '咖啡和快乐水', w: { YE: 1 } },
        { t: '枸杞和保温杯配件', w: { YANG: 1 } },
      ] },
      { q: '群里聊「搞钱还是恋爱」，你？', options: [
        { t: '搞钱，爱情会跑但钱不会', w: { QIAN: 1 } },
        { t: '恋爱，人生苦短要甜', w: { LIAN: 1 } },
      ] },
      { q: '难得的周末，你更愿意？', options: [
        { t: '研究副业和理财', w: { QIAN: 1 } },
        { t: '陪对象或追 CP', w: { LIAN: 1 } },
      ] },
    ],
  },
  {
    id: 'work',
    title: '职场摸鱼指数',
    desc: '8 道题，测测你的带薪快乐浓度',
    color: 'orange',
    resolve: workResolve,
    questions: [
      { q: '早上到工位的第一件事？', options: [
        { t: '打开待办清单直接开干', w: { FISH: 0 } },
        { t: '先冲杯咖啡刷十分钟手机', w: { FISH: 2 } },
        { t: '让灵魂先「上线」一个小时', w: { FISH: 3 } },
      ] },
      { q: '摸鱼时你最常干的事？', options: [
        { t: '我不摸鱼（认真脸）', w: { FISH: 0 } },
        { t: '逛购物软件默默比价', w: { FISH: 2 } },
        { t: '带薪如厕刷完整个热搜', w: { FISH: 3 } },
      ] },
      { q: '会议开到一半，内容与你无关？', options: [
        { t: '继续认真听并做笔记', w: { FISH: 0 } },
        { t: '半听半回消息', w: { FISH: 2 } },
        { t: '挂着会，眯一会儿', w: { FISH: 3 } },
      ] },
      { q: '下班前半小时，你在？', options: [
        { t: '复盘今天、排明天的事', w: { FISH: 0 } },
        { t: '收拾东西等整点下班', w: { FISH: 2 } },
        { t: '灵魂早已神游到晚饭', w: { FISH: 3 } },
      ] },
      { q: '领导突然在群里@你？', options: [
        { t: '秒回「收到，马上处理」', w: { FISH: 0 } },
        { t: '等三分钟，显得在忙', w: { FISH: 2 } },
        { t: '假装没看到，起身去接水', w: { FISH: 3 } },
      ] },
      { q: '你工位上的水杯/绿植/抱枕数量？', options: [
        { t: '没有，都是累赘', w: { FISH: 0 } },
        { t: '一两样，意思一下', w: { FISH: 2 } },
        { t: '工位是第二个家，齐全得很', w: { FISH: 3 } },
      ] },
      { q: '「这个需求今天能上吗？」', options: [
        { t: '能，现在就排期', w: { FISH: 0 } },
        { t: '尽量，下班前给结果', w: { FISH: 2 } },
        { t: '「技术上有点复杂」', w: { FISH: 3 } },
      ] },
      { q: '周日下午，你的心情？', options: [
        { t: '期待新一周大干一场', w: { FISH: 0 } },
        { t: '平静地做心理建设', w: { FISH: 2 } },
        { t: '灵魂已经开始请假', w: { FISH: 3 } },
      ] },
    ],
  },
];

// 结果渲染小工具：名字做成彩色 chip + 描述
export function resultMarkdown(result) {
  return `${chip(result.name, result.color)}\n\n${result.desc}`;
}
