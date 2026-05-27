const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  switch (action) {
    case 'getList':
      return await getList(event, openid)
    case 'getDetail':
      return await getDetail(event)
    case 'getBanners':
      return await getBanners()
    case 'getHot':
      return await getHot(event, openid)
    case 'getRecommend':
      return await getRecommend(event, openid)
    default:
      return { code: -1, msg: '未知操作' }
  }
}

// 批量查询用户对一组故事的点赞状态
async function batchCheckLiked(storyIds, openid) {
  if (!openid || storyIds.length === 0) return {}
  try {
    const res = await db.collection('likes')
      .where({
        openid,
        storyId: _.in(storyIds)
      })
      .field({ storyId: true })
      .get()
    const likedMap = {}
    res.data.forEach(item => {
      likedMap[item.storyId] = true
    })
    return likedMap
  } catch (e) {
    return {}
  }
}

async function getList(event, openid) {
  const { category, searchKey, page = 0, pageSize = 10 } = event
  let query = {}

  if (category && category !== 'all') {
    query.category = category
  }

  if (searchKey) {
    query.title = db.RegExp({
      regexp: searchKey,
      options: 'i'
    })
  }

  try {
    const res = await db.collection('stories')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip(page * pageSize)
      .limit(pageSize)
      .get()

    // 附带点赞状态
    const storyIds = res.data.map(s => s._id)
    const likedMap = await batchCheckLiked(storyIds, openid)
    const data = res.data.map(s => {
      s.isLiked = !!likedMap[s._id]
      return s
    })

    return { code: 0, data }
  } catch (e) {
    return { code: -1, msg: e.message }
  }
}

async function getDetail(event) {
  const { storyId } = event
  try {
    const res = await db.collection('stories').doc(storyId).get()
    // 增加浏览量
    await db.collection('stories').doc(storyId).update({
      data: { viewCount: _.inc(1) }
    })
    return { code: 0, data: res.data }
  } catch (e) {
    return { code: -1, msg: e.message }
  }
}

async function getBanners() {
  try {
    const res = await db.collection('stories')
      .where({ isBanner: true })
      .orderBy('createTime', 'desc')
      .limit(5)
      .get()

    const banners = res.data.map(item => ({
      image: item.coverImage,
      title: item.title,
      storyId: item._id
    }))
    return { code: 0, data: banners }
  } catch (e) {
    return { code: -1, msg: e.message }
  }
}

async function getHot(event, openid) {
  const { limit = 6 } = event
  try {
    const res = await db.collection('stories')
      .orderBy('likeCount', 'desc')
      .limit(limit)
      .get()

    const storyIds = res.data.map(s => s._id)
    const likedMap = await batchCheckLiked(storyIds, openid)
    const data = res.data.map(s => {
      s.isLiked = !!likedMap[s._id]
      return s
    })

    return { code: 0, data }
  } catch (e) {
    return { code: -1, msg: e.message }
  }
}

async function getRecommend(event, openid) {
  const { category, limit = 20 } = event
  let query = {}
  if (category && category !== 'all') {
    query.category = category
  }
  try {
    const res = await db.collection('stories')
      .where(query)
      .orderBy('likeCount', 'desc')
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get()

    const storyIds = res.data.map(s => s._id)
    const likedMap = await batchCheckLiked(storyIds, openid)
    const data = res.data.map(s => {
      s.isLiked = !!likedMap[s._id]
      return s
    })

    return { code: 0, data }
  } catch (e) {
    return { code: -1, msg: e.message }
  }
}
