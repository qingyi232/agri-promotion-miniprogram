// AI 故事模板库（模拟 AI 生成）
const storyTemplates = {
  fruit: [
    { title: '{name}：大自然的甜蜜馈赠', summary: '在阳光充沛的产地，{name}经过精心培育，果实饱满多汁。{desc}每一口都是大自然最真挚的馈赠，从枝头到餐桌，我们用心守护这份甜蜜。', tags: ['水果', '产地直供', '新鲜采摘'] },
    { title: '寻味{name}：一颗果实的田间之旅', summary: '从春天的花开到秋天的果熟，{name}经历了四季的洗礼。{desc}果农们用传统工艺与现代技术相结合，确保每一颗果实都达到最佳品质。', tags: ['水果', '田间故事', '匠心种植'] }
  ],
  vegetable: [
    { title: '{name}：从田间到餐桌的绿色之旅', summary: '新鲜的{name}来自生态种植基地，不使用化学农药，坚持有机种植。{desc}从采摘到配送，全程冷链保鲜，让你品尝到最新鲜的味道。', tags: ['蔬菜', '有机种植', '绿色健康'] },
    { title: '舌尖上的{name}：健康生活新选择', summary: '{name}富含多种维生素和矿物质，是健康饮食的优选食材。{desc}我们与当地农户合作，建立可追溯的供应链，让每一份蔬菜都安全放心。', tags: ['蔬菜', '健康饮食', '可追溯'] }
  ],
  grain: [
    { title: '{name}：粒粒皆辛苦的丰收故事', summary: '肥沃的土地孕育出优质的{name}，颗粒饱满、口感醇香。{desc}从播种到收割，农民们倾注了无数心血，只为这一碗好饭。', tags: ['粮油', '优质产地', '传统种植'] },
    { title: '好粮好味：{name}的品质密码', summary: '{name}产自黄金种植带，得天独厚的气候和土壤条件造就了卓越品质。{desc}严格的品控标准，从源头保障每一粒粮食的安全与美味。', tags: ['粮油', '品质保障', '源头直供'] }
  ],
  tea: [
    { title: '{name}：一杯好茶的匠心之旅', summary: '高山云雾间，{name}吸收着天地精华。{desc}制茶师傅传承古法工艺，每一道工序都精益求精，只为呈现最纯正的茶香。', tags: ['茶叶', '传统工艺', '高山好茶'] },
    { title: '品味{name}：千年茶文化的现代传承', summary: '{name}承载着深厚的茶文化底蕴，从古至今备受推崇。{desc}新一代茶人在传承中创新，让古老的茶香焕发新的生命力。', tags: ['茶叶', '文化传承', '品质生活'] }
  ],
  herb: [
    { title: '{name}：本草纲目里的养生智慧', summary: '{name}自古以来就是珍贵的中药材，药食同源的典范。{desc}道地产区的优质水土，赋予了它独特的药用价值和养生功效。', tags: ['药材', '药食同源', '养生保健'] },
    { title: '寻访{name}：探秘道地药材的生长之地', summary: '在特定的海拔和气候条件下，{name}缓慢生长，积累丰富的有效成分。{desc}当地药农世代守护，坚持传统采收方式，保证药材的道地品质。', tags: ['药材', '道地产区', '传统采收'] }
  ],
  livestock: [
    { title: '{name}：生态养殖的美味密码', summary: '天然牧场、清澈水源，{name}在最优质的环境中自然生长。{desc}坚持生态养殖理念，不添加激素和抗生素，让美味与健康兼得。', tags: ['畜牧', '生态养殖', '天然健康'] },
    { title: '从牧场到餐桌：{name}的品质之旅', summary: '{name}来自通过有机认证的养殖基地，全程可追溯。{desc}科学的养殖管理和严格的品质检测，确保每一份产品都安全优质。', tags: ['畜牧', '有机认证', '全程可追溯'] }
  ]
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
    productName: '',
    extraDesc: '',
    selectedCategory: 'fruit',
    categories: [
      { id: 'fruit', name: '水果' },
      { id: 'vegetable', name: '蔬菜' },
      { id: 'grain', name: '粮油' },
      { id: 'tea', name: '茶叶' },
      { id: 'herb', name: '药材' },
      { id: 'livestock', name: '畜牧' }
    ],
    generating: false,
    generatedStory: {}
  },

  onNameInput(e) {
    this.setData({ productName: e.detail.value })
  },

  onDescInput(e) {
    this.setData({ extraDesc: e.detail.value })
  },

  selectCategory(e) {
    this.setData({ selectedCategory: e.currentTarget.dataset.id })
  },

  generateStory() {
    if (!this.data.productName.trim()) {
      wx.showToast({ title: '请输入农产品名称', icon: 'none' })
      return
    }

    this.setData({ generating: true, generatedStory: {} })

    // 模拟 AI 生成延迟
    setTimeout(() => {
      const cat = this.data.selectedCategory
      const templates = storyTemplates[cat] || storyTemplates.fruit
      const template = templates[Math.floor(Math.random() * templates.length)]
      const name = this.data.productName.trim()
      const desc = this.data.extraDesc.trim() ? this.data.extraDesc.trim() + '。' : ''

      const story = {
        title: template.title.replace(/\{name\}/g, name),
        summary: template.summary.replace(/\{name\}/g, name).replace(/\{desc\}/g, desc),
        tags: [name, ...template.tags]
      }

      this.setData({ generatedStory: story, generating: false })
      wx.showToast({ title: '生成成功', icon: 'success' })
    }, 1500 + Math.random() * 1000)
  },

  async submitStory() {
    if (!this.data.generatedStory.title) return

    wx.showLoading({ title: '提交中...' })
    try {
      const res = await callCloud('curator', {
        action: 'submit',
        title: this.data.generatedStory.title,
        summary: this.data.generatedStory.summary,
        category: this.data.selectedCategory,
        source: 'ai'
      })
      wx.hideLoading()
      if (res.result && res.result.success) {
        wx.showToast({ title: '已提交审核', icon: 'success' })
        setTimeout(() => {
          this.setData({ productName: '', extraDesc: '', generatedStory: {} })
        }, 1500)
      }
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: '提交失败', icon: 'none' })
    }
  }
})
