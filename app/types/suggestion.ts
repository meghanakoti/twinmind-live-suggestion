export type SuggestionType =
  | "QUESTION"
  | "INSIGHT"
  | "ANSWER"
  | "FACT_CHECK"
  | "CLARIFY";

export interface Suggestion {
  id?: string;
  type: SuggestionType;
  preview: string;
  expandPrompt: string;
}

export interface SuggestionResponse {
  suggestions: Suggestion[];
}