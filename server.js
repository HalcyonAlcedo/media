import fastify from 'fastify'
import cors from '@fastify/cors'

import { getPttBuffer } from './common.js'

const server = fastify({
    logger: false
})

await server.register(cors, {
    origin: '*'
})
server.get('*', (request, reply) => {
  reply.send('-- Media Server --')
})
server.post('/audio', async (request, reply) => {
    const body = request.body || {}
    if (body.recordUrl) {
        const result = await getPttBuffer(body.recordUrl)
        if (!result.buffer) {
            reply.send({error: '转码失败'})
        } else {
            reply.send(result)
        }
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