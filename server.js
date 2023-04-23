import fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'

import { getPttBuffer, launchBrowser, screenshot, checkWebsite } from './common.js'

const server = fastify({
  bodyLimit: 10 * 1024 * 1024, //30m文件限制
  logger: true
})
await server.register(multipart)
await server.register(cors, {
  origin: '*'
})
server.get('*', (request, reply) => {
  reply.send('-- Media Server --')
})

// 云语音转码
server.post('/audio', async (request, reply) => {
  let result
  if (request.headers['content-type'].includes('multipart/form-data')) {
    const files = await request.saveRequestFiles()
    if (files.length > 0)
      result = await getPttBuffer(files[0].filepath)
    else {
      reply.send({ error: '无文件' })
      return
    }
  } else {
    const body = request.body || {}
    if (body.recordBuffer && body.recordBuffer.type === 'Buffer') {
      const buffer = Buffer.from(body.recordBuffer.data)
      result = await getPttBuffer(buffer)
    } else if (body.recordUrl) {
      result = await getPttBuffer(body.recordUrl)
    }
  }
  if (!result?.buffer) {
    reply.send({ error: '转码失败' })
  } else {
    reply.send(result)
  }
})
// 云网页截图
server.post('/screenshot', async (request, reply) => {
  const body = request.body || {}
  if (body.url) {
    const url = body.url.trim()
    if (/^https?:\/\/.+/.test(url)) {
      if (!await checkWebsite(url)) {
        reply.send({error: '错误：无法访问指定页面'})
        return
      }
      let base64 = await screenshot(url, body.option || {})
      if (base64) {
        if (body.type === 'image') {
          const image = Buffer.from(base64, "base64")
          reply.type("image/png")
          reply.send(image)
        } else {
          reply.send({url: url, base64: base64})
        }
      } else {
        reply.send({error: '错误：浏览器崩溃'})
      }
    } else {
      reply.send({error: '错误：请输入一个合法的网址'})
    }
  } else {
    reply.send({error: '错误：无效参数'})
  }
})

server.listen({
  port: 3000,
  host: '::'
}, async (error) => {
  if (error) {
    server.log.error(`server start fail: ${error}`)
  } else {
    server.log.info(`server listening on ${server.server.address().port}`)
    await launchBrowser()
    // 设置一个定时器，每隔一段时间（比如10分钟）就重启浏览器回收垃圾
    setInterval(launchBrowser, 10 * 60 * 1000)
  }
})