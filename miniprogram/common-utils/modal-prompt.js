async function promptLogin(actionName) {
  return new Promise((resolve, reject) => {
    wx.showModal({
      title: `${actionName}前请登录`,
      content: `请先前往页面最上方登录，再${actionName}。`,
      showCancel: false,
      success(res) {
        if (res.confirm) {
          resolve()
        }
      }
    })
  }) 
}

async function promptWordCnt(cnt) {
  return new Promise((resolve, reject) => {
    wx.showModal({
      title: `字数太少`,
      content: `请至少输入${cnt}个字符。`,
      showCancel: false,
      success(res) {
        if (res.confirm) {
          resolve()
        }
      }
    })
  })
}

module.exports = {
  login: promptLogin,
  wordCnt: promptWordCnt
}