import { NextRequest, NextResponse } from "next/server";

// Filters out Whisper hallucinations that occur on silence or noise
function isValidTranscript(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const words = trimmed.split(/\s+/);
  if (words.length < 3) return false;

  const wordArray = words.map((w) => w.toLowerCase().replace(/[^a-z]/g, "")).filter(Boolean);

  // Excessive word repetition — catches "Hmmmm... Hmmmm..." and similar
  const freq: Record<string, number> = {};
  for (const w of wordArray) freq[w] = (freq[w] || 0) + 1;
  const maxFreq = Math.max(...Object.values(freq));
  if (maxFreq / wordArray.length > 0.5) return false;

  // Unique word ratio — catches low-variety hallucinations
  const uniqueWords = new Set(wordArray);
  if (uniqueWords.size / words.length < 0.35) return false;

  // Only exact-match clear Whisper YouTube-style hallucinations
  const fillerPhrases = [
    "thanks for watching",
    "please subscribe",
    "please like and subscribe",
    "don't forget to subscribe",
    "you",
  ];
  const lower = trimmed.toLowerCase();
  if (fillerPhrases.some((f) => lower === f)) return false;

  return true;
}

export async function POST(req: NextRequest) {
  try {
    console.log("API HIT /api/transcribe");
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    console.log("File received:", file.name, file.size, file.type);

    // ✅ Key comes from request body only — no process.env fallback
    const groqApiKey = formData.get("groqApiKey") as string;
    if (!groqApiKey) {
      console.warn("Missing Groq API key");
      return NextResponse.json({ error: "Missing Groq API key" }, { status: 400 });
    }

    const extension =
      file.type === "audio/mp4"
        ? "m4a"
        : file.type === "audio/webm" || file.type === "audio/webm;codecs=opus"
        ? "webm"
        : file.type === "audio/wav"
        ? "wav"
        : file.type === "audio/mpeg"
        ? "mp3"
        : "webm";

    const groqForm = new FormData();
    groqForm.append("file", file, `recording.${extension}`);
    groqForm.append("model", "whisper-large-v3");
    groqForm.append("response_format", "json");
    groqForm.append("language", "en");

    console.log("Sending request to Groq...");
    const response = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${groqApiKey}` },
        body: groqForm,
      }
    );

    const data = await response.json();
    console.log("Groq response status:", response.status);
    console.log("Groq raw response:", data);

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "Groq transcription failed" },
        { status: response.status }
      );
    }

    const text = typeof data.text === "string" ? data.text : "";

    // Return 200 with empty text instead of 400 — avoids throwing error in the hook
    if (!isValidTranscript(text)) {
      console.log("Filtered likely hallucination:", text);
      return NextResponse.json({ text: "" });
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.warn("Transcribe error:", error);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}