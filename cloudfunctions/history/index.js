const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  switch (action) {
    case 'record':
      return await recordHistory(event, openid)
    case 'getList':
      return await getHistoryList(openid)
    case 'getRecent':
      return await getRecentHistory(event, openid)
    case 'getStats':
      return await getStats(openid)
    case 'clear':
      return await clearHistory(openid)
    default:
      return { code: -1, msg: '未知操作' }
  }
}

async function recordHistory(event, openid) {
  const { storyId } = event
  try {
    const existing = await db.collection('history')
      .where({ storyId, openid })
      .limit(1)
      .get()

    if (existing.data.length > 0) {
      await db.collection('history').doc(existing.data[0]._id).update({
        data: { createTime: Date.now() }
      })
      return { code: 0, success: true }
    }

    const storyRes = await db.collection('stories').doc(storyId).get()
    const story = storyRes.data

    await db.collection('history').add({
      data: {
        storyId,
        openid,
        title: story.title,
        coverImage: story.coverImage,
        summary: story.summary || '',
        authorName: story.authorName || '',
        createTime: Date.now()
      }
    })

    return { code: 0, success: true }
  } catch (e) {
    return { code: -1, msg: e.message }
  }
}

async function getHistoryList(openid) {
  try {
    const res = await db.collection('history')
      .where({ openid })
      .orderBy('createTime', 'desc')
      .limit(100)
      .get()
    return { code: 0, data: res.data }
  } catch (e) {
    return { code: -1, msg: e.message }
  }
}

async function getRecentHistory(event, openid) {
  const { limit = 10 } = event
  try {
    const res = await db.collection('history')
      .where({ openid })
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get()
    return { code: 0, data: res.data }
  } catch (e) {
    return { code: -1, msg: e.message }
  }
}

async function getStats(openid) {
  try {
    const [favRes, histRes, likeRes, commentRes] = await Promise.all([
      db.collection('favorites').where({ openid }).count(),
      db.collection('history').where({ openid }).count(),
      db.collection('likes').where({ openid }).count(),
      db.collection('comments').where({ openid }).count()
    ])

    return {
      code: 0,
      data: {
        favoriteCount: favRes.total,
        historyCount: histRes.total,
        likeCount: likeRes.total,
        commentCount: commentRes.total
      }
    }
  } catch (e) {
    return { code: -1, msg: e.message }
  }
}

async function clearHistory(openid) {
  try {
    await db.collection('history')
      .where({ openid })
      .remove()
    return { code: 0, success: true }
  } catch (e) {
    return { code: -1, msg: e.message }
  }
}
