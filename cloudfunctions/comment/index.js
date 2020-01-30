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
    const $ = db.command.aggregate
    await db.collection('comment').aggregate()
    .lookup({
      from: 'user',
      localField: 'openid',
      foreignField: '_id',
      as: 'openid'
    })
    .lookup({
      from: 'votes',
      localField: '_id',
      foreignField: 'toid',
      as: 'votes'
    })
    .match({
        postid: args.postid
    })
    /*.unwind({
      path: '$votes',
      preserveNullAndEmptyArrays: true
    })
    .group({
      _id: '$_id',
      openid: 
      votes_cnt: $.sum(1) 
    })*/
    .sort({
      'timestamp': 1
    }).end().then(res => {
      ctx.body.ret = { msg: "success", detail: res }
    }).catch(e => {
      ctx.body.ret = { msg: 'error', detail: e }
    })
  })

  app.router('not-voted', async (ctx, next) => {
    const commentID = args.commentID

    const ret = await db.collection('votes').where({
      toid: commentID,
      by: openid
    }).count();
    const not_voted = (ret.total == 0)
    ctx.body.ret = { msg: "success", detail: not_voted }
  })

  app.router('upvote', async (ctx, next) => {
    const commentID = args.commentID

    const ret = await db.collection('votes').where({
      toid: commentID,
      by: openid
    }).count();
    const total = ret.total

    if (total > 0) {
      ctx.body.ret = { msg: 'success', detail: 'already voted.' }
      return
    }

    await db.collection('votes').add({
      data: {
        toid: commentID,
        by: openid
      }
    }).then(res => {
      ctx.body.ret = { msg: "success", detail: res }
    }).catch(e => {
      ctx.body.ret = { msg: 'error', detail: e }
    })
  })

  app.router('downvote', async (ctx, next) => {
    const commentID = args.commentID
    await db.collection('votes').where({
      toid: commentID,
      by: openid
    })
    .remove()
    .then(res => {
      ctx.body.ret = { msg: "success", detail: res };
    }).catch(e => {
      ctx.body.ret = { msg: 'error', detail: e };
    })
  })

  return app.serve()
}