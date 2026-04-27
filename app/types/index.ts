
export type Suggestion = {
  id: string;
  batchId: string;
  type: "QUESTION" | "INSIGHT" | "ANSWER" | "FACT_CHECK" | "CLARIFY";
  preview: string;
  expandPrompt: string;
  createdAt: string;
};

export type SuggestionBatch = {
  id: string;
  createdAt: string;
  suggestions: Suggestion[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type AppSettings = {
  groqApiKey: string;
  transcriptionModel: string;
  suggestionModel: string;
  chatModel: string;
  liveSuggestionPrompt: string;
  expandedAnswerPrompt: string;
  chatPrompt: string;
  suggestionContextChars: number;
  expandedContextChars: number;
  refreshIntervalSeconds: number;
}; 