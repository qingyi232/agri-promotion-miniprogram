const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  switch (action) {
    case 'getStats':
      return await getStats(openid)
    case 'getList':
      return await getList(event, openid)
    case 'submit':
      return await submitStory(event, openid)
    case 'updateStatus':
      return await updateStatus(event, openid)
    case 'initSample':
      return await initSampleData(openid)
    default:
      return { code: -1, msg: '未知操作' }
  }
}

// 获取策展统计
async function getStats(openid) {
  try {
    // 确保集合存在
    try { await db.createCollection('curator_stories') } catch (e) {}

    const [pending, progress, done] = await Promise.all([
      db.collection('curator_stories').where({ openid, status: 'pending' }).count(),
      db.collection('curator_stories').where({ openid, status: 'progress' }).count(),
      db.collection('curator_stories').where({ openid, status: 'done' }).count()
    ])

    // 如果没有数据，自动初始化示例数据
    const total = pending.total + progress.total + done.total
    if (total === 0) {
      await initSampleData(openid)
      return {
        code: 0,
        data: { pendingCount: 3, progressCount: 5, doneCount: 12 }
      }
    }

    return {
      code: 0,
      data: {
        pendingCount: pending.total,
        progressCount: progress.total,
        doneCount: done.total
      }
    }
  } catch (e) {
    return { code: -1, msg: e.message }
  }
}

// 获取策展列表
async function getList(event, openid) {
  const { status } = event
  try {
    let query = { openid }
    if (status && status !== 'all') {
      query.status = status
    }
    const res = await db.collection('curator_stories')
      .where(query)
      .orderBy('createTime', 'desc')
      .limit(50)
      .get()
    return { code: 0, data: res.data }
  } catch (e) {
    return { code: -1, msg: e.message }
  }
}

// 提交新故事（AI生成或手动）
async function submitStory(event, openid) {
  const { title, summary, category, source } = event
  try {
    try { await db.createCollection('curator_stories') } catch (e) {}

    await db.collection('curator_stories').add({
      data: {
        openid,
        title: title || '',
        summary: summary || '',
        category: category || 'fruit',
        source: source || 'manual',
        status: 'pending',
        createTime: Date.now(),
        reviewNote: ''
      }
    })
    return { code: 0, success: true }
  } catch (e) {
    return { code: -1, msg: e.message }
  }
}

// 更新状态（模拟审核流程）
async function updateStatus(event, openid) {
  const { storyId, status } = event
  try {
    await db.collection('curator_stories').doc(storyId).update({
      data: { status, updateTime: Date.now() }
    })
    return { code: 0, success: true }
  } catch (e) {
    return { code: -1, msg: e.message }
  }
}

// 初始化示例数据
async function initSampleData(openid) {
  try {
    try { await db.createCollection('curator_stories') } catch (e) {}

    const now = Date.now()
    const DAY = 86400000
    const samples = [
      // 待审核 3 条
      { title: '云南松茸：雪域高原的珍馐', summary: '海拔3000米以上的原始森林，松茸与松树共生', category: 'vegetable', source: 'ai', status: 'pending', createTime: now - DAY * 1 },
      { title: '福建安溪铁观音的制茶工艺', summary: '探访安溪茶农，揭秘传统半发酵工艺的精髓', category: 'tea', source: 'manual', status: 'pending', createTime: now - DAY * 2 },
      { title: '新疆阿克苏冰糖心苹果', summary: '天山雪水灌溉，昼夜温差造就独特冰糖心', category: 'fruit', source: 'ai', status: 'pending', createTime: now - DAY * 3 },
      // 进行中 5 条
      { title: '赣南脐橙：阳光与红土孕育的甜蜜', summary: '走进江西赣州，探寻中国脐橙之乡的甜蜜秘密', category: 'fruit', source: 'manual', status: 'progress', createTime: now - DAY * 5 },
      { title: '宁夏枸杞：塞上明珠的红色传奇', summary: '黄河灌溉的戈壁滩上，一粒粒红色的枸杞果', category: 'herb', source: 'ai', status: 'progress', createTime: now - DAY * 6 },
      { title: '阳澄湖大闸蟹的生态养殖', summary: '清水养殖，坚持每亩800只的低密度标准', category: 'livestock', source: 'manual', status: 'progress', createTime: now - DAY * 7 },
      { title: '西湖龙井：明前茶的采摘与炒制', summary: '清明前后的嫩芽承载着千年茶文化的精髓', category: 'tea', source: 'ai', status: 'progress', createTime: now - DAY * 8 },
      { title: '山东寿光蔬菜大棚的智慧农业', summary: '第七代智能温室大棚，物联网监测全年生产', category: 'vegetable', source: 'manual', status: 'progress', createTime: now - DAY * 9 },
      // 已完成 12 条
      { title: '五常大米：一碗好饭的东北密码', summary: '黑土地上的稻花香，征服了亿万国人的味蕾', category: 'grain', source: 'manual', status: 'done', createTime: now - DAY * 10 },
      { title: '云南古树普洱：时间沉淀的醇香', summary: '百年古茶树默默生长，每一片叶子都是时间的馈赠', category: 'tea', source: 'ai', status: 'done', createTime: now - DAY * 11 },
      { title: '烟台红富士苹果的套袋技术', summary: '套袋+摘袋转色，让果实着色均匀甜度更高', category: 'fruit', source: 'manual', status: 'done', createTime: now - DAY * 12 },
      { title: '洛川苹果：黄土高原上的红宝石', summary: '海拔与纬度的完美组合造就了极致口感', category: 'fruit', source: 'ai', status: 'done', createTime: now - DAY * 13 },
      { title: '贵州遵义辣椒的产业链升级', summary: '从田间到餐桌，辣椒产业的全链条发展', category: 'vegetable', source: 'manual', status: 'done', createTime: now - DAY * 14 },
      { title: '内蒙古锡林郭勒草原羊肉', summary: '天然牧场放养，肉质鲜嫩无膻味', category: 'livestock', source: 'ai', status: 'done', createTime: now - DAY * 15 },
      { title: '浙江千岛湖有机鱼头', summary: '一湖秀水养一鱼，有机认证的生态渔业', category: 'livestock', source: 'manual', status: 'done', createTime: now - DAY * 16 },
      { title: '四川蒲江猕猴桃的有机种植', summary: '不使用化学农药，坚持生物防治的绿色之路', category: 'fruit', source: 'ai', status: 'done', createTime: now - DAY * 17 },
      { title: '湖北恩施富硒茶的健康密码', summary: '世界硒都出产的茶叶，天然富含微量元素硒', category: 'tea', source: 'manual', status: 'done', createTime: now - DAY * 18 },
      { title: '黑龙江北大荒有机大豆', summary: '黑土地上的金豆子，非转基因有机种植', category: 'grain', source: 'ai', status: 'done', createTime: now - DAY * 19 },
      { title: '广西百色芒果的热带风情', summary: '右江河谷的阳光雨露，孕育出香甜多汁的芒果', category: 'fruit', source: 'manual', status: 'done', createTime: now - DAY * 20 },
      { title: '甘肃定西马铃薯的脱贫故事', summary: '从救命薯到致富薯，小土豆撬动大产业', category: 'vegetable', source: 'ai', status: 'done', createTime: now - DAY * 21 }
    ]

    for (const s of samples) {
      s.openid = openid
      s.reviewNote = s.status === 'done' ? '审核通过，已发布' : (s.status === 'progress' ? '编辑修改中' : '')
      await db.collection('curator_stories').add({ data: s })
    }

    return { code: 0, msg: '示例数据初始化成功' }
  } catch (e) {
    return { code: -1, msg: e.message }
  }
}
