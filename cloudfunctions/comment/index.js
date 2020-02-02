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
    var page = args.page || 0

    /* get total number of comments and pages */
    const count = await db.collection('comment').where({
      postid: args.postid
    }).count()
    const total = count.total
    const total_pages = Math.ceil(count.total / PAGE_ITEMS)

    /* depending on page, pull a new page or the remaining page(s) */
    var left, limit
    if (page != -1) {
      left = (page + 1 < total_pages) ? left = total - (page + 1) * PAGE_ITEMS : 0;
      limit = PAGE_ITEMS
    } else {
      page = 0
      left = 0
      limit = MAX_ITEMS
    }

    /* only update upto the current page if updateUptoHere is specified */
    var from_ = page * PAGE_ITEMS
    if (args.updateUptoHere) {
      from_ = 0
      limit = (page + 1) * PAGE_ITEMS
    }

    /* pull comments, join with user and vote tables */
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
      from: 'vote',
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

    const ret = await db.collection('vote').where({
      toid: commentID,
      by: openid
    }).count();
    const not_voted = (ret.total == 0)
    ctx.body.ret = { msg: "success", detail: not_voted }
  })

  app.router('upvote', async (ctx, next) => {
    const commentID = args.commentID

    const ret = await db.collection('vote').where({
      toid: commentID,
      by: openid
    }).count();
    const total = ret.total

    if (total > 0) {
      ctx.body.ret = { msg: 'success', detail: 'already voted.' }
      return
    }

    await db.collection('vote').add({
      data: {
        toid: commentID,
        by: openid,
        timestamp: Date.now()
      }
    }).then(res => {
      ctx.body.ret = { msg: "success", detail: res }
    }).catch(e => {
      ctx.body.ret = { msg: 'error', detail: e }
    })
  })

  app.router('downvote', async (ctx, next) => {
    const commentID = args.commentID
    await db.collection('vote').where({
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

  app.router('mention', async (ctx, next) => {
    const commentID = args.commentID
    const who = args.loginName

    await db.collection('mention').add({
      data: {
        commentid: commentID,
        by: who,
        timestamp: Date.now()
      }
    }).then(res => {
      ctx.body.ret = { msg: "success", detail: res }
    }).catch(e => {
      ctx.body.ret = { msg: 'error', detail: e }
    })
  })

  app.router('delete', async (ctx, next) => {
    const commentID = args.commentID

    let deleComment = db.collection('comment').where({
      _id: commentID
    })
    .remove()

    let deleVote = db.collection('vote').where({
      toid: commentID
    })
    .remove()

    await Promise.all([deleComment, deleVote]).then(res => {
      ctx.body.ret = { msg: "success", detail: res }
    }).catch(e => {
      ctx.body.ret = { msg: 'error', detail: e }
    })
  })

  app.router('edit', async (ctx, next) => {
    const commentID = args.commentID
    const content = args.content

    const record = await db.collection('comment').doc(commentID).get()
    
    const now = Date.now()
    const create_time = record.data.timestamp
    const diff_minutes = Math.abs(now - create_time) / (1000 * 60)

    if (diff_minutes > 3.0 /* 3 minutes */) {
      ctx.body.ret = { msg: "toolate", detail: diff_minutes }
      return
    }

    await db.collection('comment').where({
      _id: commentID
    }).update({
      data: {
        content: content
      }
    }).then(res => {
      ctx.body.ret = { msg: "success", detail: res }
    }).catch(e => {
      ctx.body.ret = { msg: 'error', detail: e }
    })
  })

  return app.serve()
}