function cloudRequest(root, route, args, on_suc, on_err) {
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
}

module.exports = {
  cloud: cloudRequest
}