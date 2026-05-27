// 封装云函数调用，带超时重试
function callCloud(name, data, retries = 1) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      wx.cloud.callFunction({ name, data })
        .then(resolve)
        .catch(err => {
          if (n > 0) {
            console.warn(`云函数 ${name} 调用失败，重试中...`, err)
            setTimeout(() => attempt(n - 1), 500)
          } else {
            reject(err)
          }
        })
    }
    attempt(retries)
  })
}

Page({
  data: {
    userInfo: {},
    statsData: {
      favoriteCount: 0,
      historyCount: 0,
      likeCount: 0,
      commentCount: 0
    },
    curatorStats: {
      pendingCount: 0,
      progressCount: 0,
      doneCount: 0
    },
    recentHistory: [],
    _loaded: false
  },

  onLoad() {
    this.loadUserInfo()
  },

  onShow() {
    // 串行调用，减少并发
    this.loadStats().then(() => {
      return this.loadCuratorStats()
    }).then(() => {
      this.loadRecentHistory()
    })
  },

  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({ userInfo })
    }
  },

  getUserProfile() {
    wx.getUserProfile({
      desc: '用于完善个人资料',
      success: (res) => {
        const userInfo = res.userInfo
        this.setData({ userInfo })
        wx.setStorageSync('userInfo', userInfo)
      },
      fail: () => {
        wx.showToast({ title: '已取消登录', icon: 'none' })
      }
    })
  },

  async loadStats() {
    try {
      const res = await callCloud('history', { action: 'getStats' })
      if (res.result && res.result.data) {
        this.setData({ statsData: res.result.data })
      }
    } catch (e) {
      console.error('加载统计数据失败:', e)
    }
  },

  async loadRecentHistory() {
    try {
      const res = await callCloud('history', {
        action: 'getRecent',
        limit: 10
      })
      if (res.result && res.result.data) {
        this.setData({ recentHistory: res.result.data })
      }
    } catch (e) {
      console.error('加载最近浏览失败:', e)
    }
  },

  async loadCuratorStats() {
    try {
      const res = await callCloud('curator', { action: 'getStats' })
      if (res.result && res.result.data) {
        this.setData({ curatorStats: res.result.data })
      }
    } catch (e) {
      console.error('加载策展统计失败:', e)
    }
  },

  goCurator() {
    wx.navigateTo({ url: '/pages/curator/curator' })
  },

  goAiStory() {
    wx.navigateTo({ url: '/pages/ai-story/ai-story' })
  },

  goFavorites() {
    wx.navigateTo({ url: '/pages/favorites/favorites' })
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/history/history' })
  },

  goMyLikes() {
    wx.navigateTo({ url: '/pages/favorites/favorites?type=likes' })
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  onShare() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  onAbout() {
    wx.showModal({
      title: '关于农产品推广协同链',
      content: '致力于连接农产品产地与消费者，讲述每一份农产品背后的故事，推动农业产业链协同发展。',
      showCancel: false,
      confirmText: '了解',
      confirmColor: '#3a7d44'
    })
  },

  onShareAppMessage() {
    return {
      title: '农产品推广协同链 - 发现田间好物',
      path: '/pages/index/index'
    }
  }
})
