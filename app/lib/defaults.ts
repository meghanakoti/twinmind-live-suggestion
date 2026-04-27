import type { AppSettings } from "../types";
import {
  LIVE_SUGGESTION_PROMPT,
  EXPANDED_ANSWER_PROMPT,
  CHAT_SYSTEM_PROMPT,
} from "./prompts";

export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";

export const defaultSettings: AppSettings = {
  transcriptionModel: "whisper-large-v3",
  groqApiKey: "",
  suggestionModel: DEFAULT_GROQ_MODEL,
  chatModel: DEFAULT_GROQ_MODEL,

  liveSuggestionPrompt: LIVE_SUGGESTION_PROMPT,
  expandedAnswerPrompt: EXPANDED_ANSWER_PROMPT,
  chatPrompt: CHAT_SYSTEM_PROMPT,

  suggestionContextChars: 2500,
  expandedContextChars: 8000,
  refreshIntervalSeconds: 30,
};