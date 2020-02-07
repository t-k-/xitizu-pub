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
    }
  },

  /**
   * 组件的初始数据
   */
  data: {

  },

  ready: function () {
    console.log('created')
    console.log(this.properties)

   /* var vm = this
    this.watchButton.setThen(new Promise((resolve, reject) => {
      request.cloud('question-watch', 'list', { 'qid': vm.data.questionID },
        res => {
          const ret = res.result.ret
          if (ret.msg == 'success' && ret.detail.length > 0) {
            resolve(true)
          } else {
            resolve(false)
          }
        })
    }))*/
  },

  /**
   * 组件的方法列表
   */
  methods: {

  }
})
