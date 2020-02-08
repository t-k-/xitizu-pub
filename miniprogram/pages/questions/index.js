const request = require("../../common-utils/request.js")

const app = getApp()

Page({
  data: {
    loginName: null,
    loginAvatar: null,
    questionID: 'km2019',
    comments: {},
    md: "## 你们好 \n yes it is **ME** \n\n 请各位aiguofen看[这个](https://www.baidu.com)."
  },

  onLogin: function (ev) {
    this.setData({
      loginName: ev.detail.nickName,
      loginAvatar: ev.detail.avatarUrl
    })
  },

  onPullDownRefresh: async function () {
    let cas = this.selectAllComponents(".comment-area")
    await Promise.all(cas.map(async (ca) => {
      return ca.refreshComments()
    })).catch((err) => {
      console.log('[caught]', err)
    })

    /* stop pull down loading */
    wx.stopPullDownRefresh()
  },

  onTapWatch: function (ev) {
    const component = ev.detail.component
    const postid = ev.detail.postid
    const state = ev.detail.state
    var vm = this
    component.setThen(new Promise((resolve, reject) => {
      if (state === false) {
        // 订阅题目授权
        const tmplID = 'uZQk1NJLtmExnx6BAVAapOjtk10yhy9XESXLinYa4F8'
        wx.requestSubscribeMessage({
          tmplIds: [tmplID],
          success(res) {
            const accepted = (res[tmplID] == 'accept')
            if (accepted) {
              request.cloud('question-watch', 'watch', { 'qid': postid },
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
        request.cloud('question-watch', 'unwatch', { 'qid': postid },
          (res) => {
            console.log('unwatch', res)
            resolve(false)
          })
      }
    }))
  },

  onTapUpvote: function (ev) {
    const component = ev.detail.component
    const postid = ev.detail.postid
    const state = ev.detail.state

    component.setThen(new Promise((resolve, reject) => {
      setTimeout(function () {
        resolve(!state)
      }, 1000)
    }))
  },

  onLoad: function() {
    wx.showShareMenu({
      withShareTicket: true
    })

    /* initialize question watch button state */
    let questionOptionBtns = this.selectComponent('#question-option-btns')
    if (questionOptionBtns) {
      var vm = this
      request.cloud('question-watch', 'list', { 'qid': vm.data.questionID },
        res => {
          const ret = res.result.ret
          if (ret.msg == 'success' && ret.detail.length > 0) {
            questionOptionBtns.setBtnState('watch', true)
          } else {
            questionOptionBtns.setBtnState('watch', false)
          }
      })
    }
      
  },

  onTestNotification: function () {
    request.cloud('question-watch', 'notify', {'qid': this.data.questionID},
    (res) => {
      console.log('notify', res)
    })
  }
})