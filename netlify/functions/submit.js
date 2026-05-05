const nodemailer = require("nodemailer");

const fieldLabels = {
  name: "姓名",
  gender: "性别",
  dob: "出生日期",
  nationality: "国籍地区",
  phone: "电话",
  email: "邮箱",
  ageGroup: "年龄组别",
  institution: "选送机构/学校",
  teacher: "指导教师姓名",
  japanFinal: "是否赴日本参加总决赛",
  talent: "决赛艺术特长展示内容",
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

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return "请填写有效邮箱。";
  }

  return "";
}

function buildHtml(data) {
  const rows = Object.entries(fieldLabels)
    .map(([key, label]) => {
      return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(data[key]) || "-"}</td></tr>`;
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
  return Object.entries(fieldLabels)
    .map(([key, label]) => `${label}: ${data[key] || "-"}`)
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

  const smtpHost = process.env.SMTP_HOST || "smtp.qq.com";
  const smtpPort = Number(process.env.SMTP_PORT || 465);
  const smtpSecure = String(process.env.SMTP_SECURE || "true") === "true";
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const mailTo = process.env.MAIL_TO;

  if (!smtpUser || !smtpPass || !mailTo) {
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
    await transporter.sendMail({
      from: `"小主持报名系统" <${smtpUser}>`,
      to: mailTo,
      replyTo: data.email,
      subject: `新报名：${data.name} - 2026 全球华语小主持人大赛`,
      text: buildText(data),
      html: buildHtml(data)
    });

    return json(200, { message: "提交成功。" });
  } catch (error) {
    console.error("Mail send failed:", error);
    return json(500, { message: "邮件发送失败，请稍后再试或联系管理员。" });
  }
};
