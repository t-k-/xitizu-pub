// components/send-button/send-button.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    label: {
      type: String,
      value: "send"
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    waiting: false,
    style: "",
    label: undefined
  },

  attached: function () {
    this.restore()
  },

  /**
   * 组件的方法列表
   */
  methods: {
    restore: function () {
      /* restore original label */
      var vm = this
      vm.setData({
        label: vm.properties.label
      })

      /* fix the width to hold the label */
      const query = wx.createSelectorQuery().in(this)
      query.select('#sendBtn').boundingClientRect(function (rect) {
        const width = rect.width
        vm.setData({
          style: `width: ${width}px`
        })
      }).exec()

      /* clear (if any) wait timer */
      if (this.waitInterval)
        clearInterval(this.waitInterval)
    },

    wait: function () {
      var vm = this

      vm.setData({
        label: '. . .',
        waiting: true
      })

      /* set wait label annimation */
      vm.waitInterval = setInterval(function () {
        let dots = vm.data.label.split('.')
        let ndots = dots.length - 1;
        if (ndots < 3)
          ndots++
        else
          ndots = 1

        vm.setData({
          label: '. '.repeat(ndots)
        })
      }, 300)
    },

    onTap: function () {
      if (!this.data.waiting) {
        this.triggerEvent('tap')
        this.wait()
      }
    }
  }
})
