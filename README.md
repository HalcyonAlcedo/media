# Yunzai 云媒体服务器

## 使用说明
使用 `npm insatll` 或 `yarn` 安装依赖,运行执行 `npm run start`启动服务

开放服务器3000端口后即可使用

## 接口文档

### 音频转码
#### 描述
将音频链接、数据、文件转换成SILK格式数据，可直接发送音频文件到接口
#### 请求说明
> 请求方式：POST<br>
请求URL ：[/audio](#)

#### 请求参数
字段         |字段类型    |字段说明
------------|-----------|-----------
recordUrl	|string     |原始音频链接
recordBuffer|object		|原始音频数据
recordBuffer.type|string     |数据类型
recordBuffer.data|array     |数据

---
### 网页截图
#### 描述
将音频链接、数据、文件转换成SILK格式数据，可直接发送音频文件到接口
#### 请求说明
> 请求方式：POST<br>
请求URL ：[/screenshot](#)

#### 请求参数
字段         |字段类型    |字段说明
------------|-----------|-----------
url	|string     |请求的网址
option|object		|参数
option.width|int     |渲染窗口宽度
option.height|int     |渲染窗口高度
option.dpr|int     |渲染DPR
option.timeout|int     |访问超时时间
option.wait|int     |页面等待时间
option.waitUtil|string('load'、'domcontentloaded'、'networkidle0'、'networkidle2') |waitUtil参数
option.func|string |waitFunction参数
option.selector|string     |页面加载完成选择器
type|string     |返回类型,可选base64和image

## chatgpt-plugin专用云服务
将允许chatgpt-plugin插件通过ws连接到此服务，通过云端代理访问数据