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
    myOpenid: null,
    selectedIdx: -1,
    selectedRole: null,
    comments: {},
    curPage: 0,
    left: 0,
    editFor: null,
    mentioning: null
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

    selectComment: function (idx, role) {
      this.setData({
        selectedIdx: idx,
        selectedRole: role || null
      })

      /* mention highlight (if any) */
      if (idx >= 0) {
        const postid = this.properties.postid
        const comment = this.data.comments[postid][idx]
        const mention = comment.mention_comment
        if (mention) {
          this.setData({
            mentioning: mention
          })
          return
        }
      }

      /* cancel highlight when unselected or selected another */
      this.setData({
        mentioning: null
      })
    },

    scrollToEditor: function () {
      const query = wx.createSelectorQuery().in(this)
      query.select('#comment-input').boundingClientRect()
      query.selectViewport().scrollOffset()
      query.exec(function (res) {
        let selectTop = res[0].top;
        let scrollTop = res[1].scrollTop;
        wx.pageScrollTo({
          scrollTop: selectTop + scrollTop,
          duration: 300
        })
      })
    },

    updateVoteBtn: function (commentID, state) {
      var voteBtn = this.selectComponent('#voteBtn-' + commentID)

      var promise = new Promise((resolve, reject) => {
        /*  if specified, set specified state */
        if (state !== undefined) {
          resolve(state)
          return
        }
        
        /* otherwise, lookup vote state from cloud */
        request.cloud('comment', 'not-voted', {
          commentID: commentID
        }, (res) => {
          const val = res.result.ret.detail
          resolve(val)
        })
      })
        
      if (voteBtn)
        voteBtn.setThen(promise)
    },

    onVoteBtnTap: async function (ev) {
      const loginName = this.properties.loginName
      const commentID = ev.currentTarget.dataset.id
      const detail = ev.detail
      var vm = this

      // allow voting without login
      /* if (loginName.trim().length == 0) {
        await modalPrompt.login('点赞')
        return
      } */
      
      if (detail.state == 'on') {
        /* upvote */
        request.cloud('comment', 'upvote', {
          commentID: commentID
        }, (res) => {
          const msg = res.result.ret.msg
          if (msg == 'error')
            console.error('already voted.')
          vm.refreshComments()
          vm.updateVoteBtn(commentID, false)
        })
      } else {
        /* downvote */
        request.cloud('comment', 'downvote', {
          commentID: commentID
        }, (res) => {
          vm.refreshComments()
          vm.updateVoteBtn(commentID, true)
        })
      }
  
    },

    onReplyBtnTap: function (ev) {
      const commentID = ev.currentTarget.dataset.commentid
      const name = ev.currentTarget.dataset.name
      
      this.resetEditorwith(commentID, `回复 ${name}：`, '回复')
      this.selectComment(-1)
    },

    onEditBtnTap: function (ev) {
      const commentID = ev.currentTarget.dataset.commentid
      const content = ev.currentTarget.dataset.content

      this.resetEditorwith(commentID, content, '修改')
      this.selectComment(-1)
    },

    onDeleBtnTap: async function (ev) {
      const commentID = ev.currentTarget.dataset.commentid
      var vm = this

      let confirm = await modalPrompt.confirm('确定要删除这条评论吗？')
      if (!confirm) return

      request.cloud('comment', 'delete', {
        commentID: commentID
      }, async (res) => {
        /* check if this edit is too late */
        const ret = res.result.ret
        if (ret.msg == 'toolate') {
          await modalPrompt.info(`过去 3 分钟以上的评论不能删除。`)
        } else {
          console.log(`comment ${commentID} deleted.`)
          vm.refreshComments()
        }
        this.selectComment(-1)
      }, (err) => {
        console.error(`comment ${commentID} deletion.`)
      })
    },

    _get_openid: function () {
      return new Promise((resolve, reject) => {
        request.cloud('profile', 'wxid', {}, (res) => {
          resolve(res.result.ret.detail.openid)
        }, (err) => {
          console.error("get openid failed.")
          reject()
        })
      })
    },

    onCommentTap: async function (ev) {
      const idx = parseInt(ev.currentTarget.id)
      const postid = this.properties.postid
      const comment = this.data.comments[postid][idx]

      if (idx == this.data.selectedIdx) {
        this.selectComment(-1)
      } else {
        this.selectComment(idx)

        /* get my openid */
        var myOpenid = this.data.myOpenid
        if (myOpenid === null) {
          /* my openid is not known previously, let's get it ... */
          try {
            myOpenid = await this._get_openid()
            this.setData({myOpenid}) /* remember it */
          } catch (err) {
            return
          }
        }

        /* now, set option panel depending on my role */
        const comment_id = comment.openid[0]._id
        if (myOpenid == comment_id) {
          this.selectComment(idx, 'owner')
        } else {
          this.selectComment(idx, 'other')
        }

        /* set voted state after vote button shows up */
        wx.nextTick(() => {
          if (comment.num_votes == 0) { /* no one voted */
            this.updateVoteBtn(comment._id, true) /* not voted */
          } else {
            this.updateVoteBtn(comment._id)
          }
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

    onLoadMore: function () {
      this.refreshComments(this.data.curPage + 1)
    },

    onEditorExpanded: async function () {
      await this.refreshComments(-1)

      wx.nextTick(() => {
        this.scrollToEditor()
      })
    },

    resetEditor: function () {
      var editor = this.selectComponent("#comment-input")
      editor.reset()

      this.setData({
        editFor: null
      })
    },

    onEditorUnexpanded: function () {
      /* when user cancels editing */
      this.setData({
        editFor: null
      })
    },

    resetEditorwith: function (commentID, content, btnLabel) {
      var editor = this.selectComponent("#comment-input")
      editor.reset(content)
      editor.onCommentFocus()
      editor.resetBtn(btnLabel)

      this.setData({
        editFor: {
          reason: btnLabel,
          commentID: commentID
        }
      })
    },

    onCommentSubmit: async function (ev) {
      const content = ev.detail.content.trim()
      const postid = ev.detail.postid
      const loginName = this.properties.loginName
      const loginAvatar = this.properties.loginAvatar
      var vm = this
      const editFor = this.data.editFor

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

      if (editFor && editFor.reason == '修改') {
        /* edit an old post */
        request.cloud('comment', 'edit', {
          commentID: editFor.commentID,
          content: content
        }, async (res) => {
          /* check if this edit is too late */
          const ret = res.result.ret
          if (ret.msg == 'toolate') {
            await modalPrompt.info(`过去 3 分钟以上的评论不能再修改。`)
            /* reset only submit button */
            vm.selectComponent("#comment-input").resetBtn(editFor.reason)
            return
          }

          try {
            await vm.refreshComments(-1)
            /* reset Editor only when comment sent successfully. */
            vm.resetEditor()
          } catch (err) {
            console.error('[caught] ', err)
          }
        })
      } else {
        /* post new comment */
        request.cloud('comment', 'post', {
          postid: postid,
          content: content,
          loginName: loginName,
          loginAvatar: loginAvatar,
          inReplyTo: (editFor && editFor.reason == '回复') ? editFor.commentID : undefined
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
  }
})
