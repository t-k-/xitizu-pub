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
    selectedIdx: -1,
    selectedRole: null,
    comments: {},
    curPage: 0,
    left: 0
  },

  attached: function () {
    this.refreshComments(0)
    .catch((err) => {
      console.error('[caught] ', err)
    })
  },

  /**
   * 组件的方法列表
   */
  methods: {

    updateVoteBtn: function (commentID) {
      var voteBtns = this.selectAllComponents(".voteBtn")

      var promise = new Promise((resolve, reject) => {
        if (typeof commentID == 'boolean') {
          resolve(commentID)
          return
        }
        
        request.cloud('comment', 'not-voted', {
          commentID: commentID
        }, (res) => {
          const val = res.result.ret.detail
          resolve(val)
        })
      })
        
      for (var i = 0; i < voteBtns.length; i++) {
        voteBtns[i].setThen(promise)
      }
    },

    onVoteBtnTap: async function (ev) {
      const loginName = this.properties.loginName
      const commentID = ev.currentTarget.id
      const detail = ev.detail
      var vm = this

      // allow voting without login
      /* if (loginName.trim().length == 0) {
        await modalPrompt.login('点赞')
        return
      } */
      
      if (detail.state == 'on') {
        request.cloud('comment', 'upvote', {
          commentID: commentID
        }, (res) => {
          const msg = res.result.ret.msg
          if (msg == 'error') {
            console.log('already voted.')
            vm.updateVoteBtn(false)
            return
          }
          vm.refreshComments()
          vm.updateVoteBtn(false)
        })
      } else {
        request.cloud('comment', 'downvote', {
          commentID: commentID
        }, (res) => {
          vm.refreshComments()
          vm.updateVoteBtn(true)
        })
      }
  
    },

    selectComment: function (ev) {
      const idx = parseInt(ev.currentTarget.id)
      const postid = this.properties.postid
      const comment = this.data.comments[postid][idx]

      /* select or unselect comment row */
      if (idx == this.data.selectedIdx) {
        this.setData({
          selectedIdx: -1,
          selectedRole: null
        })
      } else {
        this.setData({
          selectedIdx: idx,
          selectedRole: null
        })

        request.cloud('comment', 'role', {
          openid: comment.openid[0]._id
        }, (res) => {

          /* set option panel depending on user role */
          const detail = res.result.ret.detail
          if (detail == 'owner') {
            this.setData({
              selectedIdx: idx,
              selectedRole: 'owner'
            })
          } else {
            this.setData({
              selectedIdx: idx,
              selectedRole: 'other'
            })
          }

          /* initialize voted state */
          wx.nextTick(() => {
            if (comment.num_votes == 0) { /* no one voted */
              this.updateVoteBtn(true) /* not voted */
            } else {
              this.updateVoteBtn(comment._id)
            }
          })

        })
      }
    },

    refreshComments: async function (specifyPage) {
      var vm = this
      const postid = this.properties.postid
      const updateUptoHere = (specifyPage === undefined)
      const page = specifyPage || this.data.curPage

      return new Promise((resolve, reject) => {
        request.cloud('comment', 'pull', {
          page: page,
          postid: postid,
          updateUptoHere: updateUptoHere
        }, (res) => {
          /* extract returned data */
          const arr = res.result.ret.detail.list
          const total = res.result.ret.total
          const left = res.result.ret.left

          console.log(
            `[pull comments @ page ${page} (left ${left} comments, ${total} pages in total)]`, arr)

          /* insert moment string for each item */
          for (var i = 0; i < arr.length; i++) {
            var item = arr[i]
            item['timestr'] = moment(item.timestamp).fromNow()
          }

          /* set view data */
          const oldArr = this.data.comments[postid]
          var newArr = (page == 0 || page == -1 || updateUptoHere) ? arr : [...oldArr, ...arr] 
          vm.setData({
            [`comments.${postid}`]: newArr,
            curPage: (page == -1) ? total : page,
            left: left
          })

          resolve()
        }, (err) => {
          reject('pull comments failed.')
        })
      })
    },

    onExpand: function () {
      this.refreshComments(this.data.curPage + 1)
    },

    onEditorExpanded: function () {
      this.refreshComments(-1)
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
          await vm.refreshComments(-1)
          /* reset Editor only when comment sent successfully. */
          vm.resetEditor()
        } catch (err) {
          console.error('[caught] ', err)
        }

      })
    }

  }
})
