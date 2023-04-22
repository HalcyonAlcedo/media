import fetch from 'node-fetch'
import fs from 'fs'
import os from 'os'
import util from 'util'
import stream from 'stream'
import crypto from 'crypto'
import child_process from 'child_process'

import { pcm2slk } from 'node-silk'

export async function getPttBuffer(file, ffmpeg = 'ffmpeg') {
    let buffer
    let time
    if (file instanceof Buffer || file.startsWith('base64://')) {
        // Buffer或base64
        const buf = file instanceof Buffer ? file : Buffer.from(file.slice(9), 'base64')
        const head = buf.slice(0, 7).toString()
        if (head.includes('SILK') || head.includes('AMR')) {
            return buf
        } else {
            const tmpfile = TMP_DIR + '/' + (0, uuid)()
            await fs.promises.writeFile(tmpfile, buf)
            return audioTrans(tmpfile, ffmpeg)
        }
    } else if (file.startsWith('http://') || file.startsWith('https://')) {
        // 网络文件
        // const readable = (await axios.get(file, { responseType: "stream" })).data;
        try {
            const headers = {
                'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 12; MI 9 Build/SKQ1.211230.001)'
            }
            let response = await fetch(file, {
                method: 'GET', // post请求
                headers
            })
            const buf = Buffer.from(await response.arrayBuffer())
            const tmpfile = TMP_DIR + '/' + (0, uuid)()
            await fs.promises.writeFile(tmpfile, buf)
            // await (0, pipeline)(readable.pipe(new DownloadTransform), fs.createWriteStream(tmpfile));
            const head = await read7Bytes(tmpfile)
            if (head.includes('SILK') || head.includes('AMR')) {
                fs.unlink(tmpfile, NOOP)
                buffer = buf
            } else {
                buffer = await audioTrans(tmpfile, ffmpeg)
            }
        } catch (err) {
            console.log(err)
         }
    } else {
        // 本地文件
        file = String(file).replace(/^file:\/{2}/, '')
        IS_WIN && file.startsWith('/') && (file = file.slice(1))
        const head = await read7Bytes(file)
        if (head.includes('SILK') || head.includes('AMR')) {
            buffer = await fs.promises.readFile(file)
        } else {
            buffer = await audioTrans(file, ffmpeg)
        }
    }
    return { buffer, time }
}

async function audioTrans(file, ffmpeg = 'ffmpeg') {
    return new Promise((resolve, reject) => {
        const tmpfile = TMP_DIR + '/' + (0, uuid)();
        (0, child_process.exec)(`${ffmpeg} -i "${file}" -f s16le -ac 1 -ar 24000 "${tmpfile}"`, async (error, stdout, stderr) => {
            try {
                resolve(pcm2slk(fs.readFileSync(tmpfile)))
            } catch {
                reject('转码失败')
            } finally {
                fs.unlink(tmpfile, NOOP)
            }
        })
    })
}

async function read7Bytes(file) {
    const fd = await fs.promises.open(file, 'r')
    const buf = (await fd.read(Buffer.alloc(7), 0, 7, 0)).buffer
    fd.close()
    return buf
}

function uuid() {
    let hex = crypto.randomBytes(16).toString('hex')
    return hex.substr(0, 8) + '-' + hex.substr(8, 4) + '-' + hex.substr(12, 4) + '-' + hex.substr(16, 4) + '-' + hex.substr(20)
}

const IS_WIN = os.platform() === 'win32'
/** 系统临时目录，用于临时存放下载的图片等内容 */
const TMP_DIR = os.tmpdir()
/** no operation */
const NOOP = () => { }
(0, util.promisify)(stream.pipeline)