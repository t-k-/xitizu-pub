// components/login-avatar/login-avatar.js
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
    avatarUrl: '/resources/user-unlogin.png',
    userInfo: {},
    loggedIn: false
  },

  /**
   * 组件的方法列表
   */
  methods: {
    onGetUserInfo: function (e) {
      if (e.detail.userInfo) {
        this.setData({
          loggedIn: true,
          avatarUrl: e.detail.userInfo.avatarUrl,
          userInfo: e.detail.userInfo
        })
        console.log('[login]', this.data.avatarUrl)
        console.log('[login]', this.data.userInfo.nickName)
        this.triggerEvent('login', {
          nickName: this.data.userInfo.nickName,
          avatarUrl: this.data.avatarUrl
        })
      }
    }
  },

  attached: function () {
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          /* already authorized, getUserInfo would not prompt for permission. */
          wx.getUserInfo({
            success: res => {
              this.setData({
                loggedIn: true,
                avatarUrl: res.userInfo.avatarUrl,
                userInfo: res.userInfo
              })
              console.log('[already login]', this.data.avatarUrl)
              console.log('[already login]', this.data.userInfo.nickName)
              this.triggerEvent('login', {
                nickName: this.data.userInfo.nickName,
                avatarUrl: this.data.avatarUrl
              })
            }
          })
        }
      }
    })
  }
})
