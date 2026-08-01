# Perplexity Clone — Assignment Submission

## What's here

```
utils/handleStream.ts              shared streaming contract (section 0.1)
utils/formatHistory.ts             chat_history -> string (referenced by given code, not provided)
utils/computeSimilarity.ts         cosine similarity (referenced by given code, not provided)
lib/searxng.ts                     searxng client (referenced by given code, not provided)
lib/outputParsers/listLineOutputParser.ts   <suggestions> XML parser (section 4)
agents/academicSearchAgent.ts      GIVEN reference — only handleStream import changed
agents/imageSearchAgent.ts         GIVEN reference — reconstructed from section 2.1 pseudocode
agents/redditSearchAgent.ts        BUILT — Group A
agents/webSearchAgent.ts           BUILT — Group A
agents/youtubeSearchAgent.ts       BUILT — Group A
agents/videoSearchAgent.ts         BUILT — Group B
agents/writingAssistantAgent.ts    BUILT
agents/suggestionGeneratorAgent.ts BUILT
dispatch.ts                        focusMode -> handler lookup (Integration checklist)
```

## Section 1.3 — sort-direction audit

To keep the **most similar** docs after `.filter(sim => sim.similarity > 0.5).slice(0, 15)`,
the array must be sorted **descending** by similarity (`(a, b) => b.similarity - a.similarity`)
*before* the filter/slice — otherwise slicing the first 15 keeps the docs closest to the
0.5 cutoff (i.e. the *least* similar of the qualifying set), not the best matches.

**The given `academicSearchAgent.ts` has this bug**: its `rerankDocs` sorts ascending
(`(a, b) => a.similarity - b.similarity`). Per the assignment instructions, this was
**left unchanged** in `agents/academicSearchAgent.ts` and only flagged here (not
silently fixed). It **was fixed** (sort direction reversed) in `redditSearchAgent.ts`,
`webSearchAgent.ts`, and `youtubeSearchAgent.ts`, with an inline comment at each fix site.

## Assumptions about ungiven code

`academicSearchAgent.ts` imports three modules whose implementations weren't included
in the assignment doc: `formatChatHistoryAsString`, `computeSimilarity`, and
`searchSearxng`. Standard implementations are provided (see the NOTE comment at the
top of each file) — swap in the real project versions if they differ, particularly
`searchSearxng`'s exact response shape from your actual SearXNG instance.

`imageSearchAgent.ts` wasn't given as a full file — only the anatomy pseudocode in
section 2.1 — so it's reconstructed here in a form consistent with that pseudocode
and with `videoSearchAgent.ts`'s required parity (section 2.2 table).

## Section 4 — suggestionGeneratorAgent wiring decision

Documented in the comment block at the bottom of `agents/suggestionGeneratorAgent.ts`:
called from the **same route handler** as the triggering agent, right after its stream's
`"end"` event, using the chat_history with the new AI response already appended —
avoids a second HTTP round trip for the frontend to fetch suggestion chips.

## Manual test cases (section 5)

For each Group A agent (reddit/web/youtube) and `academicSearchAgent`:
1. Normal question — e.g. `"What do people think about the new iPhone?"` — expect a
   `sources` event followed by streamed `response` chunks, then `end`.
2. `"hi"` — expect the retriever chain to hit `not_needed`, so `context` resolves to
   an empty string and the answering chain still completes normally (no crash, no
   sources).
3. A follow-up with prior chat_history (e.g. `"what about the camera?"` after a
   phone-review question) — expect the rephrase step to fold in context from
   `chat_history` before searching.

For `imageSearchAgent` / `videoSearchAgent` (Group B): same three cases via `.invoke()`,
confirming case 2 (`"hi"`) is **not** specially handled — every input is searched, per
section 2.2's note that neither agent has a `not_needed` branch.
