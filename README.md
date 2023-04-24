# Yunzai 云转码服务器

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
option.timeout|int     |访问超时时间
type|string     |返回类型,可选base64和image
