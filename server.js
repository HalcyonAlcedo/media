import fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import fstatic from '@fastify/static'
import websocket from '@fastify/websocket'
import path from 'path'
import fs from 'fs'

import { getPttBuffer, launchBrowser, screenshot, checkWebsite, getPublicIP } from './common.js'

const serverPort = 3000
const __dirname = path.resolve()

const server = fastify({
  bodyLimit: 30 * 1024 * 1024, //30m文件限制
  logger: true
})
await server.register(multipart)
await server.register(cors, {
  origin: '*'
})
await server.register(websocket, {
  cors: true,
  options: {
    maxPayload: 1048576
  }
})
server.get('/', (request, reply) => {
  fs.readFile("./index.html", (err, data) => {
    if (err) {
      // 如果出错，返回错误信息
      reply.send(err)
    } else {
      // 如果成功，设置响应的内容类型为text/html，并发送响应
      reply.type("text/html").send(data)
    }
  })
})
server.post('*', (request, reply) => {
  reply.send({
    state: 'error',
    code: '404',
    url: request.url.trim(),
    error: `无效的访问接口`
  })
})
// 云语音转码
server.post('/audio', async (request, reply) => {
  let result
  if (request.headers['content-type'].includes('multipart/form-data')) {
    const files = await request.saveRequestFiles()
    if (files.length > 0) {
      result = await getPttBuffer(files[0].filepath)
      if (result) {
        reply.send(result.buffer)
        return
      }
    }
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
        reply.send({ error: '错误：无法访问指定页面' })
        return
      }
      let base64 = await screenshot(url, body.option || {})
      if (base64) {
        if (body.type === 'image') {
          const image = Buffer.from(base64, "base64")
          reply.type("image/png")
          reply.send(image)
        } else {
          reply.send({ url: url, base64: base64 })
        }
      } else {
        reply.send({ error: '错误：浏览器崩溃' })
      }
    } else {
      reply.send({ error: '错误：请输入一个合法的网址' })
    }
  } else {
    reply.send({ error: '错误：无效参数' })
  }
})
// 网址检查
server.post('/check', async (request, reply) => {
  const body = request.body || {}
  if (!body.url) {
    reply.send({ state: 'error', error: '参数错误' })
    return
  }
  if (await checkWebsite(body.url)) {
    reply.send({ state: 'ok' })
  } else {
    reply.send({ state: 'error', error: '内容服务器无法正常访问，请检查外网端口是否开放' })
  }
})

// chatgpt插件
await server.register(fstatic, {
  root: path.join(__dirname, 'resources/chatgpt-plugin/')
})
await server.get('/page/*', (request, reply) => {
  const stream = fs.createReadStream('resources/chatgpt-plugin/index.html')
  reply.type('text/html').send(stream)
})
server.post('/page', async (request, reply) => {
  const body = request.body || {}
  if (body.code) {
    const dir = 'cache/ChatGPTCache'
    const filename = body.code + '.json'
    const filepath = path.join(dir, filename)
    let data = fs.readFileSync(filepath, 'utf8')
    reply.send(data)
  }
})
server.post('/cache', async (request, reply) => {
  const body = request.body || {}
  if (body.content) {
    const dir = 'cache/ChatGPTCache'
    const filename = body.entry + '.json'
    const filepath = path.join(dir, filename)
    const ip = await getPublicIP()
    let botName = ''
    switch (body.model) {
      case 'bing':
        botName = 'Bing'
        break
      case 'api':
        botName = 'ChatGPT'
        break
      case 'api3':
        botName = 'ChatGPT'
        break
      case 'browser':
        botName = 'ChatGPT'
        break
      case 'chatglm':
        botName = 'ChatGLM'
        break
      case 'claude':
        botName = 'Claude'
        break
      default:
        botName = body.model
        break
    }
    try {
      fs.mkdirSync(dir, { recursive: true })
      const data = {
        user: body.content.senderName,
        bot: body.chatViewBotName || botName,
        userImg: body.userImg || '',
        botImg: body.botImg || '',
        question: body.content.prompt,
        message: body.content.content,
        group: body.content.group,
        herf: `http://${ip + ':' + serverPort}/page/${body.entry}`,
        quote: body.content.quote,
        images: body.content.images || [],
        suggest: body.content.suggest || [],
        model: body.model,
        mood: body.content.mood || 'blandness',
        live2d: false,
        time: new Date()
      }
      fs.writeFileSync(filepath, JSON.stringify(data))
      reply.send({ file: body.entry, cacheUrl: `http://${ip + ':' + serverPort}/page/${body.entry}` })
    } catch (err) {
      server.log.error(`用户生成缓存${body.entry}时发生错误： ${err}`)
      reply.send({ file: body.entry, cacheUrl: `http://${ip + ':' + serverPort}/page/${body.entry}`, error: body.entry + '生成失败' })
    }
  }
})

// websocket转发
let clients = []
let servers = []
const wsFn = async (connection, request) => {
  connection.socket.on('open', message => {
    // 开始连接
    console.log(`Received message: ${message}`)
    const response = { data: 'hello, client' }
    connection.socket.send(JSON.stringify(response))
  })
  connection.socket.on('message', async (message) => {
    try {
      const data = JSON.parse(message)
      if (!data.type) {
        await connection.socket.send(JSON.stringify({ data: data, error: '当前为media数据中转服务，请明确链接类型后再次发送！' }))
        return
      }
      // 注册链接
      if (data.command === 'register') {
        if (data.region) {
          if (data.type === 'server') {
            const serverToken = Math.random().toString(36).slice(2, 18)
            servers[data.region] = {
              region: data.region,
              client: connection.socket,
              token: serverToken,
            }
            await connection.socket.send(JSON.stringify({ command: data.command, state: true, token: serverToken }))
          } else if (data.type === 'client' && data.serverToken) {
            if (servers[data.region] && servers[data.region].token === data.serverToken) {
              clients[data.region] = {
                region: data.region,
                user: data.user,
                client: connection.socket,
              }
              await connection.socket.send(JSON.stringify({ command: data.command, state: true }))
            } else {
              await connection.socket.send(JSON.stringify({ command: data.command, state: false }))
            }
          } else {
            await connection.socket.send(JSON.stringify({ command: data.command, state: false }))
          }
        } else {
          await connection.socket.send(JSON.stringify({ command: data.command, state: false }))
        }
        return
      }
      // 客户端数据转发
      if (data.type === 'client' && data.serverToken) {
        if (servers[data.region] && servers[data.region].token === data.serverToken) {
          await servers[data.region].client.send(JSON.stringify(data))
        } else {
          await connection.socket.send(JSON.stringify({ state: false, error: '服务区未注册或验证错误' }))
        }
      } else if (data.type === 'server') {
        if (clients[data.region]) {
          await clients[data.region].client.send(JSON.stringify(data))
        } else {
          await connection.socket.send(JSON.stringify({ state: false, error: '客户端未注册' }))
        }
      }

    } catch (error) {
      await connection.socket.send(JSON.stringify({ "error": error.message }))
    }
  })
  connection.socket.on('close', () => {
    // 监听连接关闭事件
    const response = { code: 403, data: 'Client disconnected', message: 'Client disconnected' }
    connection.socket.send(JSON.stringify(response))
  })
  return request
}
server.get('/ws', {
  websocket: true
}, wsFn)

server.listen({
  port: serverPort,
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
