// 云函数入口文件
const cloud = require('wx-server-sdk')

const TcbRouter = require('tcb-router')

const cloud_env = cloud.DYNAMIC_CURRENT_ENV

cloud.init({ env: cloud_env })

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid  = wxContext.OPENID
  const appid   = wxContext.APPID
  const unionid = wxContext.UNIONID

  var app = new TcbRouter({event})
  const args = event.args;

  const db = cloud.database(cloud_env)

  app.use(async (ctx, next) => {
    ctx.body = {}; /* create return body */
    await next();
  });

  app.router('watch', async (ctx, next) => {
    const qid = args.qid;

    await db.collection('watch').add({
      data: {
        qid: qid,
        openid: openid
      }
    }).then(res => {
      ctx.body.ret = {msg: "success", detail: res};
    }).catch(e => {
      ctx.body.ret = {msg: 'error', detail: e};
    })

  });

  app.router('unwatch', async (ctx, next) => {
    const qid = args.qid;

    await db.collection('watch').where({
      qid: qid,
      openid: openid
    }).remove()
    .then(res => {
      ctx.body.ret = {msg: "success", detail: res};
    }).catch(e => {
      ctx.body.ret = {msg: 'error', detail: e};
    })

  });

  app.router('get', async (ctx, next) => {
    const qid = args.qid;

    await db.collection('watch').where({
      qid: qid,
      openid: openid
    }).get().then(res => {
      ctx.body.ret = {msg: "success", detail: res.data};
    }).catch(e => {
      ctx.body.ret = {msg: 'error', detail: e};
    })
  });

  app.router('notify', async (ctx, next) => {
  });

  return app.serve()
}
