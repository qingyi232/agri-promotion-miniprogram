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
    currentType: 'favorites',
    list: [],
    loading: false,
    _loaded: false
  },

  onLoad(options) {
    if (options.type === 'likes') {
      this.setData({ currentType: 'likes' })
    }
    this.loadList()
  },

  onShow() {
    // 从详情页返回时刷新列表（可能取消了收藏/点赞）
    if (this.data._loaded) {
      this.loadList()
    } else {
      this.setData({ _loaded: true })
    }
  },

  switchTab(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ currentType: type, list: [] })
    this.loadList()
  },

  async loadList() {
    this.setData({ loading: true })
    try {
      const funcName = this.data.currentType === 'favorites' ? 'favorites' : 'likes'
      const res = await callCloud(funcName, { action: 'getList' })
      if (res.result && res.result.data) {
        const list = res.result.data.map(item => {
          item.timeStr = this.formatTime(item.createTime)
          return item
        })
        this.setData({ list, loading: false })
      } else {
        this.setData({ list: [], loading: false })
      }
    } catch (e) {
      console.error('加载列表失败:', e)
      this.setData({ loading: false })
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  formatTime(timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${m}-${d}`
  }
})
