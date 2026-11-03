// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const TRANSCRIPT_ENDPOINT = "/transcript";
const DEFAULT_TITLE = "Transcript";
const UNTITLED_TITLE = "Untitled video";
const STATUS_DURATION_MS = 3000;
const COPY_FEEDBACK_MS = 1500;
const MS_PER_DAY = 86_400_000;
const HISTORY_GROUPS = ["Today", "Yesterday", "Previous 7 days", "Older"];

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);

// Layout
const appShell = $("appShell");
const sidebar = $("sidebar");
const sidebarToggle = $("sidebarToggle");
const sidebarClose = $("sidebarClose");
const sidebarBackdrop = $("sidebarBackdrop");
const newTranscriptBtn = $("newTranscriptBtn");
const historyList = $("historyList");
const pageHeader = $("pageHeader");

// Extractor
const extractControls = $("extractControls");
const urlInput = $("urlInput");
const extractBtn = $("extractBtn");
const statusEl = $("status");
const resultSection = $("resultSection");
const resultTitle = $("resultTitle");
const output = $("output");
const copyBtn = $("copyBtn");

// Account
const guestActions = $("guestActions");
const guestSidebarCard = $("guestSidebarCard");
const userPanel = $("userPanel");
const userName = $("userName");
const userUsername = $("userUsername");
const userAvatar = $("userAvatar");
const signInBtn = $("signInBtn");
const sidebarSignInBtn = $("sidebarSignInBtn");
const registerBtn = $("registerBtn");
const logoutBtn = $("logoutBtn");

// Auth dialog
const authDialog = $("authDialog");
const authDialogTitle = $("authDialogTitle");
const authDialogDescription = $("authDialogDescription");
const authStatus = $("authStatus");
const loginForm = $("loginForm");
const registerForm = $("registerForm");
const loginSwitch = $("loginSwitch");
const registerSwitch = $("registerSwitch");
const closeAuthDialogBtn = $("closeAuthDialog");
const showRegisterBtn = $("showRegisterBtn");
const showLoginBtn = $("showLoginBtn");

// Media queries
const mobileQuery = window.matchMedia("(max-width: 760px)");
const reducedMotionQuery = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
);

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let currentUser = null;
let historyItems = [];
let selectedHistoryId = null;
let latestRequest = 0; // bumped by every request that updates the main view
let statusTimeout;
let copyTimeout;

// ---------------------------------------------------------------------------
// Status messages
// ---------------------------------------------------------------------------
function setStatus(message, isError = false) {
  clearTimeout(statusTimeout);
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function showTemporaryStatus(message, duration = STATUS_DURATION_MS) {
  setStatus(message);
  statusTimeout = setTimeout(() => setStatus(""), duration);
}

function setAuthStatus(message, isError = false) {
  authStatus.textContent = message;
  authStatus.classList.toggle("error", isError);
}

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------
function getErrorMessage(response, data) {
  if (typeof data?.detail === "string") return data.detail;
  if (response.status === 401) return "Please sign in to continue.";
  if (response.status === 422) {
    return "Please check the information you entered.";
  }
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

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------
function isSidebarOpen() {
  return mobileQuery.matches
    ? appShell.classList.contains("sidebar-open")
    : !appShell.classList.contains("sidebar-collapsed");
}

// Keeps `inert` (no focus/clicks when hidden) and aria-expanded in sync.
function syncSidebarState() {
  const open = isSidebarOpen();
  sidebar.inert = !open;
  sidebarToggle.setAttribute("aria-expanded", String(open));
}

function setSidebarOpen(isOpen) {
  if (mobileQuery.matches) {
    appShell.classList.toggle("sidebar-open", isOpen);
  } else {
    appShell.classList.toggle("sidebar-collapsed", !isOpen);
  }
  syncSidebarState();
}

function toggleSidebar() {
  setSidebarOpen(!isSidebarOpen());
}

function closeMobileSidebar() {
  if (mobileQuery.matches) setSidebarOpen(false);
}

// ---------------------------------------------------------------------------
// Account UI
// ---------------------------------------------------------------------------
function renderAccount() {
  const isAuthenticated = Boolean(currentUser);
  guestActions.hidden = isAuthenticated;
  guestSidebarCard.hidden = isAuthenticated;
  userPanel.hidden = !isAuthenticated;

  if (!isAuthenticated) return;

  const displayName = currentUser.name || currentUser.username;
  userName.textContent = displayName;
  userUsername.textContent = `@${currentUser.username}`;
  // Array.from keeps emoji and other multi-unit characters intact.
  userAvatar.textContent =
    Array.from(displayName.trim())[0]?.toUpperCase() || "U";
}

async function refreshAuthState() {
  const data = await requestJson("/auth/me");
  currentUser = data?.authenticated ? data : null;
  renderAccount();

  if (currentUser) {
    await loadHistory();
  } else {
    historyItems = [];
    selectedHistoryId = null;
    renderHistory();
  }
}

// ---------------------------------------------------------------------------
// Auth dialog
// ---------------------------------------------------------------------------
function setAuthMode(mode) {
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
  setAuthStatus("");
}

function focusAuthForm() {
  authDialog.querySelector("form:not([hidden]) input")?.focus();
}

function openAuthDialog(mode = "login") {
  setAuthMode(mode);
  if (!authDialog.open) authDialog.showModal();
  focusAuthForm();
}

async function handleAuthSubmit(event, mode) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');

  submitButton.disabled = true;
  setAuthStatus(mode === "login" ? "Signing in..." : "Creating account...");

  try {
    await requestJson(`/auth/${mode}`, {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
  } catch (error) {
    console.error("Authentication failed:", error);
    setAuthStatus(
      error.message || "Authentication failed. Please try again.",
      true,
    );
    return;
  } finally {
    submitButton.disabled = false;
  }

  // The credentials were accepted; anything failing below is a different problem.
  authDialog.close();
  form.reset();
  showTemporaryStatus(
    mode === "login"
      ? "Signed in successfully."
      : "Your account has been created.",
  );

  try {
    await refreshAuthState();
  } catch (error) {
    console.error("Could not load account after sign-in:", error);
    setStatus(
      "Signed in, but couldn't load your account. Please refresh the page.",
      true,
    );
  }
}

async function logout() {
  logoutBtn.disabled = true;

  try {
    await requestJson("/auth/logout", { method: "POST" });
    currentUser = null;
    historyItems = [];
    renderAccount();
    resetView();
    showTemporaryStatus("You have been logged out.");
  } catch (error) {
    console.error("Logout failed:", error);
    setStatus(error.message || "Couldn't log out. Please try again.", true);
  } finally {
    logoutBtn.disabled = false;
  }
}

function parseServerDate(value) {
  if (!value) return null;
  const text = String(value).trim().replace(" ", "T");
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
  const date = new Date(hasZone ? text : `${text}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

// Whole calendar days between `date` and today (rounded, so DST can't skew it).
function getDayDifference(date) {
  if (!date) return null;
  return Math.round((startOfDay(new Date()) - startOfDay(date)) / MS_PER_DAY);
}

function formatHistoryDate(value) {
  const date = parseServerDate(value);
  const diff = getDayDifference(date);
  if (diff === null) return "";

  const options =
    diff <= 1
      ? { hour: "2-digit", minute: "2-digit" }
      : {
          month: "short",
          day: "numeric",
          year:
            date.getFullYear() === new Date().getFullYear()
              ? undefined
              : "numeric",
        };

  return new Intl.DateTimeFormat(undefined, options).format(date);
}

function getHistoryGroup(value) {
  const diff = getDayDifference(parseServerDate(value));
  if (diff === null) return "Older";
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff <= 7) return "Previous 7 days";
  return "Older";
}

// ---------------------------------------------------------------------------
// History: rendering
// ---------------------------------------------------------------------------
function renderSidebarMessage(text, isError = false) {
  const message = document.createElement("p");
  message.className = "sidebar-message";
  message.classList.toggle("error-text", isError);
  message.textContent = text;
  historyList.replaceChildren(message);
}

function createHistoryItem(item) {
  const title = item.title || UNTITLED_TITLE;
  const isSelected = String(item.id) === String(selectedHistoryId);

  const wrapper = document.createElement("div");
  wrapper.className = "history-item-wrapper";
  wrapper.classList.toggle("selected", isSelected);

  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "history-item";
  openButton.title = title;
  openButton.setAttribute("aria-label", `Open ${title}`);
  if (isSelected) openButton.setAttribute("aria-current", "true");

  const titleEl = document.createElement("span");
  titleEl.className = "history-item-title";
  titleEl.textContent = title;

  const dateEl = document.createElement("span");
  dateEl.className = "history-item-date";
  dateEl.textContent = formatHistoryDate(item.created_at);

  openButton.append(titleEl, dateEl);
  openButton.addEventListener("click", () => openSavedTranscript(item.id));

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "history-delete-btn";
  deleteButton.textContent = "×";
  deleteButton.title = "Delete transcript";
  deleteButton.setAttribute("aria-label", `Delete ${title}`);
  deleteButton.addEventListener("click", () =>
    deleteSavedTranscript(item.id, title),
  );

  wrapper.append(openButton, deleteButton);
  return wrapper;
}

function renderHistory() {
  if (!currentUser) {
    renderSidebarMessage("Sign in to save and revisit your transcripts.");
    return;
  }

  if (historyItems.length === 0) {
    renderSidebarMessage("Your saved transcripts will appear here.");
    return;
  }

  const groups = new Map(HISTORY_GROUPS.map((label) => [label, []]));
  for (const item of historyItems) {
    groups.get(getHistoryGroup(item.created_at)).push(item);
  }

  const sections = [];
  for (const [groupName, items] of groups) {
    if (items.length === 0) continue;

    const section = document.createElement("section");
    section.className = "history-group";

    const heading = document.createElement("h3");
    heading.className = "history-group-heading";
    heading.textContent = groupName;

    section.append(heading, ...items.map(createHistoryItem));
    sections.push(section);
  }

  historyList.replaceChildren(...sections);
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

    renderSidebarMessage("Couldn't load your history. Please try again.", true);
  }
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------
function renderResult(title, text) {
  resultTitle.textContent = title;
  output.textContent = text;
}

// Single place that returns the page to its blank "new transcript" state.
function resetView() {
  latestRequest++; // discard any response still in flight
  selectedHistoryId = null;
  pageHeader.hidden = false;
  extractControls.hidden = false;
  urlInput.value = "";
  renderResult(DEFAULT_TITLE, "");
  setStatus("");
  renderHistory();
}

function startNewTranscript() {
  resetView();
  closeMobileSidebar();
  urlInput.focus();
}

async function openSavedTranscript(transcriptId) {
  const requestId = ++latestRequest;
  closeMobileSidebar();
  setStatus("Loading transcript...");

  try {
    const transcript = await requestJson(
      `/history/${encodeURIComponent(transcriptId)}`,
    );
    if (requestId !== latestRequest) return; // a newer request took over

    pageHeader.hidden = true;
    extractControls.hidden = true;
    selectedHistoryId = transcript.id;
    urlInput.value = transcript.video_url || "";
    renderResult(
      transcript.title || UNTITLED_TITLE,
      transcript.transcript || "",
    );
    setStatus("");
    renderHistory();

    resultSection.scrollIntoView({
      behavior: reducedMotionQuery.matches ? "auto" : "smooth",
      block: "start",
    });
  } catch (error) {
    if (requestId !== latestRequest) return;
    console.error("Could not open saved transcript:", error);
    setStatus(error.message || "Couldn't open this transcript.", true);
  }
}

async function deleteSavedTranscript(transcriptId, title) {
  if (!window.confirm(`Delete "${title}" from your history?`)) return;

  try {
    await requestJson(`/history/${encodeURIComponent(transcriptId)}`, {
      method: "DELETE",
    });

    historyItems = historyItems.filter(
      (item) => String(item.id) !== String(transcriptId),
    );

    if (String(selectedHistoryId) === String(transcriptId)) {
      resetView(); // also restores the header and input
    } else {
      renderHistory();
    }

    showTemporaryStatus("Transcript deleted.");
  } catch (error) {
    console.error("Could not delete transcript:", error);
    setStatus(error.message || "Couldn't delete this transcript.", true);
  }
}

async function extractTranscript() {
  if (extractBtn.disabled) return;

  const url = urlInput.value.trim();
  if (!url) {
    setStatus("Please paste a YouTube link.", true);
    return;
  }

  const requestId = ++latestRequest;
  selectedHistoryId = null;
  setStatus("Loading...");
  renderResult(DEFAULT_TITLE, "");
  renderHistory();
  extractBtn.disabled = true;

  try {
    const data = await requestJson(TRANSCRIPT_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({ url }),
    });

    if (requestId !== latestRequest) {
      // The view moved on, but a saved transcript should still show in history.
      if (data?.saved) loadHistory();
      return;
    }

    renderResult(data.title || DEFAULT_TITLE, data.transcript || "");

    if (data.saved) {
      showTemporaryStatus("Transcript extracted and saved to your history.");
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
    if (requestId !== latestRequest) return;
    console.error(error);
    setStatus(error.message || "Something went wrong. Please try again.", true);
  } finally {
    extractBtn.disabled = false;
  }
}

async function copyTranscript() {
  const text = output.textContent;
  if (!text) return;

  clearTimeout(copyTimeout);

  try {
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = "Copied!";
  } catch (error) {
    console.error(error);
    copyBtn.textContent = "Copy failed";
  }

  copyTimeout = setTimeout(() => {
    copyBtn.textContent = "Copy";
  }, COPY_FEEDBACK_MS);
}

// ---------------------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------------------

// Sidebar
sidebarToggle.addEventListener("click", toggleSidebar);
sidebarClose.addEventListener("click", () => setSidebarOpen(false));
sidebarBackdrop.addEventListener("click", () => setSidebarOpen(false));
newTranscriptBtn.addEventListener("click", startNewTranscript);

mobileQuery.addEventListener("change", () => {
  appShell.classList.remove("sidebar-open", "sidebar-collapsed");
  syncSidebarState();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && mobileQuery.matches && isSidebarOpen()) {
    setSidebarOpen(false);
    sidebarToggle.focus();
  }
});

// Auth
signInBtn.addEventListener("click", () => openAuthDialog("login"));
sidebarSignInBtn.addEventListener("click", () => {
  closeMobileSidebar();
  openAuthDialog("login");
});
registerBtn.addEventListener("click", () => openAuthDialog("register"));
closeAuthDialogBtn.addEventListener("click", () => authDialog.close());
showRegisterBtn.addEventListener("click", () => openAuthDialog("register"));
showLoginBtn.addEventListener("click", () => openAuthDialog("login"));
loginForm.addEventListener("submit", (event) =>
  handleAuthSubmit(event, "login"),
);
registerForm.addEventListener("submit", (event) =>
  handleAuthSubmit(event, "register"),
);
logoutBtn.addEventListener("click", logout);

// Close on backdrop click only if the press also started on the backdrop,
// so releasing a text-selection drag outside the dialog doesn't close it.
let pressStartedOnBackdrop = false;
authDialog.addEventListener("mousedown", (event) => {
  pressStartedOnBackdrop = event.target === authDialog;
});
authDialog.addEventListener("click", (event) => {
  if (pressStartedOnBackdrop && event.target === authDialog) {
    authDialog.close();
  }
});

// Extraction (Enter and the mobile "Go" key both trigger form submit)
extractControls.addEventListener("submit", (event) => {
  event.preventDefault();
  extractTranscript();
});
urlInput.addEventListener("input", () => {
  if (statusEl.classList.contains("error")) setStatus("");
});
urlInput.addEventListener("focus", () => urlInput.select());

copyBtn.addEventListener("click", copyTranscript);

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
(async function initializeApp() {
  syncSidebarState();

  try {
    await refreshAuthState();
  } catch (error) {
    // The extractor stays usable for guests even if auth can't be checked.
    console.error("Could not restore authentication state:", error);
    currentUser = null;
    renderAccount();
    renderHistory();
  }
})();
