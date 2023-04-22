import fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'

import { getPttBuffer } from './common.js'

const server = fastify({
  bodyLimit: 10 * 1024 * 1024, //30m文件限制
  logger: false
})
await server.register(multipart)
await server.register(cors, {
  origin: '*'
})
server.get('*', (request, reply) => {
  reply.send('-- Media Server --')
})
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
server.listen({
  port: 3000,
  host: '::'
}, (error) => {
  if (error) {
    server.log.error(`server start fail: ${error}`)
  } else {
    server.log.info(`server listening on ${server.server.address().port}`)
  }
})