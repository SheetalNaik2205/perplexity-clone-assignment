# Perplexity Clone

A Perplexity-style AI search engine built with TypeScript and LangChain (plain Runnable composition, no LangGraph). It takes a user's question, searches the web through a self-hosted SearXNG instance, reranks results by embedding similarity, and streams back a cited, AI-generated answer.

## Agents

| Agent | Type | What it does |
|---|---|---|
| `webSearchAgent` | Streamed | General web search with cited answers |
| `academicSearchAgent` | Streamed | Search focused on academic/research sources |
| `redditSearchAgent` | Streamed | Search focused on Reddit discussions |
| `youtubeSearchAgent` | Streamed | Search focused on YouTube content |
| `writingAssistantAgent` | Streamed | Writing/editing help, no web search |
| `imageSearchAgent` | List (no streaming) | Returns a list of relevant images |
| `videoSearchAgent` | List (no streaming) | Returns a list of relevant videos |
| `suggestionGeneratorAgent` | List (no streaming) | Generates 4-5 follow-up question suggestions |

## Tech Stack

- **Language:** TypeScript (Node.js, ESM)
- **LLM:** Groq (`llama-3.3-70b-versatile`) via the OpenAI-compatible API
- **Embeddings:** Google Gemini (`gemini-embedding-001`)
- **Search:** SearXNG (self-hosted, run via Docker)
- **Orchestration:** LangChain (`@langchain/core`) — `RunnableSequence`, `RunnableMap`, `RunnableLambda`, `.streamEvents()`
- **Server:** Express

## Setup

1. `npm install`
2. `cp .env.example .env` and fill in your own `GROQ_API_KEY` and `GEMINI_API_KEY`
3. Run SearXNG: `docker run -d --name searxng -p 8080:8080 searxng/searxng`
4. Enable JSON output in SearXNG's settings (copy `settings.yml` out, add `limiter: false` and `formats: [html, json]` under `search:`, copy back, `docker restart searxng`)

## Running

- Quick single-agent test: `npx tsx src/test.ts`
- Start the server: `npx tsx src/server.ts`, then `curl http://localhost:3000/health`

## Section 1.3 — sort-direction audit

To keep the **most similar** docs after `.filter(sim => sim.similarity > 0.5).slice(0, 15)`, the array must be sorted **descending** by similarity. The given `academicSearchAgent.ts` reference sorts ascending — this bug was left unchanged there (per the assignment's instruction not to silently fix the given file) but fixed in `redditSearchAgent.ts`, `webSearchAgent.ts`, and `youtubeSearchAgent.ts`.

## Testing Results

Manually tested via `src/test.ts`, one agent at a time:

| Agent | Result |
|---|---|
| `webSearchAgent` | ✅ 15 sources, cited answer for "What is React?" |
| `academicSearchAgent` | ✅ 10 sources, well-structured cited answer for "What is quantum entanglement?" |
| `writingAssistantAgent` | ✅ Clean streamed response, no search, for a writing prompt |
| `redditSearchAgent` | ⚠️ Returns 15 sources, but they read like general web content, not Reddit threads. Verified via direct `curl` to SearXNG that its `server-timing` header never lists a "reddit" engine, and `/config` confirms no engine named "reddit" is registered in this SearXNG install. SearXNG silently falls back to its default engines instead of erroring. This is a SearXNG installation limitation, not an app bug. |
| `youtubeSearchAgent` | 🐛 **Bug found and fixed.** Initially returned 0 sources. Diagnosed via direct `curl` to SearXNG that YouTube results have `"content": ""` (empty string, not `null`). The code used `result.content ?? result.title`, and `??` only falls back on `null`/`undefined`, not empty strings — so empty content passed through and got filtered out later. Fixed by changing `??` to `\|\|`. Re-tested: now returns 15 sources correctly. |
| `imageSearchAgent` | ✅ Real results confirmed via the running server's `/api/list` endpoint |
| `videoSearchAgent` | ✅ 10 clean results, all required fields (`img_src`, `url`, `title`, `iframe_src`) present |
| `suggestionGeneratorAgent` | ✅ 5 relevant, well-formed follow-up questions generated from chat history |

**Summary:** 7/8 agents fully working as expected. 1 real bug found through testing and fixed (`youtubeSearchAgent`'s empty-string handling). 1 infrastructure limitation identified and documented (Reddit engine not available in this SearXNG installation).

## Suggestion generator wiring decision

`suggestionGeneratorAgent` is exposed as its own separate endpoint (`/api/suggestions`), called by the frontend after an answer finishes streaming and the new AI message has been appended to chat history — keeping the main answer non-blocking.