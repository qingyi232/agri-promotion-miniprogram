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
    stories: [],
    banners: [],
    categories: [
      { id: 'all', name: '全部' },
      { id: 'fruit', name: '水果' },
      { id: 'vegetable', name: '蔬菜' },
      { id: 'grain', name: '粮油' },
      { id: 'tea', name: '茶叶' },
      { id: 'herb', name: '药材' },
      { id: 'livestock', name: '畜牧' }
    ],
    currentCategory: 'all',
    searchKey: '',
    loading: false,
    noMore: false,
    page: 0,
    pageSize: 10
  },

  async onLoad() {
    // 等待云环境就绪后再调用，避免和 app.js 的初始化并发冲突
    const app = getApp()
    if (app.waitCloudReady) {
      await app.waitCloudReady()
    }
    // 串行调用，先加载轮播图再加载列表，减少并发
    await this.loadBanners()
    this.loadStories(true)
  },

  onPullDownRefresh() {
    this.loadStories(true)
  },

  onReachBottom() {
    if (!this.data.noMore && !this.data.loading) {
      this.loadStories(false)
    }
  },

  async loadBanners() {
    try {
      const res = await callCloud('stories', { action: 'getBanners' })
      if (res.result && res.result.data) {
        this.setData({ banners: res.result.data })
      }
    } catch (e) {
      console.error('加载轮播图失败:', e)
    }
  },

  async loadStories(refresh) {
    if (this.data.loading) return
    this.setData({ loading: true })

    if (refresh) {
      this.setData({ page: 0, noMore: false, stories: [] })
    }

    try {
      const res = await callCloud('stories', {
        action: 'getList',
        category: this.data.currentCategory,
        searchKey: this.data.searchKey,
        page: this.data.page,
        pageSize: this.data.pageSize
      })

      if (res.result && res.result.data) {
        const newStories = res.result.data
        const allStories = refresh ? newStories : [...this.data.stories, ...newStories]
        this.setData({
          stories: allStories,
          page: this.data.page + 1,
          noMore: newStories.length < this.data.pageSize,
          loading: false
        })
      } else {
        this.setData({ loading: false, noMore: true })
      }
    } catch (e) {
      console.error('加载故事列表失败:', e)
      this.setData({ loading: false })
    }

    wx.stopPullDownRefresh()
  },

  onCategoryTap(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ currentCategory: id })
    this.loadStories(true)
  },

  onSearchInput(e) {
    this.setData({ searchKey: e.detail.value })
  },

  onSearch() {
    this.loadStories(true)
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  },

  onBannerTap(e) {
    const id = e.currentTarget.dataset.id
    if (id) {
      wx.navigateTo({
        url: `/pages/detail/detail?id=${id}`
      })
    }
  },

  goAiStory() {
    wx.navigateTo({ url: '/pages/ai-story/ai-story' })
  }
})
