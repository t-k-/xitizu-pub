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

  app.router('post', async (ctx, next) => {
    await updateUserInfo(db, openid, args.loginName, args.loginAvatar)

    await db.collection('comment').add({
      data: {
        postid: args.postid,
        content: args.content,
        openid: openid
      }
    }).then(res => {
      ctx.body.ret = { msg: "success", detail: res };
    }).catch(e => {
      ctx.body.ret = { msg: 'error', detail: e };
    })

  });

  return app.serve()
}