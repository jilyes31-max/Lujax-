# Architecture — Lujax (Free Claude AI Clone)

## Stack

We keep FreeLLMAPI's existing stack — it's battle-tested and already does 90% of the job.

| Layer | Choice | Why |
|-------|--------|-----|
| Backend | Express + TypeScript (FreeLLMAPI server) | Already built, 34 providers, 635 models, streaming, tools |
| Frontend | React 18 + Vite + TypeScript (FreeLLMAPI client) | Already built, playground with chat, artifacts, search |
| Database | SQLite via better-sqlite3 (FreeLLMAPI) | Already built, zero-config, conversations table exists |
| Styling | Tailwind CSS (already in FreeLLMAPI) + Claude-like CSS overrides | Reskin to match Claude's minimal aesthetic |
| LLM Routing | FreeLLMAPI router | Auto-fallback, rate limit tracking, 635 free endpoints |
| Desktop | Electron (FreeLLMAPI desktop) | Already built |
| Mobile | React Native (FreeLLMAPI) | Already built, iOS + Android |

**No new database. No new server. No new framework.** We build a new frontend entry point (`/chat`) that uses FreeLLMAPI's existing API and adds a Claude-like UI layer.

## Approach: New Chat Page on FreeLLMAPI

Instead of rewriting, we add a new page `/chat` to FreeLLMAPI's client that provides the Claude-like experience:

```
freellmapi/
  client/src/
    pages/
      PlaygroundPage.tsx      ← existing (keep as-is for power users)
      LujaxChatPage.tsx       ← NEW: Claude-like chat interface
    components/
      lujax/                  ← NEW: Claude-like components
        ChatLayout.tsx         ← Main layout: sidebar + chat + artifact
        ChatSidebar.tsx        ← Conversation list, search, new chat
        ChatMessages.tsx       ← Message thread with streaming
        ChatComposer.tsx       ← Input area with file upload
        ModelPicker.tsx        ← Simplified model selector
        ArtifactViewer.tsx     ← Side panel for code/HTML/docs
        WelcomeScreen.tsx      ← Empty state with suggestions
        MessageBubble.tsx      ← Individual message rendering
    lib/
      lujax-models.ts         ← Smart model grouping (635 → ~10 friendly choices)
      lujax-title.ts          ← Auto-generate conversation titles
```

## API — Already Built

FreeLLMAPI already exposes everything we need:

| Method | Path | Purpose | Flow |
|--------|------|---------|------|
| POST | `/v1/chat/completions` | Send message, get streaming response | F01, F02, F03, F05 |
| GET | `/api/models` | List available models with capabilities | F01, F06 |
| GET | `/api/conversations` | List all conversations | F02, F07 |
| GET | `/api/conversations/:id` | Load one conversation | F02 |
| PUT | `/api/conversations/:id` | Save/update conversation | F01, F02 |
| DELETE | `/api/conversations/:id` | Delete conversation | F07 |
| GET | `/api/fallback` | Get fallback chain for routing | F01 |
| POST | `/v1/search` | Web search | F05 |
| GET | `/api/settings` | Get user settings | F08 |
| PUT | `/api/settings` | Update settings | F08 |

**No new API routes needed.** The frontend talks to the same endpoints.

## Data Model — Already Built

FreeLLMAPI's SQLite schema already has:

```sql
-- models table (managed by catalog + migrations)
-- api_keys table (encrypted key storage)
-- conversations table (id, title, messages JSON, model, created_at, updated_at)
-- request_logs table (analytics, latency, tokens)
-- settings table (user preferences)
-- fallback_config table (routing priorities)
```

**No schema changes needed.** Conversations store messages as JSON (matching ChatMessage[] from the client), which already includes content, images, reasoning, meta (platform, model, latency, web search sources).

## Smart Model Grouping

The key UX challenge: Claude shows 3 models (Haiku, Sonnet, Opus). We have 635. Solution:

```typescript
// lujax-models.ts — group 635 models into ~8 friendly tiers
const MODEL_TIERS = [
  { id: 'best',    label: 'Best',         desc: 'Most capable model available',     filter: top by intelligenceRank },
  { id: 'fast',    label: 'Fast',         desc: 'Quick responses, good quality',    filter: top by speedRank },
  { id: 'balanced',label: 'Balanced',     desc: 'Good balance of speed & quality',  filter: mid intelligenceRank + speedRank },
  { id: 'vision',  label: 'Vision',       desc: 'Can understand images',            filter: supportsVision },
  { id: 'code',    label: 'Code',         desc: 'Optimized for programming',        filter: code-specific models },
  { id: 'reason',  label: 'Reasoning',    desc: 'Deep thinking and analysis',       filter: reasoning models },
  { id: 'search',  label: 'Search',       desc: 'With web search capability',       filter: models + search engine },
  { id: 'all',     label: 'All Models',   desc: 'Browse all 635 models',            filter: none },
]
```

The router picks the best available provider for each tier automatically.

## Build Order

### Milestone 1: Vertical Slice (Core Chat)
- `LujaxChatPage.tsx` — main page with layout
- `ChatLayout.tsx` — sidebar + messages + composer
- `ChatComposer.tsx` — text input with send button
- `ChatMessages.tsx` — render messages with streaming
- `MessageBubble.tsx` — individual message styling
- `WelcomeScreen.tsx` — empty state
- Screens: S02, S03, S12
- Routes used: `/v1/chat/completions`, `/api/conversations`

### Milestone 2: Sidebar + Conversations
- `ChatSidebar.tsx` — conversation list grouped by date
- Search conversations
- New/delete/rename
- Screens: S04
- Routes: `/api/conversations` CRUD

### Milestone 3: Model Selection + Grouping
- `ModelPicker.tsx` — friendly model tiers
- `lujax-models.ts` — grouping logic
- Screens: S05
- Routes: `/api/models`

### Milestone 4: Artifacts + Files
- `ArtifactViewer.tsx` — code/HTML/doc panel
- File upload in composer
- Screens: S06, S08, S10

### Milestone 5: Polish
- Auto-title generation (`lujax-title.ts`)
- Keyboard shortcuts (Cmd+K, Cmd+N)
- Web search citations (S09)
- Export conversations
- Error states (S11)
- Mobile responsive (S12)

## Risks

1. **Model availability** — Free tiers rate-limit. FreeLLMAPI's fallback handles this, but UX must show "switching to another model" gracefully.
2. **Context window** — Free models have smaller context than Claude. Need to show token usage and warn when approaching limits.
3. **Streaming consistency** — 34 different providers stream slightly differently. FreeLLMAPI normalizes this but edge cases exist.

## Next Step

`/replica-design` then straight to `/replica-build`.
