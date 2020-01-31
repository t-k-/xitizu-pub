// 云函数入口文件
const cloud = require('wx-server-sdk')
const TcbRouter = require('tcb-router')

const cloud_env = cloud.DYNAMIC_CURRENT_ENV
const PAGE_ITEMS = 10
const MAX_ITEMS = 100

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
    ctx.body = {}
    await next()
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
    const count = await db.collection('comment').where({
      postid: args.postid
    }).count()
    const total = count.total
    const total_pages = Math.ceil(count.total / PAGE_ITEMS)
    var page = args.page || 0

    var left, limit
    if (page != -1) {
      left = (page + 1 < total_pages) ? left = total - (page + 1) * PAGE_ITEMS : 0;
      limit = PAGE_ITEMS
    } else {
      page = 0
      left = 0
      limit = MAX_ITEMS
    }

    var from_ = page * PAGE_ITEMS
    if (args.updateUptoHere) {
      from_ = 0
      limit = (page + 1) * PAGE_ITEMS
    }

    await db.collection('comment').aggregate()
    .match({
      postid: args.postid
    })
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
    .addFields({
      num_votes: $.size('$votes')
    })
    .project({
      votes: false
    })
    .sort({
      'timestamp': 1
    })
    .skip(from_)
    .limit(limit)
    .end()
    .then(res => {
      ctx.body.ret = { msg: "success", detail: res, total: total_pages, left: left }
    }).catch(e => {
      ctx.body.ret = { msg: 'error', detail: e, total: 0, left: 0 }
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