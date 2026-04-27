// 🔹 Raw audio chunk (frontend only)
export type RecordedAudioChunk = {
    id: string;
  
    blob: Blob; // frontend only
  
    mimeType: string;
  
    startedAt: string;
    endedAt: string;
  
    createdAt: string;
  
    sizeBytes: number;
  };
  
  //  Transcribed chunk (API + UI + future DB)
  export type TranscriptChunk = {
    id: string;
  
    sessionId: string;
  
    startedAt: string;
    endedAt: string;
  
    text: string;
  
    audioUrl?: string;
  
    sizeBytes: number;
    mimeType: string;
  
    createdAt: string;
  };
  
  // 🔹 Session (container for chunks)
  export type Session = {
    id: string;
  
    title: string;
  
    status: "idle" | "recording" | "processing" | "completed";
  
    createdAt: string;
    updatedAt?: string;
  };