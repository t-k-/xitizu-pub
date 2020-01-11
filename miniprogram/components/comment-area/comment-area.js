const moment = require("../../common-utils/vendor/moment/moment-cn.js")
const request = require("../../common-utils/request.js")
const modalPrompt = require("../../common-utils/modal-prompt.js")

moment.locale('zh-cn')
// console.log(moment.locale())

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    "postid": {
      type: String,
      value: null
    },
    "loginName": {
      type: String,
      value: null
    },
    "loginAvatar": {
      type: String,
      value: null
    }
  },

  /**
   * 组件的初始数据
   */
  data: {

  },

  attached: function () {
    this.refreshComments()
    .catch((err) => {
      console.error('[caught] ', err)
    })
  },

  /**
   * 组件的方法列表
   */
  methods: {
    refreshComments: async function () {
      var vm = this
      const postid = this.properties.postid

      return new Promise((resolve, reject) => {
        request.cloud('comment', 'pull', {
          postid: postid
        }, (res) => {
          /* extract array */
          const arr = res.result.ret.detail.list
          console.log('[pull comments] ', arr)

          /* insert moment string for each item */
          for (var i = 0; i < arr.length; i++) {
            var item = arr[i]
            item['timestr'] = moment(item.timestamp).fromNow()
          }

          /* set view data */
          vm.setData({
            [`comments.${postid}`]: arr
          })

          resolve()
        }, (err) => {
          reject('pull comments failed.')
        })
      })
    },

    resetEditor: function () {
      var editor = this.selectComponent("#comment-input")
      editor.reset()
    },

    onCommentSubmit: async function (ev) {
      const content = ev.detail.content.trim()
      const postid = ev.detail.postid
      const loginName = this.properties.loginName
      const loginAvatar = this.properties.loginAvatar
      var vm = this

      if (loginName.trim().length == 0) {
        await modalPrompt.login('发表评论')
        /* reset only submit button */
        this.selectComponent("#comment-input").resetBtn()
        return
      } else if (content.length < 2) {
        await modalPrompt.wordCnt(2)
        /* reset entire editor */
        this.resetEditor()
        return
      }

      request.cloud('comment', 'post', {
        postid: postid,
        content: content,
        loginName: loginName,
        loginAvatar: loginAvatar

      }, async (res) => {

        try {
          await vm.refreshComments()
          /* reset Editor only when comment sent successfully. */
          vm.resetEditor()
        } catch (err) {
          console.error('[caught] ', err)
        }

      })
    }

  }
})
