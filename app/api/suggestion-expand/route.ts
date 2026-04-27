import { NextRequest, NextResponse } from "next/server";
import {
  EXPANDED_ANSWER_PROMPT,
  buildExpandUserPrompt,
} from "../../lib/prompts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const transcriptContext =
      typeof body.transcriptContext === "string"
        ? body.transcriptContext
        : "";

    const expandPrompt =
      typeof body.expandPrompt === "string" ? body.expandPrompt : "";

    const contextChars =
      typeof body.contextChars === "number" ? body.contextChars : 8000;

    const model =
      typeof body.model === "string"
        ? body.model
        : "openai/gpt-oss-120b";

    if (!expandPrompt.trim()) {
      return NextResponse.json(
        { error: "expandPrompt is required" },
        { status: 400 }
      );
    }

    const groqApiKey =
      typeof body.groqApiKey === "string" && body.groqApiKey.trim()
        ? body.groqApiKey.trim()
        : process.env.GROQ_API_KEY;

    if (!groqApiKey) {
      return NextResponse.json(
        { error: "Missing Groq API key" },
        { status: 400 }
      );
    }

    // Slice the transcript context to get the most recent relevant part
    const expandedTranscript = transcriptContext.slice(-contextChars);

    // **Ground the expandPrompt** — ensure it's derived from RECENT TRANSCRIPT.
    if (!expandedTranscript.includes(expandPrompt)) {
      return NextResponse.json(
        { error: "Expand prompt is not grounded in the transcript." },
        { status: 400 }
      );
    }

    // Make sure the expand prompt is clear and grounded in the context
    const expandedPromptFinal = buildExpandUserPrompt({
      transcriptContext: expandedTranscript,
      expandPrompt,
    });

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
          temperature: 0.5,
          response_format: { type: "json_object" },  // Correct response_format here
          messages: [
            {
              role: "system",
              content: EXPANDED_ANSWER_PROMPT,
            },
            {
              role: "user",
              content: expandedPromptFinal, // Use the validated and grounded expand prompt
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data?.error?.message || "Expanded answer generation failed",
        },
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
    console.error("Suggestion expand API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate expanded answer",
      },
      { status: 500 }
    );
  }
}