const appShell = document.getElementById("appShell");
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebarClose = document.getElementById("sidebarClose");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
const newTranscriptBtn = document.getElementById("newTranscriptBtn");
const historyList = document.getElementById("historyList");

const urlInput = document.getElementById("urlInput");
const extractBtn = document.getElementById("extractBtn");
const status = document.getElementById("status");
const resultSection = document.getElementById("resultSection");
const output = document.getElementById("output");
const resultTitle = document.getElementById("resultTitle");
const copyBtn = document.getElementById("copyBtn");

const guestSidebarCard = document.getElementById("guestSidebarCard");
const sidebarSignInBtn = document.getElementById("sidebarSignInBtn");
const sidebarRegisterBtn = document.getElementById("sidebarRegisterBtn");
const userMenu = document.getElementById("userMenu");
const userPanelBtn = document.getElementById("userPanelBtn");
const accountPopover = document.getElementById("accountPopover");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");
const userUsername = document.getElementById("userUsername");
const userAvatar = document.getElementById("userAvatar");

const authDialog = document.getElementById("authDialog");
const authDialogTitle = document.getElementById("authDialogTitle");
const authDialogDescription = document.getElementById("authDialogDescription");
const authStatus = document.getElementById("authStatus");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginSwitch = document.getElementById("loginSwitch");
const registerSwitch = document.getElementById("registerSwitch");

const TRANSCRIPT_ENDPOINT = "/transcript";
const EXTRACT_LABEL = extractBtn.textContent.trim();

let currentUser = null;
let historyItems = [];
let selectedHistoryId = null;
let authMode = "login";

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function getErrorMessage(response, data) {
  if (typeof data?.detail === "string") return data.detail;
  if (response.status === 401) return "Please sign in to continue.";
  if (response.status === 422)
    return "Please check the information you entered.";
  return "An unexpected error occurred. Please try again.";
}

async function requestJson(url, options = {}) {
  const headers = { ...options.headers };
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(getErrorMessage(response, data));
    error.status = response.status;
    throw error;
  }

  return data;
}

// Side menu (hamburger drawer).
function setSidebarOpen(isOpen) {
  appShell.classList.toggle("sidebar-open", isOpen);
  sidebarToggle.setAttribute("aria-expanded", String(isOpen));

  if (isOpen) {
    newTranscriptBtn.focus();
    return;
  }

  setAccountMenuOpen(false);
  // Don't leave keyboard focus stranded inside the hidden menu.
  const focusIsInside =
    sidebar.contains(document.activeElement) ||
    document.activeElement === sidebarBackdrop;
  if (focusIsInside) sidebarToggle.focus();
}

function toggleSidebar() {
  setSidebarOpen(!appShell.classList.contains("sidebar-open"));
}

function closeSidebar() {
  setSidebarOpen(false);
}

function setAccountMenuOpen(isOpen) {
  accountPopover.hidden = !isOpen;
  userPanelBtn.setAttribute("aria-expanded", String(isOpen));
}

// Sign in / create account dialog.
function openAuthDialog(mode = "login") {
  if (!authDialog.open) authDialog.showModal();
  setAuthMode(mode);
}

function setAuthMode(mode) {
  authMode = mode;
  const isLogin = mode === "login";

  loginForm.hidden = !isLogin;
  registerForm.hidden = isLogin;
  loginSwitch.hidden = !isLogin;
  registerSwitch.hidden = isLogin;
  authDialogTitle.textContent = isLogin
    ? "Welcome back"
    : "Create your account";
  authDialogDescription.textContent = isLogin
    ? "Sign in to access your saved transcripts."
    : "Create an account to keep your transcript history.";
  authStatus.textContent = "";
  authStatus.classList.remove("error");
  (isLogin ? loginForm : registerForm).querySelector("input")?.focus();
}

function renderAccount() {
  const isAuthenticated = Boolean(currentUser);
  guestSidebarCard.hidden = isAuthenticated;
  userMenu.hidden = !isAuthenticated;

  if (!isAuthenticated) {
    setAccountMenuOpen(false);
    return;
  }

  const displayName = currentUser.name || currentUser.username;
  userName.textContent = displayName;
  userUsername.textContent = `@${currentUser.username}`;
  userAvatar.textContent = displayName.trim().charAt(0).toUpperCase() || "U";
}

async function refreshAuthState() {
  const data = await requestJson("/auth/me");
  currentUser = data.authenticated ? data : null;
  renderAccount();

  if (currentUser) {
    await loadHistory();
  } else {
    historyItems = [];
    selectedHistoryId = null;
    renderHistory();
  }
}

function formatHistoryDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const dayDifference = Math.round((todayDay - dateDay) / 86400000);

  if (dayDifference === 0) return "Today";
  if (dayDifference === 1) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  }).format(date);
}

function getHistoryGroup(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Older";

  const today = new Date();
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const dayDifference = Math.floor((todayDay - dateDay) / 86400000);

  if (dayDifference <= 0) return "Today";
  if (dayDifference === 1) return "Yesterday";
  if (dayDifference <= 7) return "Previous 7 days";
  return "Older";
}

function createHistoryItem(item) {
  const wrapper = document.createElement("div");
  wrapper.className = "history-item-wrapper";
  if (String(item.id) === String(selectedHistoryId)) {
    wrapper.classList.add("selected");
  }

  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "history-item";
  openButton.title = item.title || "Untitled video";
  openButton.setAttribute(
    "aria-label",
    `Open ${item.title || "untitled transcript"}`,
  );

  const title = document.createElement("span");
  title.className = "history-item-title";
  title.textContent = item.title || "Untitled video";

  const date = document.createElement("span");
  date.className = "history-item-date";
  date.textContent = formatHistoryDate(item.created_at);

  openButton.append(title, date);
  openButton.addEventListener("click", () => openSavedTranscript(item.id));

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "history-delete-btn";
  deleteButton.textContent = "×";
  deleteButton.title = "Delete transcript";
  deleteButton.setAttribute(
    "aria-label",
    `Delete ${item.title || "untitled transcript"}`,
  );
  deleteButton.addEventListener("click", () =>
    deleteSavedTranscript(item.id, item.title),
  );

  wrapper.append(openButton, deleteButton);
  return wrapper;
}

function renderHistory() {
  historyList.replaceChildren();

  if (!currentUser) {
    const message = document.createElement("p");
    message.className = "sidebar-message";
    message.textContent = "Sign in to save and revisit your transcripts.";
    historyList.append(message);
    return;
  }

  if (historyItems.length === 0) {
    const message = document.createElement("p");
    message.className = "sidebar-message";
    message.textContent = "Your saved transcripts will appear here.";
    historyList.append(message);
    return;
  }

  const groupOrder = ["Today", "Yesterday", "Previous 7 days", "Older"];
  const groups = new Map(groupOrder.map((label) => [label, []]));

  for (const item of historyItems) {
    const group = getHistoryGroup(item.created_at);
    groups.get(group).push(item);
  }

  for (const groupName of groupOrder) {
    const items = groups.get(groupName);
    if (!items.length) continue;

    const section = document.createElement("section");
    section.className = "history-group";

    const heading = document.createElement("h3");
    heading.className = "history-group-heading";
    heading.textContent = groupName;
    section.append(heading);

    for (const item of items) {
      section.append(createHistoryItem(item));
    }

    historyList.append(section);
  }
}

async function loadHistory() {
  try {
    const data = await requestJson("/history");
    // Supports either a plain list or the { items: [...] } response shape.
    historyItems = Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
        ? data.items
        : [];
    renderHistory();
  } catch (error) {
    console.error("Could not load transcript history:", error);
    if (error.status === 401) {
      currentUser = null;
      renderAccount();
      renderHistory();
      return;
    }

    historyList.replaceChildren();
    const message = document.createElement("p");
    message.className = "sidebar-message error-text";
    message.textContent = "Couldn't load your history. Please try again.";
    historyList.append(message);
  }
}

async function openSavedTranscript(transcriptId) {
  closeSidebar();
  setStatus("Loading transcript...");

  try {
    const transcript = await requestJson(
      `/history/${encodeURIComponent(transcriptId)}`,
    );
    selectedHistoryId = transcript.id;
    resultTitle.textContent = transcript.title || "Untitled video";
    output.textContent = transcript.transcript || "";
    urlInput.value = transcript.video_url || "";
    setStatus("");
    renderHistory();
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error("Could not open saved transcript:", error);
    setStatus(error.message || "Couldn't open this transcript.", true);
  }
}

async function deleteSavedTranscript(transcriptId, title) {
  const confirmed = window.confirm(
    `Delete "${title || "Untitled video"}" from your history?`,
  );
  if (!confirmed) return;

  try {
    await requestJson(`/history/${encodeURIComponent(transcriptId)}`, {
      method: "DELETE",
    });

    if (String(selectedHistoryId) === String(transcriptId)) {
      selectedHistoryId = null;
      output.textContent = "";
      resultTitle.textContent = "Transcript";
      urlInput.value = "";
    }

    await loadHistory();
    setStatus("Transcript deleted.");
  } catch (error) {
    console.error("Could not delete transcript:", error);
    setStatus(error.message || "Couldn't delete this transcript.", true);
  }
}

function startNewTranscript() {
  selectedHistoryId = null;
  urlInput.value = "";
  output.textContent = "";
  resultTitle.textContent = "Transcript";
  setStatus("");
  renderHistory();
  closeSidebar();
  urlInput.focus();
}

async function extractTranscript() {
  if (extractBtn.disabled) return;

  const url = urlInput.value.trim();
  if (!url) {
    setStatus("Please paste a YouTube link.", true);
    urlInput.focus();
    return;
  }

  selectedHistoryId = null;
  setStatus("Fetching the transcript. This can take a few seconds...");
  output.textContent = "";
  resultTitle.textContent = "Transcript";
  renderHistory();
  extractBtn.disabled = true;
  extractBtn.classList.add("is-loading");
  extractBtn.textContent = "Extracting...";

  try {
    const data = await requestJson(TRANSCRIPT_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({ url }),
    });

    output.textContent = data.transcript || "";
    resultTitle.textContent = data.title || "Transcript";

    if (data.transcript) {
      resultSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    if (data.saved) {
      setStatus("Transcript extracted and saved to your history.");
      await loadHistory();
    } else if (currentUser) {
      setStatus(
        "Transcript extracted, but couldn't be saved to your history.",
        true,
      );
    } else {
      setStatus("");
    }
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Something went wrong. Please try again.", true);
  } finally {
    extractBtn.disabled = false;
    extractBtn.classList.remove("is-loading");
    extractBtn.textContent = EXTRACT_LABEL;
  }
}

async function handleAuthSubmit(event, mode) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  authStatus.textContent =
    mode === "login" ? "Signing in..." : "Creating account...";
  authStatus.classList.remove("error");

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  try {
    await requestJson(`/auth/${mode === "login" ? "login" : "register"}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    await refreshAuthState();
    authDialog.close();
    form.reset();
    setStatus(
      mode === "login"
        ? "Signed in successfully."
        : "Your account has been created.",
    );
  } catch (error) {
    console.error("Authentication failed:", error);
    authStatus.textContent =
      error.message || "Authentication failed. Please try again.";
    authStatus.classList.add("error");
  } finally {
    submitButton.disabled = false;
  }
}

async function logout() {
  logoutBtn.disabled = true;

  try {
    await requestJson("/auth/logout", { method: "POST" });
    currentUser = null;
    historyItems = [];
    selectedHistoryId = null;
    renderAccount();
    renderHistory();
    output.textContent = "";
    resultTitle.textContent = "Transcript";
    urlInput.value = "";
    setStatus("You have been logged out.");
    sidebarSignInBtn.focus();
  } catch (error) {
    console.error("Logout failed:", error);
    setStatus(error.message || "Couldn't log out. Please try again.", true);
  } finally {
    logoutBtn.disabled = false;
  }
}

// Side menu controls.
sidebarToggle.addEventListener("click", toggleSidebar);
sidebarClose.addEventListener("click", closeSidebar);
sidebarBackdrop.addEventListener("click", closeSidebar);
newTranscriptBtn.addEventListener("click", startNewTranscript);

// Account popup (opens from the user card at the bottom of the menu).
userPanelBtn.addEventListener("click", () =>
  setAccountMenuOpen(accountPopover.hidden),
);
logoutBtn.addEventListener("click", logout);

// Clicking anywhere outside the account popup closes it.
document.addEventListener("click", (event) => {
  if (!accountPopover.hidden && !userMenu.contains(event.target)) {
    setAccountMenuOpen(false);
  }
});

// Escape closes the account popup first, then the menu.
// (The sign-in dialog handles its own Escape.)
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || authDialog.open) return;

  if (!accountPopover.hidden) {
    setAccountMenuOpen(false);
    userPanelBtn.focus();
  } else if (appShell.classList.contains("sidebar-open")) {
    setSidebarOpen(false);
  }
});

// Authentication controls.
sidebarSignInBtn.addEventListener("click", () => openAuthDialog("login"));
sidebarRegisterBtn.addEventListener("click", () => openAuthDialog("register"));
document
  .getElementById("closeAuthDialog")
  .addEventListener("click", () => authDialog.close());
document
  .getElementById("showRegisterBtn")
  .addEventListener("click", () => setAuthMode("register"));
document
  .getElementById("showLoginBtn")
  .addEventListener("click", () => setAuthMode("login"));
loginForm.addEventListener("submit", (event) =>
  handleAuthSubmit(event, "login"),
);
registerForm.addEventListener("submit", (event) =>
  handleAuthSubmit(event, "register"),
);

authDialog.addEventListener("click", (event) => {
  if (event.target === authDialog) authDialog.close();
});

// Clear stale errors and typed passwords whenever the dialog closes.
authDialog.addEventListener("close", () => {
  loginForm.reset();
  registerForm.reset();
  authStatus.textContent = "";
  authStatus.classList.remove("error");
});

// Transcript extraction.
extractBtn.addEventListener("click", extractTranscript);
urlInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") extractTranscript();
});
urlInput.addEventListener("input", () => {
  if (status.classList.contains("error")) setStatus("");
});
urlInput.addEventListener("focus", () => urlInput.select());

// Copy transcript.
copyBtn.addEventListener("click", async () => {
  if (!output.textContent) return;

  try {
    await navigator.clipboard.writeText(output.textContent);
    copyBtn.textContent = "Copied!";
  } catch (error) {
    console.error(error);
    copyBtn.textContent = "Copy failed";
  }

  window.setTimeout(() => {
    copyBtn.textContent = "Copy";
  }, 1500);
});

// Autofocus the input on desktop only (on phones it pops the keyboard open).
if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  urlInput.focus();
}

// Restore the login session and history when the page opens.
(async function initializeApp() {
  try {
    await refreshAuthState();
  } catch (error) {
    // The extractor remains available to guests even if auth status can't be checked.
    console.error("Could not restore authentication state:", error);
    currentUser = null;
    renderAccount();
    renderHistory();
  }
})();
