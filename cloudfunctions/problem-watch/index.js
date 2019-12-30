// 云函数入口文件
const cloud = require('wx-server-sdk')
const TcbRouter = require('tcb-router')
const axios = require('axios');

const cloud_env = cloud.DYNAMIC_CURRENT_ENV

cloud.init()

async function notification_send(access_token, question_id, openid)
{
  try {
    const db = cloud.database(cloud_env)
    const ret = await db.collection('watch').where({
      qid: question_id,
      openid: openid
    }).count();

    const total = ret.total
    console.log('watching? ', total);
    if (total > 0) {

      console.log('https://api.weixin.qq.com/cgi-bin/message/subscribe/send?'
        + `access_token=${access_token}`)

      console.log({
        touser: openid,
        template_id: 'uZQk1NJLtmExnx6BAVAapOjtk10yhy9XESXLinYa4F8',
        data: {
          thing1: {
            "value": "foo"
          },
          phrase2: {
            "value": "已解决"
          }
        }
      })

      /* only send subscribe message when user does not cancel */
      const response = await axios.post(
        'https://api.weixin.qq.com/cgi-bin/message/subscribe/send?'
        + `access_token=${access_token}`, {
        touser: openid,
        template_id: 'uZQk1NJLtmExnx6BAVAapOjtk10yhy9XESXLinYa4F8',
        data: {
          thing1: {
            "value": "foo"
          },
          phrase2: {
            "value": "已解决"
          }
        }
      })

    } else {
      console.log('user cancels subscription.')
    }

  } catch (e) {
    console.error('[云函数] [problem-watch] err:', e)
  }
}

async function notification_test(appid, question_id, openid)
{
  const secret = 'e1a74283df5c1ba16a70a1afbbcdc285'

  console.log('https://api.weixin.qq.com/cgi-bin/token?'
    + `grant_type=client_credential&appid=${appid}&secret=${secret}`);

  try {
    response = await axios.get('https://api.weixin.qq.com/cgi-bin/token?'
      + `grant_type=client_credential&appid=${appid}&secret=${secret}`, {})
    const access_token = response.data.access_token
    console.log('GET ok:', access_token)

    await notification_send(access_token, question_id, openid)

  } catch (e) {
    console.log(e)
  }
}

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

  app.router('list', async (ctx, next) => {
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
    const qid = args.qid;
    await notification_test(appid, qid, openid)
  });

  return app.serve()
}
