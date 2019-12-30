//index.js
const app = getApp()

Page({
  data: {
    avatarUrl: '/pages/index/user-unlogin.png',
    userInfo: {},
    logged: false,
    takeSession: false,
    questionID: 'km2019',
    watchQuestion: false,
    requestResult: ''
  },

  onPullDownRefresh: function () {
    wx.stopPullDownRefresh()
  },

  onLoad: function() {
    wx.showShareMenu({
      withShareTicket: true
    })

    // 获取用户信息
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          // 已经授权，可以直接调用 getUserInfo 获取头像昵称，不会弹框
          wx.getUserInfo({
            success: res => {
              this.setData({
                avatarUrl: res.userInfo.avatarUrl,
                userInfo: res.userInfo
              })
            }
          })
        }
      }
    })

    var vm = this
    vm.backendRequest('problem-watch', 'get', {'qid': vm.data.questionID}, res => {
        const ret = res.result.ret
        console.log('get', ret);
        if (ret.msg == 'success' && ret.detail.length > 0)
          vm.setData({ watchQuestion: true });
    })

  },

  onGetUserInfo: function(e) {
    if (!this.data.logged && e.detail.userInfo) {
      this.setData({
        logged: true,
        avatarUrl: e.detail.userInfo.avatarUrl,
        userInfo: e.detail.userInfo
      })
    }
  },

  onGetOpenid: function() {
    // 调用云函数
    wx.cloud.callFunction({
      name: 'login',
      data: {'test': 123}
    }).then(res => {
      console.log('[云函数] [login] succ: ', res.result.openid)
      app.globalData.openid = res.result.openid
      console.log(res)
    }).catch(err => {
      console.error('[云函数] [login] err:', err)
      console.log(err)
    })
  },

  backendRequest: function (root, route, args, on_suc, on_err) {
    wx.cloud.callFunction({
      name: root,
      data: {
        $url: route,
        args: args
      }
    }).then(res => {
      on_suc(res)
    }).catch(err => {
      console.error(`[backendRequest] ${root}/${route} error:`, err)
      if (on_err) on_err(err)
    })
  },

  onWatchQuestionChange: function () {
    var vm = this;
    if (!this.data.watchQuestion) {
      // 订阅题目授权
      const tmplID = 'uZQk1NJLtmExnx6BAVAapOjtk10yhy9XESXLinYa4F8';
      wx.requestSubscribeMessage({
        tmplIds: [tmplID],
        success (res) {
          console.log('user accepts notification', res);

          const accepted = (res[tmplID] == 'accept')
          if (accepted) {
            vm.backendRequest('problem-watch', 'watch', {'qid': vm.data.questionID},
            (res) => {
              console.log('watch', res);
              vm.setData({
                watchQuestion: true
              });
            });
          }

        },
        fail (res) {
          console.log('user rejects notification', res);
        }
      })
    } else {
      vm.backendRequest('problem-watch', 'unwatch', {'qid': vm.data.questionID},
      (res) => {
        console.log('unwatch', res);
        vm.setData({
          watchQuestion: false
        });
      });
    }
  },

  onTestNotification: function () {
    this.backendRequest('problem-watch', 'notify', {'qid': this.data.questionID},
    (res) => {
      console.log('notify', res);
    });
  }
})
