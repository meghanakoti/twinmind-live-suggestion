"use client";

import { useLiveTranscription } from "../hooks/useLiveTranscription";

export default function MicRecorderTest() {
  const {
    sessions,
    currentSessionId,
    chunks,
    liveTranscript,
    isRecording,
    isTranscribing,
    error,
    createSession,
    startSessionRecording,
    stopSessionRecording,
    setCurrentSessionId,
  } = useLiveTranscription();

  return (
    <div className="min-h-screen p-6">
      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-3 border rounded p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Sessions</h2>
            <button
              onClick={createSession}
              className="px-3 py-2 rounded border border-black"
            >
              New
            </button>
          </div>

          {sessions.length === 0 ? (
            <p>No sessions yet</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setCurrentSessionId(session.id)}
                  className={`w-full text-left border rounded p-3 ${
                    currentSessionId === session.id ? "bg-gray-100" : ""
                  }`}
                >
                  <p className="font-medium">{session.title}</p>
                  <p className="text-sm text-gray-600">{session.status}</p>
                  <p className="text-xs text-gray-500">{session.createdAt}</p>
                </button>
              ))}
            </div>
          )}
        </aside>

        <main className="col-span-6 border rounded p-4 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Live Transcript</h1>
            <p className="text-sm text-gray-600">
              Current session: {currentSessionId ?? "No session selected"}
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={startSessionRecording}
              disabled={isRecording}
              className="px-4 py-2 rounded border border-black disabled:opacity-50"
            >
              Start
            </button>

            <button
              onClick={stopSessionRecording}
              disabled={!isRecording}
              className="px-4 py-2 rounded border border-black disabled:opacity-50"
            >
              Stop
            </button>
          </div>

          <div className="space-y-2">
            <p>Status: {isRecording ? "Recording" : "Idle"}</p>
            <p>Transcribing: {isTranscribing ? "Yes" : "No"}</p>
            {error && <p className="text-red-600">Error: {error}</p>}
          </div>

          <div className="border rounded p-4 min-h-[320px] whitespace-pre-wrap">
            {liveTranscript || "Transcript will appear here..."}
          </div>
        </main>

        <aside className="col-span-3 border rounded p-4 space-y-4">
          <h2 className="text-xl font-semibold">Transcript Chunks</h2>

          {chunks.length === 0 ? (
            <p>No chunks yet</p>
          ) : (
            <div className="space-y-3">
              {chunks.map((chunk) => (
                <div key={chunk.id} className="border rounded p-3 space-y-2">
                  <p>
                    <strong>Started:</strong> {chunk.startedAt}
                  </p>
                  <p>
                    <strong>Ended:</strong> {chunk.endedAt}
                  </p>
                  <p>
                    <strong>Size:</strong> {chunk.sizeBytes} bytes
                  </p>
                  <p>
                    <strong>Type:</strong> {chunk.mimeType}
                  </p>
                  <p>
                    <strong>Text:</strong> {chunk.text || "No transcript"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}