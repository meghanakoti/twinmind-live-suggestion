"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../types";

type Props = {
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  transcriptContext: string;
  groqApiKey: string;
  model: string;
  chatPrompt: string;
  expandedAnswerPrompt: string;
  expandedContextChars: number;
  pendingSuggestionPrompt?: string | null;
  clearPendingSuggestionPrompt?: () => void;
};

export default function ChatPanel({
  chatMessages,
  setChatMessages,
  transcriptContext,
  groqApiKey,
  model,
  chatPrompt,
  expandedAnswerPrompt,
  expandedContextChars,
  pendingSuggestionPrompt,
  clearPendingSuggestionPrompt,
}: Props) {
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isStreaming]);

  // Send a message to /api/chat with streaming support
  // isExpanded=true uses expandedAnswerPrompt (suggestion click)
  // isExpanded=false uses chatPrompt (direct user message)
  const sendToChat = async (content: string, isExpanded = false) => {
    if (!content.trim()) return;

    setIsStreaming(true);

    const assistantId = crypto.randomUUID();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, assistantMsg]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcriptContext,
          userMessage: content,
          groqApiKey,
          model,
          systemPrompt: isExpanded ? expandedAnswerPrompt : chatPrompt,
          contextChars: isExpanded ? expandedContextChars : undefined,
          isExpanded,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Chat failed");
      }

      // Handle streaming response
      if (response.headers.get("content-type")?.includes("text/event-stream")) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value, { stream: true });
            for (const line of text.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              const payload = line.slice(6).trim();
              if (payload === "[DONE]") continue;
              try {
                const parsed = JSON.parse(payload);
                const delta = parsed.choices?.[0]?.delta?.content ?? "";
                if (!delta) continue;
                fullContent += delta;
                setChatMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: fullContent } : m
                  )
                );
              } catch {
                // ignore malformed chunks
              }
            }
          }
        }
      } else {
        // Fallback: non-streaming JSON response
        const data = await response.json();
        const answer = data?.answer ?? "";
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: answer } : m
          )
        );
      }
    } catch (err) {
      console.warn("Chat error:", err); // ← was console.error
      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Something went wrong. Please try again." }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isStreaming) return;
    setInput("");

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, userMsg]);

    await sendToChat(content, false);
  };

  // When a suggestion is clicked, send expandPrompt using expandedAnswerPrompt
  useEffect(() => {
    if (!pendingSuggestionPrompt?.trim()) return;
    sendToChat(pendingSuggestionPrompt, true);
    clearPendingSuggestionPrompt?.();
  }, [pendingSuggestionPrompt]);

  return (
    <div className="bg-zinc-900 rounded-xl p-4 flex flex-col overflow-hidden h-full">
      <h2 className="text-sm text-zinc-400 mb-3 shrink-0">Chat</h2>

      <div className="flex-1 space-y-3 overflow-y-auto min-h-0">
        {chatMessages.length === 0 ? (
          <div className="text-sm text-zinc-500 border border-dashed border-zinc-700 rounded-xl p-4">
            Click any suggestion to get a detailed answer, or type a question below.
          </div>
        ) : (
          chatMessages.map((message) => (
            <div
              key={message.id}
              className={`p-3 rounded-xl max-w-[90%] ${
                message.role === "user"
                  ? "bg-blue-600 ml-auto"
                  : "bg-zinc-800 mr-auto"
              }`}
            >
              <div className="text-[10px] uppercase tracking-wide text-zinc-300 mb-1">
                {message.role === "user" ? "You" : "Assistant"}
              </div>
              <div className="text-sm leading-6 whitespace-pre-wrap">
                {message.content}
              </div>
            </div>
          ))
        )}

        {isStreaming && chatMessages[chatMessages.length - 1]?.content === "" && (
          <div className="bg-zinc-800 mr-auto rounded-xl px-4 py-3 max-w-[90%]">
            <div className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1">
              Assistant
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce" />
              <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
              <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex gap-2 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={isStreaming}
          className="flex-1 bg-zinc-800 px-3 py-2 rounded-xl outline-none border border-zinc-700 focus:border-zinc-500 text-sm disabled:opacity-50"
          placeholder={isStreaming ? "Waiting for response..." : "Type a message..."}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-xl text-sm font-medium transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}