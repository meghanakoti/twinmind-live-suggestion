"use client";

import { useEffect, useState } from "react";
import type { AppSettings } from "../types";
import { defaultSettings } from "../lib/defaults";

type Props = {
  open: boolean;
  settings: AppSettings | null;
  onClose: () => void;
  onSave: (settings: AppSettings) => void;
};

export default function SettingsModal({ open, settings, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<AppSettings | null>(settings);

  useEffect(() => {
    if (settings) setDraft(settings);
  }, [settings]);

  if (!open || !settings || !draft) return null;

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    setDraft((prev) => prev ? { ...prev, [key]: value } : prev);

  const reset = (key: keyof AppSettings) =>
    setDraft((prev) => prev ? { ...prev, [key]: defaultSettings[key] } : prev);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="space-y-5">

          {/* API */}
          <section>
            <h3 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">API</h3>
            <Field label="Groq API Key">
              <input
                type="password"
                value={draft.groqApiKey}
                onChange={(e) => update("groqApiKey", e.target.value)}
                placeholder="gsk_..."
                className="w-full bg-zinc-800 px-3 py-2 rounded-lg text-sm outline-none border border-zinc-700 focus:border-zinc-500"
              />
            </Field>
          </section>

          {/* Models */}
          <section>
            <h3 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Models</h3>
            <div className="space-y-3">
              <Field label="Transcription Model">
                <input
                  value={draft.transcriptionModel}
                  onChange={(e) => update("transcriptionModel", e.target.value)}
                  className="w-full bg-zinc-800 px-3 py-2 rounded-lg text-sm outline-none border border-zinc-700 focus:border-zinc-500"
                />
              </Field>
              <Field label="Suggestion Model">
                <input
                  value={draft.suggestionModel}
                  onChange={(e) => update("suggestionModel", e.target.value)}
                  className="w-full bg-zinc-800 px-3 py-2 rounded-lg text-sm outline-none border border-zinc-700 focus:border-zinc-500"
                />
              </Field>
              <Field label="Chat Model">
                <input
                  value={draft.chatModel}
                  onChange={(e) => update("chatModel", e.target.value)}
                  className="w-full bg-zinc-800 px-3 py-2 rounded-lg text-sm outline-none border border-zinc-700 focus:border-zinc-500"
                />
              </Field>
            </div>
          </section>

          {/* Timing */}
          <section>
            <h3 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Context & Timing</h3>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Suggestion Context (chars)">
                <input
                  type="number"
                  value={draft.suggestionContextChars}
                  onChange={(e) => update("suggestionContextChars", Number(e.target.value))}
                  className="w-full bg-zinc-800 px-3 py-2 rounded-lg text-sm outline-none border border-zinc-700 focus:border-zinc-500"
                />
              </Field>
              <Field label="Expanded Context (chars)">
                <input
                  type="number"
                  value={draft.expandedContextChars}
                  onChange={(e) => update("expandedContextChars", Number(e.target.value))}
                  className="w-full bg-zinc-800 px-3 py-2 rounded-lg text-sm outline-none border border-zinc-700 focus:border-zinc-500"
                />
              </Field>
              <Field label="Refresh Interval (seconds)">
                <input
                  type="number"
                  value={draft.refreshIntervalSeconds}
                  onChange={(e) => update("refreshIntervalSeconds", Number(e.target.value))}
                  className="w-full bg-zinc-800 px-3 py-2 rounded-lg text-sm outline-none border border-zinc-700 focus:border-zinc-500"
                />
              </Field>
            </div>
          </section>

          {/* Prompts */}
          <section>
            <h3 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Prompts</h3>
            <div className="space-y-4">
              <PromptField
                label="Live Suggestion Prompt"
                value={draft.liveSuggestionPrompt}
                onChange={(v) => update("liveSuggestionPrompt", v)}
                onReset={() => reset("liveSuggestionPrompt")}
                rows={8}
              />
              <PromptField
                label="Expanded Answer Prompt (on suggestion click)"
                value={draft.expandedAnswerPrompt}
                onChange={(v) => update("expandedAnswerPrompt", v)}
                onReset={() => reset("expandedAnswerPrompt")}
                rows={6}
              />
              <PromptField
                label="Chat System Prompt"
                hint="Use {TRANSCRIPT} where the transcript should be injected."
                value={draft.chatPrompt}
                onChange={(v) => update("chatPrompt", v)}
                onReset={() => reset("chatPrompt")}
                rows={5}
              />
            </div>
          </section>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition">
            Cancel
          </button>
          <button
            onClick={() => { onSave(draft); onClose(); }}
            className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-lg text-sm font-medium transition"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-zinc-300 mb-1">{label}</label>
      {hint && <p className="text-[11px] text-zinc-500 mb-1">{hint}</p>}
      {children}
    </div>
  );
}

function PromptField({
  label, hint, value, onChange, onReset, rows,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  onReset: () => void;
  rows?: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm text-zinc-300">{label}</label>
        <button
          onClick={onReset}
          className="text-[10px] text-zinc-500 hover:text-zinc-300 transition"
        >
          Reset to default
        </button>
      </div>
      {hint && <p className="text-[11px] text-zinc-500 mb-1">{hint}</p>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows ?? 5}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 font-mono outline-none focus:border-zinc-500 resize-y"
      />
    </div>
  );
}