"use client";

import { useRef, useState } from "react";
import type { RecordedAudioChunk } from "../types/session";

type Options = {
  chunkDurationMs?: number;
  onChunkReady?: (chunk: RecordedAudioChunk) => void | Promise<void>;
};

export function useMicRecorder({
  chunkDurationMs = 30000,
  onChunkReady,
}: Options = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startTimeRef = useRef<string>("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldContinueRef = useRef(false);
  const isStoppingRef = useRef(false);

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const stopTracks = () => {
    if (streamRef.current) {
      console.log("Stopping media tracks");
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const resetRecorderState = () => {
    console.log("Resetting recorder state");
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    startTimeRef.current = "";
    clearTimer();
    shouldContinueRef.current = false;
    isStoppingRef.current = false;
  };

  const startChunk = () => {
    const recorder = mediaRecorderRef.current;

    console.log("startChunk called");
    console.log("Recorder exists:", !!recorder);
    console.log("Recorder state:", recorder?.state);

    if (!recorder) {
      console.warn("No MediaRecorder available."); // ← was console.error
      return;
    }

    if (recorder.state !== "inactive") {
      console.warn("Recorder is not inactive, cannot start a new chunk.");
      return;
    }

    chunksRef.current = [];
    startTimeRef.current = new Date().toISOString();

    console.log("Starting recorder chunk at:", startTimeRef.current);
    recorder.start();

    clearTimer();
    timeoutRef.current = setTimeout(() => {
      const currentRecorder = mediaRecorderRef.current;
      console.log("Chunk timeout reached");
      console.log("Current recorder state:", currentRecorder?.state);

      if (currentRecorder && currentRecorder.state === "recording") {
        console.log("Stopping recorder due to timeout");
        currentRecorder.stop();
      }
    }, chunkDurationMs);
  };

  const startRecording = async () => {
    try {
      console.log("startRecording called");

      if (isRecording) {
        console.log("Already recording, ignoring start");
        return;
      }

      setError(null);
      isStoppingRef.current = false;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Got media stream:", stream);

      streamRef.current = stream;

      const mimeType =
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";

      console.log("Chosen mimeType:", mimeType || "browser default");

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      console.log("Created MediaRecorder:", recorder);
      console.log("Initial recorder state:", recorder.state);

      mediaRecorderRef.current = recorder;
      shouldContinueRef.current = true;

      recorder.onstart = () => {
        console.log("MediaRecorder onstart fired");
      };

      recorder.ondataavailable = (event: BlobEvent) => {
        console.log("ondataavailable fired");
        console.log("event.data size:", event.data?.size);
        console.log("event.data type:", event.data?.type);

        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log("chunksRef length:", chunksRef.current.length);
        }
      };

      recorder.onerror = (event) => {
        console.warn("MediaRecorder error:", event); // ← was console.error
        setError("Audio recording failed.");
        setIsRecording(false);
        shouldContinueRef.current = false;
        clearTimer();
        stopTracks();
        resetRecorderState();
      };

      recorder.onstop = async () => {
        console.log("MediaRecorder onstop fired");
        clearTimer();

        const endedAt = new Date().toISOString();
        const finalMimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalMimeType });

        console.log("Building blob from chunks");
        console.log("chunksRef length before reset:", chunksRef.current.length);
        console.log("Final blob size:", blob.size);
        console.log("Final blob type:", finalMimeType);

        const chunk: RecordedAudioChunk = {
          id: crypto.randomUUID(),
          blob,
          mimeType: finalMimeType,
          startedAt: startTimeRef.current || endedAt,
          endedAt,
          createdAt: endedAt,
          sizeBytes: blob.size,
        };

        chunksRef.current = [];

        if (blob.size > 0) {
          try {
            console.log("Calling onChunkReady");
            await onChunkReady?.(chunk);
            console.log("onChunkReady finished");
          } catch (callbackError) {
            console.warn("onChunkReady failed:", callbackError); // ← was console.error
            setError("Failed to process recorded chunk.");
          }
        } else {
          console.warn("Blob size is 0, skipping onChunkReady");
        }

        if (shouldContinueRef.current && !isStoppingRef.current) {
          console.log("Continuing to next chunk");
          startChunk();
          return;
        }

        console.log("Recording fully stopped");
        setIsRecording(false);
        stopTracks();
        resetRecorderState();
      };

      setIsRecording(true);
      startChunk();
    } catch (err) {
      console.warn("Mic access failed:", err); // ← was console.error — this was causing the NotAllowedError badge
      setError("Mic access failed");
      setIsRecording(false);
      shouldContinueRef.current = false;
      stopTracks();
      resetRecorderState();
    }
  };

  const stopRecording = () => {
    console.log("stopRecording called");

    shouldContinueRef.current = false;
    isStoppingRef.current = true;
    clearTimer();

    const recorder = mediaRecorderRef.current;

    console.log("Recorder at stop:", recorder);
    console.log("Recorder state at stop:", recorder?.state);

    if (!recorder) {
      setIsRecording(false);
      stopTracks();
      resetRecorderState();
      return;
    }

    if (recorder.state === "recording") {
      console.log("Stopping active recorder");
      recorder.stop();
      return;
    }

    setIsRecording(false);
    stopTracks();
    resetRecorderState();
  };

  return {
    isRecording,
    error,
    startRecording,
    stopRecording,
  };
}