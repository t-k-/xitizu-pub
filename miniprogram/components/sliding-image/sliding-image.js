// components/sliding-image/sliding-image.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    "url": {
      type: String,
      value: ""
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    outer_style: 'width: 100%',
    inner_style: 'width: 100vw'
  },

  attached: function () {
    const win_width = wx.getSystemInfoSync().windowWidth;
    var vm = this;
    wx.getImageInfo({
      src: vm.properties.url,
      success: function (res) {
        var min = Math.min(res.width, win_width)
        vm.setData({
          outer_style: 'width:' + min + 'px',
          inner_style: 'width:' + res.width + 'px'
        })
      }
    })
  },

  /**
   * 组件的方法列表
   */
  methods: {

  }
})
