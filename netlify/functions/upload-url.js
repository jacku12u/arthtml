const { randomUUID } = require("crypto");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify(body)
  };
}

function sanitizeFileName(fileName) {
  const clean = String(fileName || "video")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return clean || "video";
}

function extensionFromName(fileName) {
  const match = sanitizeFileName(fileName).match(/\.[A-Za-z0-9]{1,8}$/);
  return match ? match[0].toLowerCase() : ".mp4";
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { message: "只支持 POST 请求。" });
  }

  let data;

  try {
    data = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { message: "提交数据格式不正确。" });
  }

  const fileType = String(data.fileType || "");
  const fileSize = Number(data.fileSize || 0);
  const maxSize = Number(process.env.R2_MAX_VIDEO_SIZE || 500 * 1024 * 1024);

  if (!fileType.startsWith("video/")) {
    return json(400, { message: "请上传视频文件。" });
  }

  if (!fileSize || fileSize > maxSize) {
    return json(400, { message: "视频文件过大。" });
  }

  const endpoint =
    process.env.R2_ENDPOINT ||
    (process.env.R2_ACCOUNT_ID
      ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : "");
  const bucket = process.env.R2_BUCKET_NAME;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey || !publicBaseUrl) {
    return json(500, { message: "R2 上传服务未配置完整。" });
  }

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const key = `videos/${month}/${randomUUID()}${extensionFromName(data.fileName)}`;

  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: fileType
  });

  try {
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 });
    const publicUrl = `${publicBaseUrl.replace(/\/$/, "")}/${key}`;

    return json(200, {
      uploadUrl,
      key,
      publicUrl
    });
  } catch (error) {
    console.error("R2 signed URL failed:", error);
    return json(500, { message: "视频上传地址生成失败。" });
  }
};
