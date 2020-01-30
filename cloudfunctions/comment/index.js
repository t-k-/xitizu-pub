// 云函数入口文件
const cloud = require('wx-server-sdk')
const TcbRouter = require('tcb-router')

const cloud_env = cloud.DYNAMIC_CURRENT_ENV

cloud.init()

async function updateUserInfo(db, openid, name, avatar) {
  await db.collection('user').doc(openid).set({
    data: {
      name: name,
      avatar: avatar
    }
  }).then(res => {
    console.log('[updateUserInfo successful]')
  }).catch(e => {
    console.log('[updateUserInfo failed]')
  })
}

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
    ctx.body = {};
    await next();
  });

  app.router('role', async (ctx, next) => {
    if (args.openid == openid)
      ctx.body.ret = { msg: "success", detail: 'owner'}
    else
      ctx.body.ret = { msg: "success", detail: 'other' }
  })

  app.router('post', async (ctx, next) => {
    await updateUserInfo(db, openid, args.loginName, args.loginAvatar)

    await db.collection('comment').add({
      data: {
        postid: args.postid,
        content: args.content,
        timestamp: Date.now(),
        openid: openid
      }
    }).then(res => {
      ctx.body.ret = { msg: "success", detail: res }
    }).catch(e => {
      ctx.body.ret = { msg: 'error', detail: e }
    })

  });

  app.router('pull', async (ctx, next) => {
    await db.collection('comment').aggregate()
    .lookup({
      from: 'user',
      localField: 'openid',
      foreignField: '_id',
      as: 'openid'
    }).match({
        postid: args.postid
    }).sort({
      'timestamp': 1
    }).end().then(res => {
      ctx.body.ret = { msg: "success", detail: res }
    }).catch(e => {
      ctx.body.ret = { msg: 'error', detail: e }
    })
  })

  return app.serve()
}