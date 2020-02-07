// components/post-option-btns/post-option-btns.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    "question": {
      type: Boolean,
      value: false
    },
    "owner": {
      type: Boolean,
      value: false
    },
    "postid": {
      type: String,
      value: null
    },
    "voteNum": {
      type: Number,
      value: 0
    },
    "mockup": {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    onTapBtn: function (ev) {
      const btnID = ev.currentTarget.id
      const state = (ev.detail.state == 'on') ? true : false

      const postid = this.properties.postid
      const component = this.selectComponent("#" + btnID)

      if (this.properties.mockup) {
        component.setThen(new Promise((resolve, reject) => {
          setTimeout(function () {
            resolve(!state)
          }, 1000)
        }))
      } else {
        this.triggerEvent(btnID, { postid, component, state })
      }
    },

    setBtnState: function (btnID, state) {
      const component = this.selectComponent("#" + btnID)
      if (state)
        component.setOn()
      else
        component.setOff()
    }
  }
})
