App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-8gjqejkief5b5df4',
        traceUser: true
      })
      // 标记云环境已就绪，页面可以安全调用云函数
      this.cloudReady = true
      this.initSampleData()
    }
    this.globalData = {}
  },

  // 提供给页面等待云环境就绪的方法
  waitCloudReady() {
    return new Promise((resolve) => {
      if (this.cloudReady) {
        resolve()
      } else {
        const timer = setInterval(() => {
          if (this.cloudReady) {
            clearInterval(timer)
            resolve()
          }
        }, 50)
        // 最多等 3 秒
        setTimeout(() => {
          clearInterval(timer)
          resolve()
        }, 3000)
      }
    })
  },

  initSampleData() {
    // 图片修复只需执行一次
    const hasFixed = wx.getStorageSync('images_fixed_v1')
    if (!hasFixed) {
      wx.cloud.callFunction({
        name: 'init',
        data: { action: 'fixImages' }
      }).then(res => {
        console.log('图片修复:', res.result)
        if (res.result && res.result.code === 0) {
          wx.setStorageSync('images_fixed_v1', true)
        }
      }).catch(err => {
        console.error('图片修复失败:', err)
      })
    }

    // 数据初始化只需执行一次
    const hasInit = wx.getStorageSync('data_initialized_v4')
    if (hasInit) return

    wx.cloud.callFunction({
      name: 'init',
      data: { action: 'initData' }
    }).then(res => {
      console.log('初始化结果:', res.result)
      if (res.result && res.result.code === 0) {
        wx.setStorageSync('data_initialized_v4', true)
      }
    }).catch(err => {
      console.error('初始化失败:', err)
    })
  },

  globalData: {
    userInfo: null
  }
})
