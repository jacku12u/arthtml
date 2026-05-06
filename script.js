const form = document.querySelector("#registrationForm");
const submitButton = document.querySelector("#submitButton");
const statusMessage = document.querySelector("#statusMessage");
const submitDate = document.querySelector('input[name="submitDate"]');
const videoFile = document.querySelector("#videoFile");

submitDate.valueAsDate = new Date();

function setStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = type;
}

function collectFormData(formElement) {
  const data = Object.fromEntries(new FormData(formElement).entries());
  data.agreement = formElement.elements.agreement.checked;
  delete data.videoFile;
  return data;
}

async function uploadVideoIfNeeded() {
  const file = videoFile.files[0];

  if (!file) {
    return null;
  }

  const maxSize = 500 * 1024 * 1024;

  if (!file.type.startsWith("video/")) {
    throw new Error("请上传视频文件。");
  }

  if (file.size > maxSize) {
    throw new Error("视频不能超过 500MB。");
  }

  setStatus("正在准备上传视频...");

  const signResponse = await fetch("/api/upload-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    })
  });

  const signResult = await signResponse.json().catch(() => ({}));

  if (!signResponse.ok) {
    throw new Error(signResult.message || "视频上传地址生成失败。");
  }

  setStatus("正在上传视频，请不要关闭页面...");

  const uploadResponse = await fetch(signResult.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type
    },
    body: file
  });

  if (!uploadResponse.ok) {
    throw new Error("视频上传失败，请稍后再试。");
  }

  return {
    name: file.name,
    size: file.size,
    type: file.type,
    key: signResult.key,
    url: signResult.publicUrl
  };
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("正在提交，请稍候...");
  submitButton.disabled = true;

  try {
    const video = await uploadVideoIfNeeded();
    const payload = collectFormData(form);
    payload.video = video;
    setStatus("视频处理完成，正在提交报名...");

    const response = await fetch("/api/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || "提交失败，请稍后再试。");
    }

    form.reset();
    submitDate.valueAsDate = new Date();
    setStatus("提交成功，报名信息已发送。", "success");
  } catch (error) {
    setStatus(error.message || "提交失败，请稍后再试。", "error");
  } finally {
    submitButton.disabled = false;
  }
});
