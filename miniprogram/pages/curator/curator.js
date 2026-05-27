const categoryMap = {
  fruit: '水果', vegetable: '蔬菜', grain: '粮油',
  tea: '茶叶', herb: '药材', livestock: '畜牧'
}

function callCloud(name, data, retries = 1) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      wx.cloud.callFunction({ name, data })
        .then(resolve)
        .catch(err => {
          if (n > 0) {
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
    stats: { pendingCount: 0, progressCount: 0, doneCount: 0 },
    list: [],
    currentTab: 'all',
    loading: false
  },

  onLoad() {
    this.loadStats()
    this.loadList()
  },

  onShow() {
    if (this._loaded) {
      this.loadStats()
      this.loadList()
    } else {
      this._loaded = true
    }
  },

  async loadStats() {
    try {
      const res = await callCloud('curator', { action: 'getStats' })
      if (res.result && res.result.data) {
        this.setData({ stats: res.result.data })
      }
    } catch (e) {
      console.error('加载策展统计失败:', e)
    }
  },

  async loadList() {
    this.setData({ loading: true })
    try {
      const res = await callCloud('curator', {
        action: 'getList',
        status: this.data.currentTab
      })
      if (res.result && res.result.data) {
        const list = res.result.data.map(item => {
          item.timeStr = this.formatTime(item.createTime)
          item.categoryName = categoryMap[item.category] || item.category
          return item
        })
        this.setData({ list, loading: false })
      } else {
        this.setData({ list: [], loading: false })
      }
    } catch (e) {
      console.error('加载策展列表失败:', e)
      this.setData({ loading: false })
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
    this.loadList()
  },

  formatTime(timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${m}-${d}`
  }
})
