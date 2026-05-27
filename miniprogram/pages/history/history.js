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
    list: [],
    groupedList: [],
    loading: false,
    _loaded: false
  },

  onLoad() {
    this.loadHistory()
  },

  onShow() {
    // 从详情页返回时刷新（可能新增了浏览记录）
    if (this.data._loaded) {
      this.loadHistory()
    } else {
      this.setData({ _loaded: true })
    }
  },

  async loadHistory() {
    this.setData({ loading: true })
    try {
      const res = await callCloud('history', { action: 'getList' })
      if (res.result && res.result.data) {
        const list = res.result.data
        const grouped = this.groupByDate(list)
        this.setData({ list, groupedList: grouped, loading: false })
      } else {
        this.setData({ list: [], groupedList: [], loading: false })
      }
    } catch (e) {
      console.error('加载浏览记录失败:', e)
      this.setData({ loading: false })
    }
  },

  groupByDate(list) {
    const map = {}
    const today = new Date()
    const todayStr = this.formatDate(today)
    const yesterday = new Date(today.getTime() - 86400000)
    const yesterdayStr = this.formatDate(yesterday)

    list.forEach(item => {
      const date = new Date(item.createTime)
      let dateStr = this.formatDate(date)
      let displayDate = dateStr
      if (dateStr === todayStr) displayDate = '今天'
      else if (dateStr === yesterdayStr) displayDate = '昨天'

      item.timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

      if (!map[displayDate]) {
        map[displayDate] = { date: displayDate, items: [] }
      }
      map[displayDate].items.push(item)
    })

    return Object.values(map)
  },

  formatDate(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  },

  async clearHistory() {
    const res = await wx.showModal({
      title: '提示',
      content: '确定清空所有浏览记录吗？',
      confirmColor: '#3a7d44'
    })
    if (res.confirm) {
      try {
        await callCloud('history', { action: 'clear' })
        this.setData({ list: [], groupedList: [] })
        wx.showToast({ title: '已清空', icon: 'success' })
      } catch (e) {
        console.error('清空记录失败:', e)
      }
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  }
})
