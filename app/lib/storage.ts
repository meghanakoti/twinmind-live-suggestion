import type { AppSettings } from "../types";
import { defaultSettings } from "./defaults";

const SETTINGS_KEY = "twinmind-settings-v2";

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;

    const saved = JSON.parse(raw);

    // Prompts always come from defaults — never persisted to localStorage
    // Only API key, models, and numeric settings are restored from storage
    return {
      ...defaultSettings,
      groqApiKey: saved.groqApiKey ?? defaultSettings.groqApiKey,
      transcriptionModel: saved.transcriptionModel ?? defaultSettings.transcriptionModel,
      suggestionModel: saved.suggestionModel ?? defaultSettings.suggestionModel,
      chatModel: saved.chatModel ?? defaultSettings.chatModel,
      suggestionContextChars: saved.suggestionContextChars ?? defaultSettings.suggestionContextChars,
      expandedContextChars: saved.expandedContextChars ?? defaultSettings.expandedContextChars,
      refreshIntervalSeconds: saved.refreshIntervalSeconds ?? defaultSettings.refreshIntervalSeconds,
    };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  try {
    // Only persist non-prompt settings
    // Prompts are always loaded fresh from defaults.ts
    const toSave = {
      groqApiKey: settings.groqApiKey,
      transcriptionModel: settings.transcriptionModel,
      suggestionModel: settings.suggestionModel,
      chatModel: settings.chatModel,
      suggestionContextChars: settings.suggestionContextChars,
      expandedContextChars: settings.expandedContextChars,
      refreshIntervalSeconds: settings.refreshIntervalSeconds,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(toSave));
  } catch (err) {
    console.error("Failed to save settings:", err);
  }
}