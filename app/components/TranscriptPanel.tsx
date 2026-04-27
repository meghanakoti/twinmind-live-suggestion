import React, { useEffect, useRef } from "react";
import { TranscriptChunk } from "../types/session";

interface TranscriptPanelProps {
  transcriptChunks: TranscriptChunk[];
  isRecording: boolean;
  isTranscribing: boolean;
  micPermissionError: boolean;
  micError: string | null;
  onToggleRecording: () => void;
}

const TranscriptPanel: React.FC<TranscriptPanelProps> = ({
  transcriptChunks,
  isRecording,
  isTranscribing,
  onToggleRecording,
}) => {
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcriptChunks]);

  return (
    <div className="bg-zinc-900 rounded-xl p-4 flex flex-col h-full overflow-hidden">
      {/* Header row — matches Suggestions and Chat */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h2 className="text-sm text-zinc-400">Transcript</h2>
        {isRecording && (
          <span className="flex items-center gap-1.5 text-[10px] text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            Live
          </span>
        )}
        {isTranscribing && !isRecording && (
          <span className="text-[10px] text-zinc-500">Transcribing...</span>
        )}
      </div>

      {/* Transcript content */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-2 text-sm text-zinc-100 leading-6">
        {transcriptChunks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <p className="text-sm text-zinc-600 text-center leading-6">
              Start recording and transcript will appear here.
            </p>
          </div>
        ) : (
          transcriptChunks.map((chunk) => (
            <p key={chunk.id}>{chunk.text}</p>
          ))
        )}
        <div ref={transcriptEndRef} />
      </div>


    </div>
  );
};

export default TranscriptPanel;