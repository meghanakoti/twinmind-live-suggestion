import { NextRequest, NextResponse } from "next/server";
import { parseSuggestionResponse } from "../../lib/json";
import { buildSuggestionUserPrompt, LIVE_SUGGESTION_PROMPT } from "../../lib/prompts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const transcriptContext = body.transcriptContext || "";
    const contextChars = body.contextChars || 2000; // Limit to 2000 tokens
    const model = body.model || "openai/gpt-oss-120b";
    const groqApiKey = body.groqApiKey || process.env.GROQ_API_KEY;

    // Validate prompt length
    const bodyPrompt = typeof body.liveSuggestionPrompt === "string" ? body.liveSuggestionPrompt : "";
    const liveSuggestionPrompt = bodyPrompt.length > 500 ? bodyPrompt : LIVE_SUGGESTION_PROMPT;

    // Ensure API key and transcript context are provided
    if (!groqApiKey) {
      return NextResponse.json({ error: "Missing Groq API key" }, { status: 400 });
    }
    if (!transcriptContext.trim()) {
      return NextResponse.json({ error: "transcriptContext is required" }, { status: 400 });
    }

    // Ensure transcript is large enough to process
    if (transcriptContext.trim().split(/\s+/).length < 15) {
      return NextResponse.json({ error: "Transcript too short for suggestions" }, { status: 400 });
    }

    // Slice session summary based on recent context
    const sessionSummary = transcriptContext.slice(0, 200);

    // Build user message for suggestion request
    const baseUserMessage = buildSuggestionUserPrompt({
      sessionSummary,
      recentTranscript: transcriptContext,
      contextChars,
    });

    const userMessage = `${baseUserMessage}

You MUST respond with this exact JSON structure — no other format is valid:
{
  "suggestions": [
    {
      "type": "one of: QUESTION, INSIGHT, ANSWER, FACT_CHECK, CLARIFY",
      "preview": "string",
      "expandPrompt": "string"
    },
    {
      "type": "one of: QUESTION, INSIGHT, ANSWER, FACT_CHECK, CLARIFY",
      "preview": "string",
      "expandPrompt": "string"
    },
    {
      "type": "one of: QUESTION, INSIGHT, ANSWER, FACT_CHECK, CLARIFY",
      "preview": "string",
      "expandPrompt": "string"
    }
  ]
}`;

    // Send request to Groq API
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" },  // Ensure JSON format
        messages: [
          { role: "system", content: liveSuggestionPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API error:", data);
      return NextResponse.json(
        { error: data?.error?.message || "Suggestion generation failed" },
        { status: response.status }
      );
    }

    // Ensure the response contains suggestions in the expected structure
    if (!data?.choices?.[0]?.message?.content) {
      return NextResponse.json({ error: "Empty model response" }, { status: 500 });
    }

    // Parse the raw content returned from Groq's API
    const rawContent = data.choices[0].message.content;

    const parsed = parseSuggestionResponse(rawContent);

    // Validate if the parsed response contains the suggestions array
    if (!parsed?.suggestions || !Array.isArray(parsed.suggestions) || parsed.suggestions.length !== 3) {
      return NextResponse.json({ error: "Invalid suggestions format" }, { status: 500 });
    }

    // Return suggestions
    return NextResponse.json({ suggestions: parsed.suggestions });
  } catch (error) {
    console.error("Suggestions API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}