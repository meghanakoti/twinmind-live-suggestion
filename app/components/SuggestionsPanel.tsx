import type { SuggestionBatch } from "../types";

type Props = {
  suggestionBatches: SuggestionBatch[];
  onSuggestionClick: (suggestion: SuggestionBatch["suggestions"][number]) => void;
  isLoading?: boolean;
  error?: string; // Error prop to handle any error message
};

function getSuggestionStyles(type: string) {
  switch (type) {
    case "QUESTION":
      return { border: "border-l-blue-400", badge: "bg-blue-500/15 text-blue-300" };
    case "INSIGHT":
      return { border: "border-l-teal-400", badge: "bg-teal-500/15 text-teal-300" };
    case "ANSWER":
      return { border: "border-l-violet-400", badge: "bg-violet-500/15 text-violet-300" };
    case "FACT_CHECK":
      return { border: "border-l-amber-400", badge: "bg-amber-500/15 text-amber-300" };
    case "CLARIFY":
      return { border: "border-l-pink-400", badge: "bg-pink-500/15 text-pink-300" };
    default:
      return { border: "border-l-zinc-500", badge: "bg-zinc-700 text-zinc-300" };
  }
}

export default function SuggestionsPanel({
  suggestionBatches,
  onSuggestionClick,
  isLoading,
  error,
}: Props) {
  return (
    <div className="bg-zinc-900 rounded-xl p-4 h-full overflow-y-auto flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm text-zinc-400">Live Suggestions</h2>
        {isLoading && (
          <span className="flex items-center gap-1.5 text-[10px] text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            Generating...
          </span>
        )}
      </div>

      {/* Display any errors */}
      {error && (
        <div className="flex-1 flex items-center justify-center mb-4">
          <p className="text-sm text-red-400 text-center">
            {error} {/* Display error message */}
          </p>
        </div>
      )}

      {/* No suggestions case */}
      {suggestionBatches.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-zinc-600 text-center leading-6">
            Start recording and suggestions will appear here every ~30 seconds.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {suggestionBatches.map((batch, batchIndex) => (
            <div
              key={batch.id}
              className="space-y-3 border-t border-zinc-800 pt-4 first:border-t-0 first:pt-0"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  {batchIndex === 0
                    ? "Just now"
                    : new Date(batch.createdAt).toLocaleTimeString()}
                </span>
                {batchIndex === 0 && (
                  <span className="text-[10px] bg-blue-600/20 text-blue-300 px-2 py-1 rounded-full">
                    Latest
                  </span>
                )}
              </div>

              {batch.suggestions.map((suggestion) => {
                const styles = getSuggestionStyles(suggestion.type);
                return (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => onSuggestionClick(suggestion)}
                    className={`w-full text-left bg-zinc-800 p-3 rounded-xl hover:bg-zinc-700 active:scale-[0.98] transition-all border-l-4 ${styles.border} cursor-pointer`}
                  >
                    <div className="mb-2">
                      <span
                        className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full ${styles.badge}`}
                      >
                        {suggestion.type.replace("_", " ")}
                      </span>
                    </div>
                    <div className="text-sm leading-6 text-zinc-100 font-medium">
                      {suggestion.preview}
                    </div>
                    <div className="mt-1 text-[10px] text-zinc-500">
                      Click for detailed answer →
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}