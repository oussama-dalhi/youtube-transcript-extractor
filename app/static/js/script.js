const urlInput = document.getElementById("urlInput");
const extractBtn = document.getElementById("extractBtn");
const status = document.getElementById("status");
const output = document.getElementById("output");
const copyBtn = document.getElementById("copyBtn");

const endPoint = "/transcript";

const setStatus = (message, isError = false) => {
  status.textContent = message;
  status.classList.toggle("error", isError);
};

const getErrorMessage = (response, data) => {
  if (typeof data?.detail === "string") return data.detail;
  if (response.status === 422) return "Please paste a valid YouTube link.";
  return "An unexpected error occurred.";
};

async function extractTranscript() {
  const url = urlInput.value.trim();
    if (!url) {
    setStatus("Please paste a YouTube link.", true);
    return;
  }
  setStatus("Loading...");
  output.textContent = "";
  extractBtn.disabled = true;

  try {
    const response = await fetch(endPoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setStatus(getErrorMessage(response, data), true);
      return;
    }

    output.textContent = data.transcript;
    setStatus("");
  } catch (error) {
    console.error(error);
    setStatus(
      "Something went wrong. Please check your connection and try again.",
      true,
    );
  } finally {
    extractBtn.disabled = false;
  }
}
// Handle transcript retrieval
extractBtn.addEventListener("click", extractTranscript);

// enter to submit
urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") extractTranscript();
});

// clear error if user edits input
urlInput.addEventListener("input", () => {
  if (status.classList.contains("error")) setStatus("");
});

urlInput.addEventListener("focus", () => urlInput.select());

// Handle copy
copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(output.textContent);
    copyBtn.textContent = "Copied!";
  } catch (error) {
    console.error(error);
    copyBtn.textContent = "Copy failed";
  }
  setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
});
