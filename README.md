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

Manually tested via `src/test.ts`:
- `webSearchAgent`: returned 15 sources and a streamed, cited answer for "What is React?"
- `writingAssistantAgent`: returned a streamed response with no search, for a writing prompt
- `imageSearchAgent`: tested via the running server's `/api/list` endpoint, returned 10 real image results for "cats"
- Server health check (`/health`) and `/api/list` both confirmed working with real HTTP requests

## Suggestion generator wiring decision

`suggestionGeneratorAgent` is exposed as its own separate endpoint (`/api/suggestions`), called by the frontend after an answer finishes streaming and the new AI message has been appended to chat history — keeping the main answer non-blocking.