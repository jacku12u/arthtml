const nodemailer = require("nodemailer");

const fieldLabels = {
  name: "姓名",
  gender: "性别",
  dob: "出生日期",
  nationality: "国籍或地区",
  phone: "电话",
  email: "邮箱或微信",
  ageGroup: "年龄组别",
  institution: "选送机构/学校",
  teacher: "指导教师姓名",
  japanFinal: "是否赴日本参加总决赛",
  talent: "决赛艺术特长展示内容",
  videoUrl: "参赛视频链接",
  videoName: "参赛视频文件名",
  parentName: "家长姓名",
  submitDate: "提交日期"
};

const requiredFields = [
  "name",
  "gender",
  "dob",
  "nationality",
  "phone",
  "email",
  "ageGroup",
  "institution",
  "japanFinal",
  "parentName",
  "submitDate"
];

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify(body)
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function validate(data) {
  if (data.website) {
    return "提交失败。";
  }

  for (const field of requiredFields) {
    if (!String(data[field] || "").trim()) {
      return `请填写${fieldLabels[field]}。`;
    }
  }

  if (!data.agreement) {
    return "请确认报名信息真实有效。";
  }

  return "";
}

function buildHtml(data) {
  const emailData = {
    ...data,
    videoUrl: data.video && data.video.url ? data.video.url : "",
    videoName: data.video && data.video.name ? data.video.name : ""
  };
  const rows = Object.entries(fieldLabels)
    .map(([key, label]) => {
      const value = emailData[key];
      const cell =
        key === "videoUrl" && value
          ? `<a href="${escapeHtml(value)}">${escapeHtml(value)}</a>`
          : escapeHtml(value) || "-";

      return `<tr><th>${escapeHtml(label)}</th><td>${cell}</td></tr>`;
    })
    .join("");

  return `
    <div style="font-family:Arial,'Microsoft YaHei',sans-serif;color:#16202a;">
      <h2>2026 全球华语小主持人大赛报名</h2>
      <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:760px;">
        ${rows}
      </table>
    </div>
  `;
}

function buildText(data) {
  const emailData = {
    ...data,
    videoUrl: data.video && data.video.url ? data.video.url : "",
    videoName: data.video && data.video.name ? data.video.name : ""
  };

  return Object.entries(fieldLabels)
    .map(([key, label]) => `${label}: ${emailData[key] || "-"}`)
    .join("\n");
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

  const validationError = validate(data);
  if (validationError) {
    return json(400, { message: validationError });
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 465);
  const smtpSecure = String(process.env.SMTP_SECURE || "true") === "true";
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const mailTo = process.env.MAIL_TO;

  if (!smtpHost || !smtpUser || !smtpPass || !mailTo) {
    return json(500, { message: "邮件服务未配置，请检查 Netlify 环境变量。" });
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });

  try {
    const message = {
      from: `"小主持报名系统" <${smtpUser}>`,
      to: mailTo,
      subject: `新报名：${data.name} - 2026 全球华语小主持人大赛`,
      text: buildText(data),
      html: buildHtml(data)
    };

    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      message.replyTo = data.email;
    }

    await transporter.sendMail(message);

    return json(200, { message: "提交成功。" });
  } catch (error) {
    console.error("Mail send failed:", error);
    return json(500, { message: "邮件发送失败，请稍后再试或联系管理员。" });
  }
};
