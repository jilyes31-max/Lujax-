# Recon Map — Claude AI (Free Clone)

**Target:** claude.ai — AI chat assistant by Anthropic
**Platform:** Web (primary), iOS, Android
**Slice:** Core chat loop — conversations, model selection, streaming responses, artifacts, file uploads, web search
**For:** A completely free alternative using FreeLLMAPI as backend (34 providers, 635 free model endpoints)
**Date:** 2026-11-05

---

## Sources

| Source | URL | What it gives |
|--------|-----|---------------|
| Marketing site | https://claude.ai | The pitch, core loop, positioning |
| Help center | https://support.anthropic.com | Feature list, limits, settings |
| Pricing page | https://anthropic.com/pricing | Which features are gated (Pro/Team/Enterprise) |
| Changelog | https://docs.anthropic.com/en/docs/about-claude/models | Model versions, capabilities |
| App Store listing | App Store / Google Play | Screenshots, ratings, the pitch |
| FreeLLMAPI (our backend) | Local project | 635 free model endpoints, router, streaming, tools |

---

## Screen Inventory

| ID | Screen | Route | Purpose | Key Components | States |
|----|--------|-------|---------|----------------|--------|
| S01 | Landing / Auth | `/` | Login/signup gate | Logo, email input, OAuth buttons (Google, Apple), tagline | logged-out, loading |
| S02 | Chat Home | `/` (logged in) | Start new conversation, see recents | Sidebar with conversation list, empty chat area, model selector, composer | empty, has-recents |
| S03 | Conversation | `/chat/{id}` | Active chat thread | Message list, streaming response, composer, model badge | empty, streaming, complete, error, regenerating |
| S04 | Sidebar | (overlay/panel) | Navigate conversations, search | Conversation list grouped by date, search input, new-chat button, project folders | collapsed, expanded, searching, empty |
| S05 | Model Selector | (dropdown in composer) | Pick AI model | Model list with names, descriptions, capability badges (vision, tools, speed) | open, closed |
| S06 | Artifact Panel | (side panel) | View generated content (code, HTML, docs) | Code viewer, HTML preview, copy button, download, version tabs | closed, open-code, open-preview, open-document |
| S07 | Settings | `/settings` | User preferences | Theme toggle, language, data export, account info | default, modified |
| S08 | File Upload | (in composer) | Attach files to message | Drop zone, file chips, image preview thumbnails | empty, has-files, uploading, error |
| S09 | Search Results | (inline in chat) | Show web search citations | Source cards with favicon, title, URL, snippet | loading, results, no-results |
| S10 | Code Block | (in message) | Display code with syntax highlighting | Language badge, copy button, line numbers, syntax colors | collapsed, expanded |
| S11 | Error State | (in chat) | Show errors | Error message, retry button, suggestion text | rate-limit, network-error, model-unavailable |
| S12 | Mobile Chat | `/` (mobile) | Responsive chat on phone | Bottom composer, hamburger menu, swipe sidebar | portrait, landscape |

---

## User Flows

```
F01 Start a new conversation
    S02 chat home -> S05 pick model -> S03 type message -> S03 streaming response
    Clicks: 3 (select model, type, send)
    Edge: no models available, rate limited, network error

F02 Continue existing conversation
    S04 sidebar -> S03 conversation loaded -> S03 type follow-up -> S03 streaming
    Clicks: 2 (pick convo, type & send)
    Edge: conversation deleted, very long thread (context window), scroll to bottom

F03 Upload file and ask about it
    S03 conversation -> S08 drag/paste file -> S03 type question -> S03 response with file context
    Clicks: 3 (attach, type, send)
    Edge: file too large, unsupported format, image vs text file, multiple files

F04 View and use artifact
    S03 response contains artifact -> S06 artifact panel opens -> copy/download/preview
    Clicks: 1 (click artifact)
    Edge: artifact rendering error, large artifact, HTML with scripts, version switching

F05 Web search in chat
    S03 type question needing search -> S09 search results appear -> S03 response with citations
    Clicks: 1 (send message, search auto-triggered or via tool)
    Edge: search provider down, no results, rate limit on search

F06 Switch model mid-conversation
    S03 conversation -> S05 model selector -> S03 continue with new model
    Clicks: 2 (open selector, pick model)
    Edge: model not available, different capabilities (vision lost)

F07 Manage conversations
    S04 sidebar -> rename/delete conversation
    Clicks: 2-3
    Edge: delete confirmation, empty state after last delete, search no results

F08 Change settings
    S07 settings -> toggle theme -> close
    Clicks: 2
    Edge: none significant
```

---

## Components

| Component | Variants | States | Used in |
|-----------|----------|--------|---------|
| MessageBubble | user, assistant, system, error | streaming, complete, with-artifacts, with-images, with-code | S03 |
| Composer | single-line, expanded, with-attachments | empty, typing, has-files, sending, disabled | S02, S03, S12 |
| ModelSelector | dropdown, compact | open, closed, loading, no-models | S02, S03, S05 |
| ConversationList | grouped-by-date | empty, populated, searching, loading | S04 |
| ConversationItem | default, active, hover | idle, selected, renaming, deleting | S04 |
| ArtifactPanel | code, html-preview, document, mermaid | closed, open, loading, error | S06 |
| CodeBlock | inline, full-block | collapsed, expanded, copied | S03, S06, S10 |
| FileChip | image, document, code-file | uploading, ready, error, removing | S08 |
| SearchSourceCard | compact, expanded | loading, loaded | S09 |
| Markdown | message, artifact | rendered, raw | S03, S06 |
| Sidebar | desktop, mobile-overlay | open, closed, collapsed | S04 |
| ThemeToggle | light, dark, system | active-state | S07 |
| Toast | success, error, info | appearing, visible, dismissing | Global |
| TypingIndicator | dots, shimmer | active | S03 |
| RetryButton | inline, block | idle, retrying | S03, S11 |
| Avatar | user, ai-model | default | S03 |
| CopyButton | icon-only, with-label | idle, copied, resetting | S03, S06, S10 |

---

## Inferred Data Model

```
User
  id, email, display_name, avatar_url, theme, language, created_at
  evidence: S01 auth, S07 settings
  confidence: high (but our clone can work without accounts — optional auth)

Conversation
  id, user_id (optional), title, model_id, created_at, updated_at
  evidence: S04 sidebar list, S03 chat header
  confidence: high

Message
  id, conversation_id, role (user|assistant|system), content (text/markdown),
  model_id, attachments (json), artifacts (json), search_results (json),
  token_usage (json), created_at
  evidence: S03 message list, streaming response
  confidence: high

Attachment
  id, message_id, type (image|document|code), filename, mime_type,
  size_bytes, content (base64 or text), thumbnail_url
  evidence: S08 file upload
  confidence: high

Artifact
  id, message_id, type (code|html|document|mermaid|svg), title,
  language, content, version
  evidence: S06 artifact panel
  confidence: high

Model (from FreeLLMAPI — already exists)
  id, platform, model_id, display_name, intelligence_rank, speed_rank,
  context_window, supports_vision, supports_tools, enabled
  evidence: FreeLLMAPI shared/types.ts
  confidence: certain — already built

ApiKey (from FreeLLMAPI — already exists)
  id, platform, label, key (encrypted), base_url, status, enabled
  evidence: FreeLLMAPI shared/types.ts
  confidence: certain — already built
```

---

## What We Already Have (FreeLLMAPI)

FreeLLMAPI gives us a massive head start:

| Component | Status | Notes |
|-----------|--------|-------|
| LLM Router (34 providers) | **Built** | Auto-fallback, rate limit tracking |
| 635 free model endpoints | **Built** | Auto-updating catalog |
| OpenAI-compatible API | **Built** | `/v1/chat/completions` streaming |
| Playground with chat | **Built** | Conversations, streaming, markdown |
| Artifact panel | **Built** | Code viewer, HTML preview |
| File attachments | **Built** | Images and text files in composer |
| Web search | **Built** | Multiple search providers |
| Model selector | **Built** | With intelligence/speed ranking |
| Conversation history | **Built** | Local storage, sidebar |
| Dark/light theme | **Built** | System-aware |
| Tool calling | **Built** | Function calling support |
| Settings | **Built** | Full settings dialog |
| Desktop app | **Built** | Electron-based |
| Mobile apps | **Built** | iOS + Android |

**What we need to add/modify:**
1. Claude-like UI skin (cleaner, more minimal)
2. Landing page with branding
3. Model grouping UX (show "best free" not "groq-llama-3.1")
4. Conversation title auto-generation
5. Better artifact experience
6. Keyboard shortcuts (Cmd+K, Cmd+N)

---

## What Cannot Be Cloned

| Item | Reason | Skip? |
|------|--------|-------|
| Claude models (Opus, Sonnet, Haiku) | Proprietary Anthropic models | skip — use equivalent free models (Llama, Gemini, Qwen, DeepSeek, Mistral) |
| Anthropic's training data | Proprietary | skip — irrelevant, we use other models |
| Projects feature | Complex team/org feature | skip for v1 — could for later |
| Claude.ai accounts & data | Their users, their data | skip — we have our own or no-auth |
| Constitutional AI alignment | Proprietary technique | skip — each provider has own alignment |
| MCP server integration | Claude-specific protocol | skip for v1 — could for later |
| Computer use / tool use agent | Complex agent system | skip for v1 |
| Memory across conversations | Pro/paid feature | could — add later with local storage |

---

## Feature Matrix Summary

See `replica/features.csv` for full matrix. Key counts:
- **must:** 18 features (core chat, streaming, model select, conversations, artifacts, files, search, theme)
- **should:** 8 features (keyboard shortcuts, auto-title, export, mobile responsive)
- **could:** 6 features (memory, projects, MCP, computer use, voice, collaboration)

---

## Size Estimate

| Metric | Count |
|--------|-------|
| Screens | 12 |
| Flows | 8 |
| Entities | 6 (2 already built) |
| Components | 17 (most already exist in FreeLLMAPI) |

**Hard parts:**
1. Re-skinning FreeLLMAPI's playground to look like Claude (CSS/layout work)
2. Smart model routing — presenting 635 models as simple choices like Claude does
3. Making artifacts feel native and polished

**Size: S-M (a few days to a week)**
Most of the backend is already built. This is primarily a UI reskin + UX polish on top of FreeLLMAPI.

---

## Next Step

`/replica-architect` — Plan the stack, database schema and API, building on FreeLLMAPI's existing architecture.
