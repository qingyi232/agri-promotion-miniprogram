const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  switch (action) {
    case 'check':
      return await checkFavorite(event, openid)
    case 'add':
      return await addFavorite(event, openid)
    case 'remove':
      return await removeFavorite(event, openid)
    case 'getList':
      return await getFavoriteList(openid)
    default:
      return { code: -1, msg: '未知操作' }
  }
}

async function checkFavorite(event, openid) {
  const { storyId } = event
  try {
    const res = await db.collection('favorites')
      .where({ storyId, openid })
      .limit(1)
      .get()
    return { code: 0, favorited: res.data.length > 0 }
  } catch (e) {
    return { code: -1, favorited: false }
  }
}

async function addFavorite(event, openid) {
  const { storyId } = event
  try {
    const existing = await db.collection('favorites')
      .where({ storyId, openid })
      .limit(1)
      .get()

    if (existing.data.length > 0) {
      return { code: 0, success: true, msg: '已收藏' }
    }

    const storyRes = await db.collection('stories').doc(storyId).get()
    const story = storyRes.data

    await db.collection('favorites').add({
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

async function removeFavorite(event, openid) {
  const { storyId } = event
  try {
    await db.collection('favorites')
      .where({ storyId, openid })
      .remove()
    return { code: 0, success: true }
  } catch (e) {
    return { code: -1, msg: e.message }
  }
}

async function getFavoriteList(openid) {
  try {
    const res = await db.collection('favorites')
      .where({ openid })
      .orderBy('createTime', 'desc')
      .limit(50)
      .get()
    return { code: 0, data: res.data }
  } catch (e) {
    return { code: -1, msg: e.message }
  }
}
