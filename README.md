# 2026 小主持报名网页

这是一个可部署到 Netlify 的静态报名页，提交后通过 Netlify Function 使用 QQ 邮箱 SMTP 发送报名邮件。

## 本地运行

1. 安装 Node.js 18 或更新版本。
2. 在项目目录安装依赖：

```bash
npm install
```

3. 新建 `.env` 文件，参考 `.env.example` 填入邮箱授权码。
4. 启动本地 Netlify 环境：

```bash
npm run dev
```

打开终端提示的本地地址即可测试。

## 部署到 Netlify

1. 把整个项目文件夹上传到 GitHub。
2. 在 Netlify 新建站点，连接这个 GitHub 仓库。
3. Build command 使用 `npm run build`，Publish directory 使用 `.`。
4. 在 Netlify 的 Site configuration -> Environment variables 添加：

```text
SMTP_HOST=你的SMTP服务器地址
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=发件邮箱
SMTP_PASS=QQ邮箱授权码
MAIL_TO=收件邮箱
R2_ACCOUNT_ID=Cloudflare Account ID
R2_ENDPOINT=R2 S3 API 地址
R2_BUCKET_NAME=R2 Bucket 名称
R2_ACCESS_KEY_ID=R2 Access Key ID
R2_SECRET_ACCESS_KEY=R2 Secret Access Key
R2_PUBLIC_BASE_URL=R2 公开访问地址或自定义域名
R2_MAX_VIDEO_SIZE=视频大小上限，单位为字节
```

5. 重新 Deploy。部署完成后，网页提交会调用 `/api/submit` 并发送邮件。

注意：不要把 `.env` 上传到 GitHub，授权码只放在 Netlify 环境变量里。

## 视频上传

视频会先通过 `/api/upload-url` 取得 R2 预签名上传地址，然后由浏览器直接上传到 R2。报名邮件里会包含视频文件名和视频链接。

如果要让邮件里的视频链接可以直接打开，请在 Cloudflare R2 给 Bucket 配置公开访问域名，并把该域名填到 `R2_PUBLIC_BASE_URL`。
