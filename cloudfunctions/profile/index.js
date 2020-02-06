// 云函数入口文件
const cloud = require('wx-server-sdk')
const TcbRouter = require('tcb-router')

const cloud_env = cloud.DYNAMIC_CURRENT_ENV

cloud.init()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const appid = wxContext.APPID
  const unionid = wxContext.UNIONID

  var app = new TcbRouter({ event })
  const args = event.args;

  const db = cloud.database(cloud_env)

  app.use(async (ctx, next) => {
    ctx.body = {}
    await next()
  });

  app.router('wxid', async (ctx, next) => {
    ctx.body.ret = {
      msg: "success",
      detail: {
        openid, appid, unionid
      }
    }
  })

  app.router('test', async (ctx, next) => {
    ctx.body.ret = {
      msg: "success",
      detail: {
        'hello': 'world',
        'echo': args
      }
    }
  })

  return app.serve()
}