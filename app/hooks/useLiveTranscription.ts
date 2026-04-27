"use client";

import { useRef, useState } from "react";
import { useMicRecorder } from "./useMicRecorder";
import type { RecordedAudioChunk, TranscriptChunk, Session } from "../types/session";

// Filters out Whisper hallucinations that occur on silence or noise
function isValidTranscript(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const words = trimmed.split(/\s+/);
  if (words.length < 3) return false;

  const wordArray = words.map((w) => w.toLowerCase().replace(/[^a-z]/g, "")).filter(Boolean);

  // Catches "Hmmmm... Hmmmm..." repetition patterns
  const freq: Record<string, number> = {};
  for (const w of wordArray) freq[w] = (freq[w] || 0) + 1;
  const maxFreq = Math.max(...Object.values(freq));
  if (maxFreq / wordArray.length > 0.5) return false;

  const uniqueWords = new Set(wordArray);
  if (uniqueWords.size / words.length < 0.35) return false;

  // Only filter clear Whisper YouTube-style hallucinations
  const fillerPhrases = [
    "thanks for watching",
    "please subscribe",
    "please like and subscribe",
    "don't forget to subscribe",
  ];
  const lower = trimmed.toLowerCase();
  if (fillerPhrases.some((f) => lower === f)) return false;

  return true;
}

// ✅ Accept groqApiKey as a parameter
export function useLiveTranscription(groqApiKey: string = "") {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionIdState, setCurrentSessionIdState] = useState<string | null>(null);
  const [chunks, setChunks] = useState<TranscriptChunk[]>([]);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSessionIdRef = useRef<string | null>(null);
  const groqApiKeyRef = useRef<string>(groqApiKey);

  // Keep ref in sync with latest key
  groqApiKeyRef.current = groqApiKey;

  const setCurrentSessionId = (id: string | null) => {
    currentSessionIdRef.current = id;
    setCurrentSessionIdState(id);
  };

  const getTruncatedTranscript = (currentTranscript: string): string => {
    const contextChars = 2000;
    return currentTranscript.slice(-contextChars);
  };

  const handleChunkReady = async (chunk: RecordedAudioChunk) => {
    const sessionId = currentSessionIdRef.current;
    if (!sessionId) {
      console.warn("No session ID → chunk dropped");
      return;
    }

    setIsTranscribing(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", chunk.blob, "audio.webm");
    formData.append("groqApiKey", groqApiKeyRef.current); // ✅ pass key

    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Transcription failed");
      }

      const text: string = data.text || "";

      if (!isValidTranscript(text)) {
        console.log("Filtered likely hallucination:", text);
        return;
      }

      const newChunk: TranscriptChunk = {
        id: crypto.randomUUID(),
        sessionId,
        startedAt: chunk.startedAt,
        endedAt: chunk.endedAt,
        text,
        audioUrl: undefined,
        sizeBytes: chunk.sizeBytes,
        mimeType: chunk.mimeType,
        createdAt: new Date().toISOString(),
      };

      setChunks((prev) => [...prev, newChunk]);

      setLiveTranscript((prev) => {
        const truncatedTranscript = getTruncatedTranscript(prev + " " + text);
        return truncatedTranscript;
      });
    } catch (err) {
      console.warn("Transcription failed:", err);
      setError("Chunk transcription failed. Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const { isRecording, error: micError, startRecording, stopRecording } =
    useMicRecorder({ onChunkReady: handleChunkReady });

  const createSession = () => {
    const newSession: Session = {
      id: crypto.randomUUID(),
      title: `Session ${sessions.length + 1}`,
      status: "idle",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setChunks([]);
    setLiveTranscript("");
    setError(null);

    return newSession.id;
  };

  const startSessionRecording = async () => {
    let sessionId = currentSessionIdRef.current;
    if (!sessionId) {
      sessionId = createSession();
    }

    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? { ...session, status: "recording", updatedAt: new Date().toISOString() }
          : session
      )
    );

    await startRecording();
  };

  const stopSessionRecording = () => {
    stopRecording();

    const sessionId = currentSessionIdRef.current;
    if (!sessionId) return;

    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? { ...session, status: "completed", updatedAt: new Date().toISOString() }
          : session
      )
    );
  };

  return {
    sessions,
    currentSessionId: currentSessionIdState,
    chunks,
    liveTranscript,
    isRecording,
    isTranscribing,
    error: error || micError,
    micPermissionError: micError === "Mic access failed",
    createSession,
    startSessionRecording,
    stopSessionRecording,
    setCurrentSessionId,
  };
}