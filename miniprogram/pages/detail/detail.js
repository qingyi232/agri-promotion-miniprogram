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
    storyId: '',
    story: {},
    comments: [],
    isLiked: false,
    isFavorited: false,
    showCommentInput: false,
    commentText: '',
    submitting: false
  },

  async onLoad(options) {
    if (options.id) {
      this.setData({ storyId: options.id })
      // 串行化调用，避免同时发起 5 个云函数导致超时
      await this.loadStory()
      // 这两个可以并行，因为前面的已经完成了
      await Promise.all([
        this.loadComments(),
        this.checkLikeStatus(),
        this.checkFavoriteStatus()
      ])
      // 记录历史放最后，不影响页面展示
      this.recordHistory()
    }
  },

  async loadStory() {
    try {
      const res = await callCloud('stories', {
        action: 'getDetail',
        storyId: this.data.storyId
      })
      if (res.result && res.result.data) {
        const story = res.result.data
        story.createTimeStr = this.formatTime(story.createTime)
        this.setData({ story })
        wx.setNavigationBarTitle({ title: story.title || '故事详情' })
      }
    } catch (e) {
      console.error('加载故事详情失败:', e)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  async loadComments() {
    try {
      const res = await callCloud('comments', {
        action: 'getList',
        storyId: this.data.storyId
      })
      if (res.result && res.result.data) {
        const comments = res.result.data.map(c => {
          c.createTimeStr = this.formatTime(c.createTime)
          return c
        })
        this.setData({ comments })
      }
    } catch (e) {
      console.error('加载评论失败:', e)
    }
  },

  async checkLikeStatus() {
    try {
      const res = await callCloud('likes', {
        action: 'check',
        storyId: this.data.storyId
      })
      if (res.result) {
        this.setData({ isLiked: res.result.liked })
      }
    } catch (e) {
      console.error('检查点赞状态失败:', e)
    }
  },

  async checkFavoriteStatus() {
    try {
      const res = await callCloud('favorites', {
        action: 'check',
        storyId: this.data.storyId
      })
      if (res.result) {
        this.setData({ isFavorited: res.result.favorited })
      }
    } catch (e) {
      console.error('检查收藏状态失败:', e)
    }
  },

  async toggleLike() {
    const action = this.data.isLiked ? 'unlike' : 'like'
    try {
      const res = await callCloud('likes', {
        action: action,
        storyId: this.data.storyId
      })
      if (res.result && res.result.success) {
        const delta = action === 'like' ? 1 : -1
        this.setData({
          isLiked: !this.data.isLiked,
          'story.likeCount': (this.data.story.likeCount || 0) + delta
        })
        wx.showToast({ title: action === 'like' ? '已点赞' : '已取消', icon: 'none' })
      }
    } catch (e) {
      console.error('点赞操作失败:', e)
    }
  },

  async toggleFavorite() {
    const action = this.data.isFavorited ? 'remove' : 'add'
    try {
      const res = await callCloud('favorites', {
        action: action,
        storyId: this.data.storyId
      })
      if (res.result && res.result.success) {
        this.setData({ isFavorited: !this.data.isFavorited })
        wx.showToast({ title: action === 'add' ? '已收藏' : '已取消收藏', icon: 'none' })
      }
    } catch (e) {
      console.error('收藏操作失败:', e)
    }
  },

  focusComment() {
    this.setData({ showCommentInput: true })
  },

  hideComment() {
    this.setData({ showCommentInput: false })
  },

  onCommentInput(e) {
    this.setData({ commentText: e.detail.value })
  },

  async submitComment() {
    if (!this.data.commentText.trim() || this.data.submitting) return
    this.setData({ submitting: true })

    try {
      const res = await callCloud('comments', {
        action: 'add',
        storyId: this.data.storyId,
        content: this.data.commentText.trim()
      })
      if (res.result && res.result.success) {
        wx.showToast({ title: '评论成功', icon: 'success' })
        this.setData({
          commentText: '',
          showCommentInput: false,
          submitting: false,
          'story.commentCount': (this.data.story.commentCount || 0) + 1
        })
        this.loadComments()
      }
    } catch (e) {
      console.error('提交评论失败:', e)
      wx.showToast({ title: '评论失败', icon: 'none' })
      this.setData({ submitting: false })
    }
  },

  async recordHistory() {
    try {
      await callCloud('history', {
        action: 'record',
        storyId: this.data.storyId
      })
    } catch (e) {
      console.error('记录浏览历史失败:', e)
    }
  },

  previewImage(e) {
    const src = e.currentTarget.dataset.src
    wx.previewImage({
      current: src,
      urls: this.data.story.images || [src]
    })
  },

  formatTime(timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  },

  preventBubble() {},

  onShareAppMessage() {
    return {
      title: this.data.story.title || '农产品故事',
      path: `/pages/detail/detail?id=${this.data.storyId}`,
      imageUrl: this.data.story.coverImage
    }
  }
})
