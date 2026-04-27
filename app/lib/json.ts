import type { SuggestionResponse, SuggestionType } from "../types/suggestion";

const VALID_TYPES: SuggestionType[] = [
  "QUESTION",
  "INSIGHT",
  "ANSWER",
  "FACT_CHECK",
  "CLARIFY",
];

export function stripMarkdownFences(value: string): string {
  return value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

// Normalize type strings — handles spaces, lowercase, pipe chars
function normalizeType(raw: unknown): SuggestionType | null {
  if (typeof raw !== "string") return null;
  const normalized = raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z_]/g, "")
    .replace(/^_+|_+$/g, "");
  return VALID_TYPES.includes(normalized as SuggestionType)
    ? (normalized as SuggestionType)
    : null;
}

export function parseSuggestionResponse(raw: string): SuggestionResponse {
  const cleaned = stripMarkdownFences(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("JSON parse failed. Raw:", cleaned.slice(0, 300));
    throw new Error("Model did not return valid JSON");
  }

  // Handle bare array — model returned [...] instead of {"suggestions": [...]}
  if (Array.isArray(parsed)) {
    console.warn("Model returned bare array — wrapping in {suggestions: [...]}");
    parsed = { suggestions: parsed };
  }

  // Normalize type fields before validation
  if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as { suggestions?: unknown[] }).suggestions)
  ) {
    const p = parsed as { suggestions: { type?: unknown }[] };
    p.suggestions = p.suggestions.map((item) => ({
      ...item,
      type: normalizeType(item.type) ?? item.type,
    }));
  }

  console.log("Parsed suggestion response:", JSON.stringify(parsed, null, 2));

  if (!isSuggestionResponse(parsed)) {
    if (parsed && typeof parsed === "object") {
      const p = parsed as { suggestions?: unknown[] };
      if (!Array.isArray(p.suggestions)) {
        console.error("Validation failed: suggestions is not an array", parsed);
      } else {
        console.error(`Validation failed: got ${p.suggestions.length} suggestions`);
        p.suggestions.forEach((item, i) => {
          const s = item as { type?: unknown; preview?: unknown; expandPrompt?: unknown };
          const typeValid = VALID_TYPES.includes(s?.type as SuggestionType);
          const previewValid = typeof s?.preview === "string" && s.preview.trim().length > 0;
          const expandValid = typeof s?.expandPrompt === "string" && s.expandPrompt.trim().length > 0;
          if (!typeValid || !previewValid || !expandValid) {
            console.error(`Item ${i} failed:`, { type: s?.type, typeValid, previewValid, expandValid });
          }
        });
      }
    }
    throw new Error("Suggestion response schema is invalid");
  }

  const now = new Date().toISOString();
  const batchId = crypto.randomUUID();

  return {
    suggestions: parsed.suggestions.map((item) => ({
      id: crypto.randomUUID(),
      batchId,
      type: item.type,
      preview: item.preview,
      expandPrompt: item.expandPrompt,
      createdAt: now,
    })),
  };
}

function isSuggestionResponse(value: unknown): value is SuggestionResponse {
  if (!value || typeof value !== "object") return false;
  const maybe = value as { suggestions?: unknown[] };
  if (!Array.isArray(maybe.suggestions)) return false;
  if (maybe.suggestions.length < 1) return false;

  return maybe.suggestions.every((item) => {
    if (!item || typeof item !== "object") return false;
    const s = item as { type?: unknown; preview?: unknown; expandPrompt?: unknown };
    if (!VALID_TYPES.includes(s.type as SuggestionType)) return false;
    if (typeof s.preview !== "string" || !s.preview.trim()) return false;
    if (typeof s.expandPrompt !== "string" || !s.expandPrompt.trim()) return false;
    return true;
  });
}