import type { SaveLinkResult, ExtensionSettings } from "../types/index.js";
import { DEFAULT_SETTINGS } from "../types/index.js";

// Chrome exposes `chrome`, Safari/Firefox expose `browser`
const browser = globalThis.browser ?? globalThis.chrome;

const saveBtn = document.getElementById("save-btn") as HTMLButtonElement;
const currentUrlEl = document.getElementById("current-url") as HTMLDivElement;
const statusMessageEl = document.getElementById(
  "status-message",
) as HTMLDivElement;
const apiKeyInput = document.getElementById("api-key") as HTMLInputElement;
const apiEndpointInput = document.getElementById(
  "api-endpoint",
) as HTMLInputElement;
const saveSettingsBtn = document.getElementById(
  "save-settings-btn",
) as HTMLButtonElement;
const settingsMessageEl = document.getElementById(
  "settings-message",
) as HTMLDivElement;
const titleInput = document.getElementById("link-title") as HTMLInputElement;
const summaryInput = document.getElementById(
  "link-summary",
) as HTMLTextAreaElement;
const toggleApiKeyBtn = document.getElementById(
  "toggle-api-key",
) as HTMLButtonElement;
const eyeIcon = document.getElementById("eye-icon") as HTMLElement;
const eyeOffIcon = document.getElementById("eye-off-icon") as HTMLElement;

let activeTabUrl = "";

function showStatus(
  element: HTMLDivElement,
  message: string,
  isSuccess: boolean,
): void {
  element.textContent = message;
  element.className = `status-message ${isSuccess ? "success" : "error"}`;
  setTimeout(() => {
    element.className = "status-message hidden";
  }, 4000);
}

function toggleApiKeyVisibility(): void {
  const isPassword = apiKeyInput.type === "password";
  apiKeyInput.type = isPassword ? "text" : "password";
  eyeIcon.classList.toggle("hidden", isPassword);
  eyeOffIcon.classList.toggle("hidden", !isPassword);
}

async function loadActiveTab(): Promise<void> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    activeTabUrl = tab.url;
    currentUrlEl.textContent = tab.url;
    if (tab.title) {
      titleInput.value = tab.title;
    }
  } else {
    currentUrlEl.textContent = "No URL available";
    saveBtn.disabled = true;
  }
}

async function loadSettings(): Promise<void> {
  const result = await browser.storage.sync.get("settings");
  const settings: ExtensionSettings = {
    ...DEFAULT_SETTINGS,
    ...result.settings,
  };
  apiKeyInput.value = settings.apiKey;
  apiEndpointInput.value = settings.apiEndpoint;
}

async function handleSaveLink(): Promise<void> {
  if (!activeTabUrl) return;

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  const title = titleInput.value.trim() || undefined;
  const summary = summaryInput.value.trim() || undefined;

  const result: SaveLinkResult = await browser.runtime.sendMessage({
    type: "SAVE_LINK",
    url: activeTabUrl,
    title,
    summary,
  });

  saveBtn.disabled = false;
  saveBtn.textContent = "Save to Linkblog";

  if (result.success) {
    showStatus(statusMessageEl, `Saved: ${result.title ?? "Link saved"}`, true);
  } else {
    showStatus(statusMessageEl, result.error ?? "Failed to save", false);
  }
}

async function handleSaveSettings(): Promise<void> {
  const settings: ExtensionSettings = {
    apiKey: apiKeyInput.value.trim(),
    apiEndpoint: apiEndpointInput.value.trim() || DEFAULT_SETTINGS.apiEndpoint,
  };

  await browser.storage.sync.set({ settings });
  showStatus(settingsMessageEl, "Settings saved", true);
}

saveBtn.addEventListener("click", handleSaveLink);
saveSettingsBtn.addEventListener("click", handleSaveSettings);
toggleApiKeyBtn.addEventListener("click", toggleApiKeyVisibility);

loadActiveTab();
loadSettings();
