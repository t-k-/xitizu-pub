const modalPrompt = require("../../common-utils/modal-prompt.js")
const request = require("../../common-utils/request.js")
const moment = require("../../common-utils/vendor/moment/moment-cn.js")

moment.locale('zh-cn')
console.log(moment.locale())

const app = getApp()

Page({
  data: {
    loginName: null,
    loginAvatar: null,
    questionID: 'km2019',
    comments: {}
  },

  onLogin: function (ev) {
    this.setData({
      loginName: ev.detail.nickName,
      loginAvatar: ev.detail.avatarUrl
    })
  },

  refreshPostComments: async function (postid) {
    var vm = this
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
    })
  },

  onPullDownRefresh: async function () {
    const questionID = this.data.questionID
    await this.refreshPostComments(questionID)

    /* stop pull down loading */
    wx.stopPullDownRefresh()
  },

  onWatchBtnTap: function () {
    var vm = this
    this.watchButton.setThen(new Promise((resolve, reject) => {
      if (this.watchButton.data.state === "off") {
        // 订阅题目授权
        const tmplID = 'uZQk1NJLtmExnx6BAVAapOjtk10yhy9XESXLinYa4F8'
        wx.requestSubscribeMessage({
          tmplIds: [tmplID],
          success(res) {
            const accepted = (res[tmplID] == 'accept')
            if (accepted) {
              request.cloud('question-watch', 'watch', { 'qid': vm.data.questionID },
                (res) => {
                  console.log('watch', res)
                  resolve(true)
              })
            } else {
              console.log('user accepts notification', res)
              resolve(false)
            }

          },
          fail(err) {
            console.log('Request failed', err)
            resolve(false)
          }
        })
      } else {
        request.cloud('question-watch', 'unwatch', { 'qid': vm.data.questionID },
          (res) => {
            console.log('unwatch', res)
            resolve(false)
          })
      }
    }))
  },

  onLoad: function() {
    wx.showShareMenu({
      withShareTicket: true
    })

    this.starButton = this.selectComponent("#starButton")
    this.watchButton = this.selectComponent("#watchButton")
    this.awardButton = this.selectComponent("#awardButton")

    this.starButton.setOff()
    this.awardButton.setOff()

    this.refreshPostComments(this.data.questionID)

    var vm = this
    this.watchButton.setThen(new Promise((resolve, reject) => {
      request.cloud('question-watch', 'list', { 'qid': vm.data.questionID },
        res => {
          const ret = res.result.ret
          console.log('list', ret);
          if (ret.msg == 'success' && ret.detail.length > 0) {
            resolve(true)
          } else {
            resolve(false)
          }
      })
    }))

  },

  onCommentSubmit: function (ev) {
    const content = ev.detail.content.trim()
    const postid = ev.detail.postid
    const loginName = this.data.loginName
    const loginAvatar = this.data.loginAvatar

    if (loginName === null) {
      modalPrompt.login('发表评论')
      return
    } else if (content.length < 2) {
      modalPrompt.wordCnt(2)
      return
    } 

    request.cloud('comment', 'post', {
      postid: postid,
      content: content,
      loginName: loginName,
      loginAvatar: loginAvatar

    }, (res) => {
        console.log('success: ', res)
    })
  },

  onTestNotification: function () {
    request.cloud('question-watch', 'notify', {'qid': this.data.questionID},
    (res) => {
      console.log('notify', res)
    })
  }
})