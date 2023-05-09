import fetch from 'node-fetch'
import fs from 'fs'
import os from 'os'
import util from 'util'
import stream from 'stream'
import crypto from 'crypto'
import child_process from 'child_process'
import puppeteer from 'puppeteer'

import { pcm2slk } from 'node-silk'

//浏览器
let browser

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
        // const readable = (await axios.get(file, { responseType: "stream" })).data
        try {
            const headers = {
                'User-Agent': 'Dalvik/2.1.0 (Linux U Android 12 MI 9 Build/SKQ1.211230.001)'
            }
            let response = await fetch(file, {
                method: 'GET', // post请求
                headers
            })
            const buf = Buffer.from(await response.arrayBuffer())
            const tmpfile = TMP_DIR + '/' + (0, uuid)()
            await fs.promises.writeFile(tmpfile, buf)
            // await (0, pipeline)(readable.pipe(new DownloadTransform), fs.createWriteStream(tmpfile))
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

// 启动浏览器
export async function launchBrowser() {
    // 如果浏览器已经存在，就先关闭它
    if (browser) {
        await browser.close()
    }
    // 启动一个无头浏览器，并且赋值给全局变量
    browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', "--disabled-setupid-sandbox"]
    })
}

// 截图指定的网址
export async function screenshot(url, opt) {
    // 如果浏览器不存在，就先启动它
    if (!browser) {
        await launchBrowser()
    }
    try {
        // 创建一个新的页面
        const page = await browser.newPage()
        // 设置页面的视口大小
        await page.setViewport({ width: opt.width || 800, height: opt.height || 600 })
        // 访问指定的网址，比如http://example.com
        await page.goto(url, { timeout: opt.timeout || 12000 , waitUtil: opt.waitUtil || 'networkidle2'})
        // 等待页面加载完成
        if (opt.selector)  await page.waitForSelector(opt.selector)
        if (opt.wait) await page.waitForTimeout(opt.wait)
        if (opt.func) await page.waitForFunction(opt.func)
        // 将页面保存为图片，比如example.png，你可以自己指定图片的格式和质量等选项
        let base64 = await page.screenshot({ encoding: 'base64', fullPage: true })
        // 关闭页面
        await page.close()
        return base64
    } catch (e) {
        return false
    }
}

// 检查网址能否访问
export async function checkWebsite(url) {
    try {
        const response = await fetch(url)
        return response.ok
    } catch (error) {
        console.log(error)
        return false
    }
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