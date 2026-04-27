"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Header from "./components/Header";
import TranscriptPanel from "./components/TranscriptPanel";
import SuggestionsPanel from "./components/SuggestionsPanel";
import ChatPanel from "./components/ChatPanel";
import SettingsModal from "./components/SettingsModal";
import type { AppSettings, ChatMessage, Suggestion, SuggestionBatch } from "./types";
import { loadSettings, saveSettings } from "./lib/storage";
import { useLiveTranscription } from "./hooks/useLiveTranscription";

export default function Page() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(30);
  const [suggestionBatches, setSuggestionBatches] = useState<SuggestionBatch[]>([]);
  const [isRefreshingSuggestions, setIsRefreshingSuggestions] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [pendingSuggestionPrompt, setPendingSuggestionPrompt] = useState<string | null>(null);
  const [showMicModal, setShowMicModal] = useState(false);
  const [micPermState, setMicPermState] = useState<"prompt" | "granted" | "denied">("prompt");

  const settingsRef = useRef<AppSettings | null>(null);
  const transcriptRef = useRef("");
  const lastTranscriptUsedRef = useRef("");
  const isRefreshingRef = useRef(false);
  const hasAutoFetchedOnceRef = useRef(false); // ← track first auto-fetch

  const {
    chunks,
    isRecording,
    isTranscribing,
    error,
    micPermissionError,
    startSessionRecording,
    stopSessionRecording,
  } = useLiveTranscription(settings?.groqApiKey ?? "");

  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    settingsRef.current = s;
  }, []);

  useEffect(() => {
    if (settings) {
      saveSettings(settings);
      settingsRef.current = settings;
    }
  }, [settings]);

  const transcriptContext = useMemo(() => {
    return chunks.map((chunk) => chunk.text).join("\n\n").trim();
  }, [chunks]);

  useEffect(() => {
    transcriptRef.current = transcriptContext;
  }, [transcriptContext]);

  // ─── Recording ───────────────────────────────────────────────────────────────

  const handleToggleRecording = async () => {
    if (isRecording) {
      stopSessionRecording();
      return;
    }
    try {
      const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
      setMicPermState(result.state as "prompt" | "granted" | "denied");
    } catch {
      setMicPermState("prompt");
    }
    setShowMicModal(true);
  };

  const handleMicModalConfirm = async () => {
    setShowMicModal(false);
    hasAutoFetchedOnceRef.current = false; // reset on new session
    await startSessionRecording();
  };

  // ─── Suggestions ─────────────────────────────────────────────────────────────

  const fetchSuggestions = async (force = false) => {
    const s = settingsRef.current;
    const transcript = transcriptRef.current;
    if (!s) return;
    if (!transcript.trim()) return;
    if (isRefreshingRef.current) return;

    if (!force && transcript === lastTranscriptUsedRef.current) return;
    if (!force) lastTranscriptUsedRef.current = transcript;

    isRefreshingRef.current = true;
    setIsRefreshingSuggestions(true);

    try {
      const response = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcriptContext: transcript,
          contextChars: s.suggestionContextChars,
          liveSuggestionPrompt: s.liveSuggestionPrompt,
          model: s.suggestionModel,
          groqApiKey: s.groqApiKey,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.warn("Suggestions failed silently:", data?.error);
        return;
      }

      const newBatch: SuggestionBatch = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        suggestions: Array.isArray(data?.suggestions) ? data.suggestions : [],
      };

      if (newBatch.suggestions.length > 0) {
        setSuggestionBatches((prev) => [newBatch, ...prev]);
        if (!force) lastTranscriptUsedRef.current = transcript; // only mark used on success
      }
    } catch (err) {
      console.warn("Suggestion refresh failed:", err);
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshingSuggestions(false);
    }
  };

  useEffect(() => {
    if (!settings) return;
    setSecondsUntilRefresh(settings.refreshIntervalSeconds);
  }, [settings]);

  // ← Fire suggestions immediately when first transcript chunk arrives
  useEffect(() => {
    if (!isRecording) return;
    if (!transcriptContext.trim()) return;
    if (hasAutoFetchedOnceRef.current) return; // only trigger once on first chunk
    hasAutoFetchedOnceRef.current = true;
    fetchSuggestions(false);
  }, [transcriptContext, isRecording]);

  // Timer counts down independently — fires auto fetch every 30s
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        const s = settingsRef.current;
        const next = prev - 1;
        if (next <= 0) {
          fetchSuggestions(false);
          return s?.refreshIntervalSeconds ?? 30;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording]);

  // ─── Suggestion click → chat ──────────────────────────────────────────────────

  const handleSuggestionClick = (suggestion: Suggestion) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: suggestion.preview,
      createdAt: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setPendingSuggestionPrompt(suggestion.expandPrompt);
  };

  // ─── Export ───────────────────────────────────────────────────────────────────

  const handleExport = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      transcript: chunks.map((c) => ({
        timestamp: c.createdAt,
        text: c.text,
      })),
      suggestionBatches: suggestionBatches.map((batch) => ({
        timestamp: batch.createdAt,
        suggestions: batch.suggestions.map((s) => ({
          type: s.type,
          preview: s.preview,
          expandPrompt: s.expandPrompt,
        })),
      })),
      chat: chatMessages.map((m) => ({
        timestamp: m.createdAt,
        role: m.role,
        content: m.content,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `twinmind-session-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (!settings) return null;

  const isDenied = micPermState === "denied";

  return (
    <main className="h-screen bg-zinc-950 text-white flex flex-col">
      <Header
        isRecording={isRecording}
        onToggleRecording={handleToggleRecording}
        onRefresh={() => fetchSuggestions(true)}
        onExport={handleExport}
        onOpenSettings={() => setIsSettingsOpen(true)}
        secondsUntilRefresh={secondsUntilRefresh}
        isRefreshDisabled={isRefreshingSuggestions || !transcriptContext.trim()}
      />

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 overflow-hidden min-h-0">
        <div className="min-h-0">
          <TranscriptPanel
            transcriptChunks={chunks}
            isRecording={isRecording}
            isTranscribing={isTranscribing}
            micPermissionError={micPermissionError}
            micError={error}
            onToggleRecording={handleToggleRecording}
          />
        </div>

        <div className="min-h-0">
          <SuggestionsPanel
            suggestionBatches={suggestionBatches}
            onSuggestionClick={handleSuggestionClick}
            isLoading={isRefreshingSuggestions}
          />
        </div>

        <div className="min-h-0">
          <ChatPanel
            chatMessages={chatMessages}
            setChatMessages={setChatMessages}
            transcriptContext={transcriptContext}
            groqApiKey={settings.groqApiKey}
            model={settings.chatModel}
            chatPrompt={settings.chatPrompt}
            expandedAnswerPrompt={settings.expandedAnswerPrompt}
            expandedContextChars={settings.expandedContextChars}
            pendingSuggestionPrompt={pendingSuggestionPrompt}
            clearPendingSuggestionPrompt={() => setPendingSuggestionPrompt(null)}
          />
        </div>
      </div>

      {(isTranscribing || isRefreshingSuggestions) && (
        <div className="px-4 pb-3 text-xs text-zinc-400 space-y-1">
          {isTranscribing && <div>Transcribing latest audio chunk...</div>}
          {isRefreshingSuggestions && <div>Refreshing suggestions...</div>}
        </div>
      )}

      {error && (
        <div className="px-4 pb-3 text-xs text-red-400">
          {micPermissionError
            ? "Microphone access denied. Click the lock icon in your browser's address bar to allow microphone access, then try again."
            : error}
        </div>
      )}

      {/* Mic Permission Modal */}
      {showMicModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className={`flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4 ${isDenied ? "bg-red-600/20" : "bg-green-600/20"}`}>
              {isDenied ? (
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </div>
            <h2 className="text-white font-semibold text-center text-lg mb-2">
              {isDenied ? "Microphone Blocked" : "Microphone Access"}
            </h2>
            <p className="text-zinc-400 text-sm text-center mb-6 leading-6">
              {isDenied
                ? "Microphone access was denied. To fix: click the lock icon in your browser's address bar → Site Settings → Microphone → Allow, then refresh the page."
                : "TwinMind needs access to your microphone to transcribe your conversation in real time. Your audio is only processed locally."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowMicModal(false)}
                className="flex-1 px-4 py-2 rounded-xl text-sm border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition"
              >
                {isDenied ? "Close" : "Cancel"}
              </button>
              {!isDenied && (
                <button
                  onClick={handleMicModalConfirm}
                  className="flex-1 px-4 py-2 rounded-xl text-sm bg-green-600 hover:bg-green-500 font-medium transition"
                >
                  Allow Microphone
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <SettingsModal
        open={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onSave={(updated) => {
          setSettings(updated);
          setIsSettingsOpen(false);
        }}
      />
    </main>
  );
}