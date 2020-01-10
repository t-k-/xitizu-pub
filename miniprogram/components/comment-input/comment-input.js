// components/comment-input/comment-input.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
  },

  /**
   * 组件的初始数据
   */
  data: {
    focused: false,
    empty: true,
    content: ''
  },

  /**
   * 组件的方法列表
   */
  methods: {
    onCommentFocus: function (ev) {
      this.setData({
        focused: true
      })
    },
    onCommentBlur: function (ev) {
      const left_val = ev.detail.value.trim()
      if (left_val.length == 0) {
        this.setData({
          empty: true,
          content: ''
        })
      } else {
        this.setData({
          empty: false
        })
      }
      this.setData({
        focused: false
      })
    },
    onCommentEdit: function (ev) {
      const content = ev.detail.value
      this.setData({
        content: content
      })
    },
    onSubmit: function () {
      const content = this.data.content.trim()
      this.triggerEvent('submit', {
        content: content
      })
    }
  }
})
