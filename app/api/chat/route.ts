import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const transcriptContext =
      typeof body.transcriptContext === "string" ? body.transcriptContext : "";
    const userMessage =
      typeof body.userMessage === "string" ? body.userMessage : "";
    const isExpanded = body.isExpanded === true;
    const contextChars =
      typeof body.contextChars === "number" ? body.contextChars : 8000;

    const systemPromptRaw =
      typeof body.systemPrompt === "string" && body.systemPrompt.trim()
        ? body.systemPrompt
        : typeof body.chatPrompt === "string"
        ? body.chatPrompt
        : "";

    const model =
      typeof body.model === "string" ? body.model : "openai/gpt-oss-120b";

    // Key comes from request body only — no process.env fallback
    const groqApiKey =
      typeof body.groqApiKey === "string" && body.groqApiKey.trim()
        ? body.groqApiKey.trim()
        : null;

    if (!userMessage.trim()) {
      return NextResponse.json(
        { error: "userMessage is required" },
        { status: 400 }
      );
    }

    if (!groqApiKey) {
      return NextResponse.json(
        { error: "Missing Groq API key" },
        { status: 400 }
      );
    }

    const truncatedTranscript = transcriptContext.slice(-contextChars);

    const systemPrompt = isExpanded
      ? `${systemPromptRaw}\n\nFull Transcript:\n${truncatedTranscript || "(no transcript yet)"}`
      : systemPromptRaw.replace(
          "{TRANSCRIPT}",
          truncatedTranscript || "(no transcript yet)"
        );

    const finalUserMessage = isExpanded
      ? userMessage
      : `TRANSCRIPT:\n${truncatedTranscript || "No transcript yet."}\n\nQUESTION:\n${userMessage}`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: isExpanded ? 0.3 : 0.5,
          max_tokens: isExpanded ? 500 : 1000,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: finalUserMessage },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.warn("Groq chat error:", data);
      return NextResponse.json(
        { error: data?.error?.message || "Chat generation failed" },
        { status: response.status }
      );
    }

    const answer = data?.choices?.[0]?.message?.content;

    if (typeof answer !== "string" || !answer.trim()) {
      return NextResponse.json(
        { error: "Model returned empty response" },
        { status: 500 }
      );
    }

    return NextResponse.json({ answer });
  } catch (error) {
    console.warn("Chat API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate chat answer",
      },
      { status: 500 }
    );
  }
}