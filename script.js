const form = document.querySelector("#registrationForm");
const submitButton = document.querySelector("#submitButton");
const statusMessage = document.querySelector("#statusMessage");
const submitDate = document.querySelector('input[name="submitDate"]');

submitDate.valueAsDate = new Date();

function setStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = type;
}

function collectFormData(formElement) {
  const data = Object.fromEntries(new FormData(formElement).entries());
  data.agreement = formElement.elements.agreement.checked;
  return data;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("正在提交，请稍候...");
  submitButton.disabled = true;

  try {
    const response = await fetch("/api/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(collectFormData(form))
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
