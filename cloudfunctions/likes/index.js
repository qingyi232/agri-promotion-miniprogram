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
      return await checkLike(event, openid)
    case 'like':
      return await addLike(event, openid)
    case 'unlike':
      return await removeLike(event, openid)
    case 'getList':
      return await getLikeList(openid)
    default:
      return { code: -1, msg: '未知操作' }
  }
}

async function checkLike(event, openid) {
  const { storyId } = event
  try {
    const res = await db.collection('likes')
      .where({ storyId, openid })
      .limit(1)
      .get()
    return { code: 0, liked: res.data.length > 0 }
  } catch (e) {
    return { code: -1, liked: false }
  }
}

async function addLike(event, openid) {
  const { storyId } = event
  try {
    const existing = await db.collection('likes')
      .where({ storyId, openid })
      .limit(1)
      .get()

    if (existing.data.length > 0) {
      return { code: 0, success: true, msg: '已点赞' }
    }

    const storyRes = await db.collection('stories').doc(storyId).get()
    const story = storyRes.data

    await db.collection('likes').add({
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

    await db.collection('stories').doc(storyId).update({
      data: { likeCount: _.inc(1) }
    })

    return { code: 0, success: true }
  } catch (e) {
    return { code: -1, msg: e.message }
  }
}

async function removeLike(event, openid) {
  const { storyId } = event
  try {
    await db.collection('likes')
      .where({ storyId, openid })
      .remove()

    await db.collection('stories').doc(storyId).update({
      data: { likeCount: _.inc(-1) }
    })

    return { code: 0, success: true }
  } catch (e) {
    return { code: -1, msg: e.message }
  }
}

async function getLikeList(openid) {
  try {
    const res = await db.collection('likes')
      .where({ openid })
      .orderBy('createTime', 'desc')
      .limit(50)
      .get()
    return { code: 0, data: res.data }
  } catch (e) {
    return { code: -1, msg: e.message }
  }
}
