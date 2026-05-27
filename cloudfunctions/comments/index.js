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
      return await getList(event)
    case 'add':
      return await addComment(event, openid)
    default:
      return { code: -1, msg: '未知操作' }
  }
}

async function getList(event) {
  const { storyId } = event
  try {
    const res = await db.collection('comments')
      .where({ storyId })
      .orderBy('createTime', 'desc')
      .limit(100)
      .get()
    return { code: 0, data: res.data }
  } catch (e) {
    return { code: -1, msg: e.message }
  }
}

async function addComment(event, openid) {
  const { storyId, content } = event
  if (!content || !content.trim()) {
    return { code: -1, msg: '评论内容不能为空' }
  }

  try {
    const userInfo = await getUserInfo(openid)

    await db.collection('comments').add({
      data: {
        storyId,
        content: content.trim(),
        openid,
        userName: userInfo.nickName || '匿名用户',
        userAvatar: userInfo.avatarUrl || 'https://img.icons8.com/clouds/100/user.png',
        createTime: Date.now()
      }
    })

    await db.collection('stories').doc(storyId).update({
      data: { commentCount: _.inc(1) }
    })

    return { code: 0, success: true }
  } catch (e) {
    return { code: -1, msg: e.message }
  }
}

async function getUserInfo(openid) {
  try {
    const res = await db.collection('users').where({ openid }).limit(1).get()
    if (res.data.length > 0) {
      return res.data[0]
    }
  } catch (e) {}
  return { nickName: '农产品爱好者', avatarUrl: 'https://img.icons8.com/clouds/100/user.png' }
}
