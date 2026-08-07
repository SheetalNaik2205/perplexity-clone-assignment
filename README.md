# Perplexity Clone

A Perplexity-style AI search engine built with TypeScript and LangChain (plain Runnable composition, no LangGraph). It takes a user's question, searches the web through a self-hosted SearXNG instance, reranks results by embedding similarity, and streams back a cited, AI-generated answer.

## 🔗 Live Links

- **Frontend (try it here):** https://perplexity-clone-assignment-1.onrender.com
- **Backend API:** https://perplexity-clone-assignment.onrender.com
- **SearXNG instance:** https://searxng-pt2a.onrender.com

⚠️ All three run on Render's free tier, which spins down after inactivity — the first request after idle time can take up to 50 seconds. This is expected, not a bug.

## Agents

| Agent | Type | What it does |
|---|---|---|
| `webSearchAgent` | Streamed | General web search with cited answers |
| `academicSearchAgent` | Streamed | Search focused on academic/research sources |
| `redditSearchAgent` | Streamed | Search intended for Reddit discussions (see Known Limitations) |
| `youtubeSearchAgent` | Streamed | Search focused on YouTube content |
| `writingAssistantAgent` | Streamed | Writing/editing help, no web search |
| `imageSearchAgent` | List (no streaming) | Returns a list of relevant images |
| `videoSearchAgent` | List (no streaming) | Returns a list of relevant videos |
| `suggestionGeneratorAgent` | List (no streaming) | Generates 4-5 follow-up question suggestions, called automatically after each answer |

Per the assignment spec, only the first 5 are true "focus modes" (each has a `'focus mode X'` persona line in its prompt). Image/video search are a separate "search-and-list" category, and suggestions run automatically rather than being user-selected — the frontend reflects this: 5 focus-mode buttons, with Image/Video as separate toggle buttons next to the search box.

## Tech Stack

- **Language:** TypeScript (Node.js, ESM)
- **LLM:** Groq (`llama-3.3-70b-versatile`) via the OpenAI-compatible API
- **Embeddings:** Google Gemini (`gemini-embedding-001`)
- **Search:** SearXNG (self-hosted, deployed via Docker image on Render)
- **Orchestration:** LangChain (`@langchain/core`) — `RunnableSequence`, `RunnableMap`, `RunnableLambda`, `.streamEvents()`
- **Backend:** Express, deployed on Render
- **Frontend:** Plain HTML/CSS/JS, deployed as a static site on Render

## Local Setup

1. `npm install`
2. `cp .env.example .env` and fill in your own `GROQ_API_KEY`, `GEMINI_API_KEY`, and `SEARXNG_API_URL`
3. Run SearXNG locally: `docker run -d --name searxng -p 8080:8080 searxng/searxng`
4. Enable JSON output in SearXNG's settings (copy `settings.yml` out, add `limiter: false` and `formats: [html, json]` under `search:`, copy back, `docker restart searxng`)
5. Quick single-agent test: `npx tsx src/test.ts`
6. Start the server: `npx tsx src/server.ts`

## Section 1.3 — Sort-Direction Audit

To keep the **most similar** docs after `.filter(sim => sim.similarity > 0.5).slice(0, 15)`, the array must be sorted **descending** by similarity. The given `academicSearchAgent.ts` reference sorts ascending — this bug was left unchanged there (per the assignment's instruction not to silently fix the given file) but fixed in `redditSearchAgent.ts`, `webSearchAgent.ts`, and `youtubeSearchAgent.ts`.

## Bugs Found & Fixed Through Testing

1. **YouTube empty-content bug:** `youtubeSearchAgent` initially returned 0 sources. Root cause: SearXNG returns YouTube results with `"content": ""` (empty string, not `null`). The code used `result.content ?? result.title`, and `??` only falls back on `null`/`undefined`, not empty strings — so empty content passed through and got filtered out downstream. Fixed by changing `??` to `||`. Confirmed fixed: 15 sources returned afterward.

2. **Hanging requests on SearXNG failure:** When SearXNG returned an error (429/502), the streaming chain had no error handling, so the request hung indefinitely with no response and no error shown to the user — and in some cases crashed the whole Node process. Fixed by: (a) wrapping every `searchSearxng` call in a try/catch that falls back to an empty result set instead of throwing, and (b) wrapping `handleStream`'s event loop in a try/catch that emits a graceful error message and ends the stream instead of hanging forever. Also added `process.on("unhandledRejection")` and `process.on("uncaughtException")` handlers in `server.ts` so one bad request can never take down the whole server.

## Known Limitations (Infrastructure, Not App Bugs)

- **Reddit search:** Reddit locked down free API access in 2023, and SearXNG no longer ships a working Reddit engine as a result. `redditSearchAgent` no longer crashes or hangs (fixed, see above) and returns a real, cited answer — but since no Reddit-specific engine is available, results come from general web sources rather than actual Reddit threads. Verified via direct `curl` to SearXNG that no engine named "reddit" appears in its `/config` engine list.

- **Image search quality:** This SearXNG deployment doesn't have reliable dedicated photo engines (Bing Images/Google Images) enabled — direct testing showed the named engines returning icon libraries instead of the requested engines. `imageSearchAgent` was adjusted to search without naming specific engines (still 100% SearXNG-based, per the assignment spec), which returns real images but with mixed relevance.

- **Rate limiting under heavy testing:** SearXNG's bot-detection layer can return `429 Too Many Requests` when hit with many rapid requests in a short window (as happened repeatedly during development/testing). This is not a persistent failure — it self-resolves after a short cooldown, and does not occur under normal single-user usage.

## Testing Results

Every agent was tested individually, both via `src/test.ts` (direct) and through the live deployed frontend:

| Agent | Result |
|---|---|
| `webSearchAgent` | ✅ Working — cited answers, real sources |
| `academicSearchAgent` | ✅ Working — cited answers, real sources |
| `redditSearchAgent` | ✅ No longer crashes; answers generated but limited by Reddit engine unavailability (documented above) |
| `youtubeSearchAgent` | ✅ Working after bug fix (see above) |
| `writingAssistantAgent` | ✅ Working — no search, clean streamed response |
| `imageSearchAgent` | ✅ Working — real images returned, relevance limited by available engines (documented above) |
| `videoSearchAgent` | ✅ Working — clean video results with all required fields |
| `suggestionGeneratorAgent` | ✅ Working — relevant follow-up questions generated after each answer |