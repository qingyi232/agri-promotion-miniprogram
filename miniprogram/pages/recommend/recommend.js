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
    tabs: [
      { id: 'all', name: '全部', icon: 'https://img.icons8.com/ios-filled/50/3a7d44/select-all.png' },
      { id: 'fruit', name: '水果', icon: 'https://img.icons8.com/ios-filled/50/3a7d44/apple.png' },
      { id: 'vegetable', name: '蔬菜', icon: 'https://img.icons8.com/ios-filled/50/3a7d44/vegetarian-food.png' },
      { id: 'grain', name: '粮油', icon: 'https://img.icons8.com/ios-filled/50/3a7d44/wheat.png' },
      { id: 'tea', name: '茶叶', icon: 'https://img.icons8.com/ios-filled/50/3a7d44/tea-cup.png' },
      { id: 'herb', name: '药材', icon: 'https://img.icons8.com/ios-filled/50/3a7d44/spa-flower.png' }
    ],
    currentTab: 'all',
    hotStories: [],
    leftCol: [],
    rightCol: [],
    loading: false,
    _loaded: false
  },

  onLoad() {
    this.loadHotStories()
    this.loadRecommend()
  },

  onShow() {
    // 避免 onLoad 和 onShow 重复调用
    if (this.data._loaded) {
      this.loadRecommend()
    } else {
      this.setData({ _loaded: true })
    }
  },

  async loadHotStories() {
    try {
      const res = await callCloud('stories', {
        action: 'getHot',
        limit: 6
      })
      if (res.result && res.result.data) {
        this.setData({ hotStories: res.result.data })
      }
    } catch (e) {
      console.error('加载热门故事失败:', e)
    }
  },

  async loadRecommend() {
    this.setData({ loading: true })
    try {
      const res = await callCloud('stories', {
        action: 'getRecommend',
        category: this.data.currentTab,
        limit: 20
      })
      if (res.result && res.result.data) {
        const stories = res.result.data
        const left = []
        const right = []
        stories.forEach((item, index) => {
          if (index % 2 === 0) left.push(item)
          else right.push(item)
        })
        this.setData({ leftCol: left, rightCol: right, loading: false })
      } else {
        this.setData({ loading: false })
      }
    } catch (e) {
      console.error('加载推荐失败:', e)
      this.setData({ loading: false })
    }
  },

  onTabTap(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ currentTab: id })
    this.loadRecommend()
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  }
})
