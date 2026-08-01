import { BaseMessage } from "@langchain/core/messages";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { Embeddings } from "@langchain/core/embeddings";

import handleAcademicSearch from "./agents/academicSearchAgent";
import handleRedditSearch from "./agents/redditSearchAgent";
import handleWebSearch from "./agents/webSearchAgent";
import handleYoutubeSearch from "./agents/youtubeSearchAgent";
import handleWritingAssistant from "./agents/writingAssistantAgent";
import handleImageSearch from "./agents/imageSearchAgent";
import handleVideoSearch from "./agents/videoSearchAgent";

export type FocusMode =
  | "academicSearch"
  | "redditSearch"
  | "webSearch"
  | "youtubeSearch"
  | "writingAssistant";

// Group A + writingAssistant: streamed, eventEmitter-based handlers, all
// sharing the exact same (query, history, llm, embeddings?) call shape.
const streamedHandlers: Record<
  FocusMode,
  (
    query: string,
    history: BaseMessage[],
    llm: BaseChatModel,
    embeddings: Embeddings
  ) => any
> = {
  academicSearch: handleAcademicSearch,
  redditSearch: handleRedditSearch,
  webSearch: handleWebSearch,
  youtubeSearch: handleYoutubeSearch,
  // writingAssistant doesn't need embeddings; wrapped to match the lookup's shape.
  writingAssistant: (query, history, llm) =>
    handleWritingAssistant(query, history, llm),
};

/**
 * Single lookup-based dispatch for the streamed focus modes (Integration
 * checklist item), instead of hardcoded if/switch branching per route.
 */
export const dispatchSearch = (
  focusMode: FocusMode,
  query: string,
  history: BaseMessage[],
  llm: BaseChatModel,
  embeddings: Embeddings
) => {
  const handler = streamedHandlers[focusMode];
  if (!handler) {
    throw new Error(`Unknown focus mode: ${focusMode}`);
  }
  return handler(query, history, llm, embeddings);
};

// Group B (image/video) is invoke()-based with a different input shape
// ({ query, chat_history }) and no embeddings, so it's kept as a separate
// small lookup rather than forced into the streamed one above.
export type ListMode = "imageSearch" | "videoSearch";

const listHandlers: Record<
  ListMode,
  (
    input: { query: string; chat_history: BaseMessage[] },
    llm: BaseChatModel
  ) => Promise<any>
> = {
  imageSearch: handleImageSearch,
  videoSearch: handleVideoSearch,
};

export const dispatchList = (
  mode: ListMode,
  query: string,
  history: BaseMessage[],
  llm: BaseChatModel
) => {
  const handler = listHandlers[mode];
  if (!handler) {
    throw new Error(`Unknown list mode: ${mode}`);
  }
  return handler({ query, chat_history: history }, llm);
};
