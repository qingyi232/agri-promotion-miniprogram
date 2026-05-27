const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { action } = event
  if (action === 'initData') {
    return await initSampleData()
  }
  if (action === 'resetData') {
    return await resetData()
  }
  if (action === 'fixImages') {
    return await fixImages()
  }
  return { code: -1, msg: '未知操作' }
}

async function fixImages() {
  const fixes = [
    { oldSub: 'photo-1599566150163-29194dcabd9c', newSub: 'photo-1507003211169-0a1dd7228f2d' },
    { oldSub: 'photo-1536304993881-460e32f50f30', newSub: 'photo-1586201375761-83865001e31c' },
    { oldSub: 'photo-1550747545-c896b40f3bfc', newSub: 'photo-1559737558-2f5a35f4523b' }
  ]
  let fixCount = 0
  try {
    for (const fix of fixes) {
      const oldUrl100 = 'https://images.unsplash.com/' + fix.oldSub + '?w=100&q=80'
      const newUrl100 = 'https://images.unsplash.com/' + fix.newSub + '?w=100&q=80'
      const oldUrl800 = 'https://images.unsplash.com/' + fix.oldSub + '?w=800&q=80'
      const newUrl800 = 'https://images.unsplash.com/' + fix.newSub + '?w=800&q=80'
      const r1 = await db.collection('stories').where({ authorAvatar: oldUrl100 }).get()
      for (const doc of r1.data) {
        await db.collection('stories').doc(doc._id).update({ data: { authorAvatar: newUrl100 } })
        fixCount++
      }
      const r2 = await db.collection('stories').where({ coverImage: oldUrl800 }).get()
      for (const doc of r2.data) {
        await db.collection('stories').doc(doc._id).update({ data: { coverImage: newUrl800 } })
        fixCount++
      }
    }
    return { code: 0, msg: '图片修复完成', fixCount }
  } catch (e) {
    return { code: -1, msg: e.message }
  }
}

async function resetData() {
  try {
    await ensureCollections()
    const MAX = 100
    let batch = await db.collection('stories').limit(MAX).get()
    while (batch.data.length > 0) {
      for (const item of batch.data) {
        await db.collection('stories').doc(item._id).remove()
      }
      batch = await db.collection('stories').limit(MAX).get()
    }
    batch = await db.collection('comments').limit(MAX).get()
    while (batch.data.length > 0) {
      for (const item of batch.data) {
        await db.collection('comments').doc(item._id).remove()
      }
      batch = await db.collection('comments').limit(MAX).get()
    }
    return await initSampleData()
  } catch (e) {
    return { code: -1, msg: e.message }
  }
}

async function ensureCollections() {
  const names = ['stories', 'comments', 'likes', 'favorites', 'history']
  for (const name of names) {
    try {
      await db.createCollection(name)
      console.log(`集合 ${name} 创建成功`)
    } catch (e) {
      console.log(`集合 ${name} 已存在或创建跳过: ${e.message}`)
    }
  }
}

async function initSampleData() {
  try {
    await ensureCollections()

    const existingStories = await db.collection('stories').limit(1).get()
    if (existingStories.data.length > 0) {
      return { code: 0, msg: '数据已存在，无需重复初始化' }
    }

    const stories = getSampleStories()
    const storyIds = []

    for (const story of stories) {
      const res = await db.collection('stories').add({ data: story })
      storyIds.push(res._id)
    }

    const commentStoryMap = {
      'PLACEHOLDER_STORY_1': storyIds[0],
      'PLACEHOLDER_STORY_2': storyIds[1],
      'PLACEHOLDER_STORY_4': storyIds[3],
      'PLACEHOLDER_STORY_8': storyIds[7],
      'PLACEHOLDER_STORY_10': storyIds[9]
    }

    const comments = getSampleComments()
    for (const comment of comments) {
      if (commentStoryMap[comment.storyId]) {
        comment.storyId = commentStoryMap[comment.storyId]
      }
      await db.collection('comments').add({ data: comment })
    }

    return { code: 0, msg: '初始化成功', count: stories.length, storyIds }
  } catch (e) {
    return { code: -1, msg: e.message }
  }
}

function getSampleStories() {
  const now = Date.now()
  const DAY = 86400000

  return [
    {
      title: '赣南脐橙：阳光与红土孕育的甜蜜',
      summary: '走进江西赣州，探寻中国脐橙之乡的甜蜜秘密，每一颗果实都承载着果农的匠心与坚守。',
      content: '<p>赣南脐橙，产自江西省赣州市，是中国国家地理标志产品。这里的红壤土质富含稀土微量元素，加上充足的日照和温润的气候，造就了赣南脐橙独特的品质。</p><p>每年11月至次年1月，是赣南脐橙的成熟季节。走进果园，满眼的橙黄挂满枝头，空气中弥漫着清甜的果香。当地果农张大叔已经种植脐橙超过30年，他说："好的脐橙需要好的土地、充足的阳光，更需要我们用心呵护。"</p><p>赣南脐橙果大形正，色泽鲜艳，果肉细嫩化渣，风味浓甜芳香，含果汁55%以上。近年来通过电商平台和冷链物流，赣南脐橙已经走向全国乃至世界各地的餐桌。</p>',
      coverImage: 'https://images.unsplash.com/photo-1547514701-42782101795e?w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=800&q=80',
        'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=800&q=80'
      ],
      category: 'fruit',
      tags: ['水果', '脐橙', '赣州'],
      authorName: '田园纪实',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80',
      origin: '江西省赣州市',
      season: '11月-次年1月',
      feature: '富含稀土元素，果肉细嫩化渣',
      likeCount: 328,
      commentCount: 45,
      viewCount: 2890,
      isBanner: true,
      createTime: now - DAY * 2
    },
    {
      title: '云南古树普洱：时间沉淀的醇香',
      summary: '在西双版纳的原始森林深处，百年古茶树默默生长，每一片叶子都是时间的馈赠。',
      content: '<p>云南普洱茶，以其独特的后发酵工艺和越陈越香的特性，被誉为"可以喝的古董"。在西双版纳勐海县的布朗山深处，至今生长着成片的古茶树群落。</p><p>这些古茶树大多有300年以上的树龄，根系深扎入富含矿物质的土壤中，吸收着大自然最纯净的养分。春季采摘的古树茶芽叶肥壮，内含物质丰富，冲泡后汤色金黄明亮，滋味醇厚回甘。</p><p>布朗族茶农世代守护着这片古茶园，坚持传统手工制作工艺。从采摘、萎凋、杀青、揉捻到晒青，每一道工序都凝聚着先人的智慧。一饼好的古树普洱，需要匠心与时间的双重打磨。</p>',
      coverImage: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1558160074-4d7d8bdf4256?w=800&q=80'
      ],
      category: 'tea',
      tags: ['茶叶', '普洱', '云南'],
      authorName: '茶山行者',
      authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80',
      origin: '云南省西双版纳州勐海县',
      season: '3月-5月（春茶最佳）',
      feature: '古树茶，越陈越香',
      likeCount: 256,
      commentCount: 38,
      viewCount: 2150,
      isBanner: true,
      createTime: now - DAY * 3
    },
    {
      title: '宁夏枸杞：塞上明珠的红色传奇',
      summary: '黄河灌溉的戈壁滩上，一粒粒红色的枸杞果，承载着"中华药食同源"千年文化。',
      content: '<p>宁夏枸杞，被誉为"红宝石"，是中国传统名贵中药材。中宁县作为枸杞原产地，拥有600多年的种植历史，这里日照充足、昼夜温差大，加上黄河水的滋养，造就了品质上乘的枸杞。</p><p>每年6月至10月是枸杞的采摘季节，红彤彤的果实挂满枝头。当地农民李大姐说："我们凌晨四五点就开始采摘，趁着露水还没干，这样的枸杞最新鲜。"手工采摘保证了果实的完整性。</p><p>宁夏枸杞粒大肉厚、色泽红润，富含枸杞多糖、甜菜碱、胡萝卜素等多种营养成分。无论是泡茶、煲汤还是直接食用，都是滋补养生的上佳之选。</p>',
      coverImage: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=800&q=80',
      images: [],
      category: 'herb',
      tags: ['药材', '枸杞', '宁夏'],
      authorName: '本草寻踪',
      authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&q=80',
      origin: '宁夏回族自治区中宁县',
      season: '6月-10月',
      feature: '粒大肉厚，药食同源',
      likeCount: 189,
      commentCount: 27,
      viewCount: 1560,
      isBanner: false,
      createTime: now - DAY * 5
    },
    {
      title: '五常大米：一碗好饭的东北密码',
      summary: '黑土地上的稻花香，五常大米用天然的醇香征服了亿万国人的味蕾。',
      content: '<p>五常大米产自黑龙江省五常市，地处世界三大黑土带之一的松嫩平原腹地。这里土层深厚、有机质含量高，加上拉林河的清澈水源灌溉，赋予了五常大米独特的品质。</p><p>五常大米的主栽品种"稻花香2号"，以其米粒晶莹剔透、口感绵软略黏、米香浓郁悠长而闻名。煮饭时，米香四溢，开盖瞬间便能感受到那股醉人的稻花香。</p><p>当地稻农王师傅坚持有机种植已经15年："我们用鸭稻共作的方式，鸭子吃虫除草，稻田养鸭，形成良性循环。虽然产量低一些，但品质绝对有保障。"</p>',
      coverImage: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&q=80'
      ],
      category: 'grain',
      tags: ['粮油', '大米', '黑龙江'],
      authorName: '稻田守望者',
      authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80',
      origin: '黑龙江省五常市',
      season: '9月-10月收割',
      feature: '稻花香2号，有机种植',
      likeCount: 412,
      commentCount: 56,
      viewCount: 3560,
      isBanner: true,
      createTime: now - DAY * 1
    },
    {
      title: '烟台苹果：海风吹来的脆甜',
      summary: '胶东半岛的海风与阳光，孕育出中国最著名的苹果品牌，每一口都是大自然的恩赐。',
      content: '<p>烟台苹果，栽培历史超过140年，是中国最早引进西洋苹果的地区。烟台地处山东半岛东部，三面环海，气候温和湿润，土壤为棕壤，非常适合苹果生长。</p><p>烟台红富士苹果色泽艳丽、果形端正、皮薄肉脆、汁多味甜，含糖量高达15%以上。每年10月至11月是采摘旺季，漫山遍野的苹果红得像一盏盏小灯笼。</p><p>栖霞市的果农陈大哥采用"套袋+摘袋转色"的管理技术："套袋能防虫防病，采摘前一个月摘袋让果实充分接受阳光，这样果实着色均匀、甜度更高。"</p>',
      coverImage: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?w=800&q=80'
      ],
      category: 'fruit',
      tags: ['水果', '苹果', '山东'],
      authorName: '果园漫步',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80',
      origin: '山东省烟台市栖霞市',
      season: '10月-11月',
      feature: '红富士，脆甜多汁',
      likeCount: 275,
      commentCount: 33,
      viewCount: 2340,
      isBanner: true,
      createTime: now - DAY * 4
    },
    {
      title: '寿光蔬菜：中国菜篮子的绿色奇迹',
      summary: '从一个普通的北方小城到"中国蔬菜之乡"，寿光用科技书写了现代农业的传奇篇章。',
      content: '<p>山东寿光，被誉为"中国蔬菜之乡"，是全国最大的蔬菜生产和集散中心。这里拥有超过60万亩的蔬菜种植面积，年产蔬菜450万吨以上，品种多达上千种。</p><p>寿光的蔬菜大棚技术领先全国。第七代智能温室大棚配备了自动控温、自动滴灌、物联网监测等先进设备，实现了全年无间断生产。</p><p>在三元朱村，菜农赵大叔指着他的智慧大棚说："现在手机上就能看到棚内温度、湿度、光照数据，浇水施肥都是智能控制，比以前省力多了，品质也更稳定。"</p>',
      coverImage: 'https://images.unsplash.com/photo-1592921870789-04563d55041c?w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=80'
      ],
      category: 'vegetable',
      tags: ['蔬菜', '大棚', '山东'],
      authorName: '绿色农场',
      authorAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80',
      origin: '山东省潍坊市寿光市',
      season: '全年供应',
      feature: '智能大棚，品种丰富',
      likeCount: 198,
      commentCount: 29,
      viewCount: 1890,
      isBanner: false,
      createTime: now - DAY * 6
    },
    {
      title: '阳澄湖大闸蟹：金秋的鲜美约定',
      summary: '秋风起，蟹脚痒。阳澄湖的清水大闸蟹，是无数老饕心中秋季最期待的味觉盛宴。',
      content: '<p>阳澄湖大闸蟹，产自江苏省苏州市阳澄湖，被誉为"蟹中之王"。阳澄湖水质清澈、水草丰茂、湖底硬质沙地，为大闸蟹提供了得天独厚的生长环境。</p><p>正宗的阳澄湖大闸蟹有"青背、白肚、金爪、黄毛"四大特征。公蟹膏满、母蟹黄肥，肉质鲜甜紧实。每年9月至12月是最佳品尝期，"九雌十雄"更是老饕们的选蟹口诀。</p><p>蟹农周师傅在阳澄湖养蟹已有25年："我们坚持生态养殖，每亩水面只放800只蟹苗，投喂螺蛳、小鱼和玉米，让每只蟹都吃得饱、长得好。"</p>',
      coverImage: 'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=800&q=80',
      images: [],
      category: 'livestock',
      tags: ['畜牧', '大闸蟹', '苏州'],
      authorName: '江南食记',
      authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80',
      origin: '江苏省苏州市阳澄湖',
      season: '9月-12月',
      feature: '青背白肚金爪黄毛',
      likeCount: 356,
      commentCount: 48,
      viewCount: 3120,
      isBanner: false,
      createTime: now - DAY * 7
    },
    {
      title: '西湖龙井：一杯春茶品江南',
      summary: '杭州西湖畔的龙井村，清明前后的嫩芽承载着千年茶文化的精髓与传承。',
      content: '<p>西湖龙井茶，产于浙江杭州西湖周围群山之中，以"色绿、香郁、味甘、形美"四绝闻名天下，被誉为"绿茶皇后"。</p><p>正宗的西湖龙井产区分为"狮、龙、云、虎、梅"五大字号。其中狮峰山所产龙井品质最为上乘。清明前采制的"明前茶"，每斤需要约7万个嫩芽，极为珍贵。</p><p>龙井村的制茶师傅吴老先生从事手工炒茶50余年："炒龙井讲究十大手法——抖、带、挤、甩、挺、拓、扣、抓、压、磨。温度、力度、时间都要恰到好处，这门手艺需要一辈子来打磨。"</p>',
      coverImage: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&q=80'
      ],
      category: 'tea',
      tags: ['茶叶', '龙井', '杭州'],
      authorName: '茶山行者',
      authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80',
      origin: '浙江省杭州市西湖区',
      season: '3月下旬-4月（明前最佳）',
      feature: '色绿香郁味甘形美',
      likeCount: 445,
      commentCount: 62,
      viewCount: 4200,
      isBanner: true,
      createTime: now - DAY * 8
    },
    {
      title: '洛川苹果：黄土高原上的红宝石',
      summary: '陕西洛川，世界苹果最佳优生区之一，海拔与纬度的完美组合造就了极致口感。',
      content: '<p>洛川苹果产自陕西省延安市洛川县，地处渭北黄土高原沟壑区，海拔800-1200米，是世界公认的苹果最佳优生区之一。</p><p>这里日照时间长、昼夜温差大、土层深厚，苹果着色好、含糖量高、硬度适中。洛川苹果的平均含糖量达到14%-16%，远超国家标准。</p><p>洛川果农通过"矮化密植+果园生草+有机施肥"的现代栽培模式，实现了品质与产量的双提升。如今洛川苹果已出口至28个国家和地区，成为陕西农业的一张亮丽名片。</p>',
      coverImage: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=800&q=80',
      images: [],
      category: 'fruit',
      tags: ['水果', '苹果', '陕西'],
      authorName: '高原果语',
      authorAvatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&q=80',
      origin: '陕西省延安市洛川县',
      season: '10月-11月',
      feature: '高海拔优生区，含糖量高',
      likeCount: 167,
      commentCount: 21,
      viewCount: 1340,
      isBanner: false,
      createTime: now - DAY * 10
    },
    {
      title: '云南松茸：雪域高原的珍馐',
      summary: '海拔3000米以上的原始森林，松茸与松树共生，是大自然赐予人类最珍贵的美味之一。',
      content: '<p>云南松茸，被誉为"菌中之王"，主产于迪庆、丽江、大理等地海拔3000米以上的原始森林中。松茸是一种纯天然的珍稀食用菌，目前无法人工培育。</p><p>松茸的生长对环境要求极为苛刻：需要松林、栎林等特定树种，海拔、温度、湿度、土壤酸碱度都必须恰到好处。一颗松茸从菌丝发育到成熟需要5-6年时间。</p><p>藏族采松茸人扎西每年7-9月都会进山采菌："找松茸全靠经验和眼力。我们采摘后会用松针和泥土把菌窝盖好，这样来年还能继续出菇。这是祖辈传下来的规矩。"</p>',
      coverImage: 'https://images.unsplash.com/photo-1504545102780-26774c1bb073?w=800&q=80',
      images: [],
      category: 'vegetable',
      tags: ['蔬菜', '松茸', '云南'],
      authorName: '山野食话',
      authorAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&q=80',
      origin: '云南省迪庆藏族自治州',
      season: '7月-9月',
      feature: '纯野生，无法人工培育',
      likeCount: 523,
      commentCount: 71,
      viewCount: 5600,
      isBanner: false,
      createTime: now - DAY * 12
    }
  ]
}

function getSampleComments() {
  const now = Date.now()
  const DAY = 86400000

  return [
    {
      storyId: 'PLACEHOLDER_STORY_1',
      content: '赣南脐橙真的很好吃！去年网购了一箱，全家都很喜欢，今年还要再买。',
      userName: '爱吃橙子',
      userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80',
      openid: 'sample_user_1',
      createTime: now - DAY * 1
    },
    {
      storyId: 'PLACEHOLDER_STORY_1',
      content: '文章写得真好，看完都想去赣州亲自摘橙子了',
      userName: '旅行爱好者',
      userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80',
      openid: 'sample_user_2',
      createTime: now - DAY * 1 + 3600000
    },
    {
      storyId: 'PLACEHOLDER_STORY_2',
      content: '古树普洱确实不一样，口感层次特别丰富，茶汤金黄透亮。',
      userName: '老茶客',
      userAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&q=80',
      openid: 'sample_user_3',
      createTime: now - DAY * 2
    },
    {
      storyId: 'PLACEHOLDER_STORY_4',
      content: '五常大米煮饭确实香，一打开电饭煲整个厨房都是米香味！',
      userName: '美食达人小王',
      userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80',
      openid: 'sample_user_4',
      createTime: now - DAY * 1
    },
    {
      storyId: 'PLACEHOLDER_STORY_8',
      content: '明前龙井喝过一次就忘不了，那个豆香和回甘太棒了。',
      userName: '清茶一盏',
      userAvatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&q=80',
      openid: 'sample_user_5',
      createTime: now - DAY * 3
    },
    {
      storyId: 'PLACEHOLDER_STORY_10',
      content: '松茸汤的鲜美真的是其他菌类无法比拟的，大自然的馈赠太珍贵了。',
      userName: '云南小妹',
      userAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&q=80',
      openid: 'sample_user_6',
      createTime: now - DAY * 5
    }
  ]
}
