# TwinMind Copilot

A real-time AI meeting copilot that transcribes live audio, surfaces contextual suggestions every 30 seconds, and answers questions via chat — all powered by Groq.

**Live demo**: https://twinmind-live-suggestion-rose.vercel.app  
**GitHub**: https://github.com/meghanakoti/twinmind-live-suggestion

---

## Setup

1. Clone the repo and install dependencies:
```bash
npm install
npm run dev
```

2. Open `http://localhost:3000`

3. Click **Settings** → paste your Groq API key → Save

4. Click **Start Mic** → allow microphone access → start speaking

No `.env` file needed. The API key is stored in `localStorage` and sent with each request.

---

## Stack

- **Next.js 16** (App Router) — frontend and API routes
- **Groq** — all AI inference
  - `whisper-large-v3` — audio transcription
  - `openai/gpt-oss-120b` — suggestions and chat
- **Tailwind CSS** — styling
- **Vercel** — deployment

---

## How it works

### Audio capture
The browser's `MediaRecorder` API captures audio in 30-second chunks. Each chunk is sent to `/api/transcribe` as a `FormData` blob. Whisper Large V3 transcribes it server-side and returns text. A hallucination filter on both the server and client discards low-quality outputs (silence, repetition, YouTube-style filler phrases) before appending to the transcript.

### Suggestions
Every 30 seconds (and immediately after the first transcript chunk arrives), the full recent transcript is sent to `/api/suggestions`. The model returns exactly 3 suggestions as structured JSON. Each suggestion has a `type` (QUESTION, INSIGHT, ANSWER, FACT_CHECK, CLARIFY), a `preview` (≤15 words, immediately useful), and an `expandPrompt` (used when clicked to generate a detailed answer).

New batches appear at the top of the suggestions panel; older batches stay visible below for reference.

### Chat
Clicking a suggestion sends its `expandPrompt` to `/api/chat` with the full transcript as context. The model returns a detailed, actionable answer. Users can also type questions directly. The chat is one continuous session — no persistence on reload.

---

## Prompt strategy

### Live suggestions prompt
The system prompt walks the model through a structured 5-step reasoning process:

1. **Inventory** — find every gap in the transcript: unanswered questions, unverified claims, contradictions, ambiguous terms, unassigned tasks
2. **So what?** — for each gap, state the implication as a firm conclusion, not a possibility. Banned words: "may", "might", "could", "possibly"
3. **Select 3 distinct gaps** — must come from different moments, must cover at least 2 different gap types
4. **Assign types** — QUESTION, INSIGHT, ANSWER, FACT_CHECK, or CLARIFY based on strict rules. INSIGHT only when contradiction is explicit. ANSWER only when a question was actually asked. CLARIFY when in doubt
5. **Write preview** — 15 words or fewer, complete clause with a verb, confident conclusion, specific to this transcript

Key decision: CLARIFY is always preferred over a hallucinated INSIGHT or ANSWER. A grounded CLARIFY is more valuable than a speculative insight.

### Expanded answer prompt (on click)
The model is instructed to output exactly 3 lines:
- Line 1: the exact words the user should say right now, in quotes
- Line 2: one sentence explaining why it matters
- Line 3 (optional): one supporting fact from the transcript

This forces specificity — the answer must be immediately usable in the live conversation, not a generic analysis.

### Chat prompt
Standard meeting copilot with transcript injected. Instructed to be concise, ground answers in the transcript, and flag when going beyond it.

### Context window decisions
- **Suggestions**: last 2000 characters of transcript — recent context only, keeps tokens low and suggestions timely
- **Expanded answers**: last 8000 characters — more context for detailed responses
- **Chat**: last 8000 characters with full conversation history

---

## Tradeoffs

**Chunk size (30s)**: Shorter chunks (5-10s) would give more responsive transcription but Whisper performs better on longer audio with more context. 30s balances latency and accuracy.

**Client-side hallucination filter**: Filtering on both server and client is redundant but safe. The server returns `{ text: "" }` for hallucinations (200, not 400) so the client never throws an error — it just silently skips empty text.

**No streaming for suggestions**: Suggestions are returned as a complete JSON object. Streaming partial JSON is complex and the 1-2s wait is acceptable for a 30s refresh cycle.

**localStorage for API key**: Simple and sufficient per spec. No auth, no backend storage, no persistence beyond the key itself.

**Dedup on auto-refresh**: The auto-timer skips a fetch if the transcript hasn't changed since the last successful fetch. Manual Refresh always fires regardless. This prevents duplicate batches when the user stops speaking but keeps the timer running.

**First-chunk trigger**: Suggestions fire immediately when the first transcript chunk arrives, rather than waiting for the 30s timer to align with the first chunk. This means suggestions appear ~30s after recording starts instead of potentially ~60s.

---

## Project structure

```
app/
  api/
    suggestions/route.ts   — suggestion generation
    transcribe/route.ts    — audio transcription
    chat/route.ts          — chat and expanded answers
  components/
    Header.tsx             — top bar with Start Mic, Refresh, Export, Settings
    TranscriptPanel.tsx    — left column, transcript display
    SuggestionsPanel.tsx   — middle column, suggestion cards
    ChatPanel.tsx          — right column, chat interface
    SettingsModal.tsx      — API key and prompt configuration
  hooks/
    useLiveTranscription.ts — audio chunking, transcription, session state
    useMicRecorder.ts       — MediaRecorder wrapper
  lib/
    defaults.ts            — default settings and prompts
    prompts.ts             — all system prompts
    json.ts                — suggestion response parser
    storage.ts             — localStorage settings persistence
  types/                   — TypeScript types
  page.tsx                 — main layout and orchestration
```
