const urlInput = document.getElementById("urlInput");
const extractBtn = document.getElementById("extractBtn");
const output = document.getElementById("output");
const endPoint = "/transcript";

extractBtn.addEventListener("click", async () => {
  const url = urlInput.value;
  output.textContent = "Loading...";
  extractBtn.disabled = true;

  try {
    const response = await fetch(endPoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url
      })
    });

    const data = await response.json();
    if(!data.success)
    {
      output.textContent = data.error;
      return;
    }

    output.textContent = data.transcript;
    urlInput.value = "";
    
  } catch (error) {
    console.error(error);
  } finally {
    extractBtn.disabled = false;
  }
});