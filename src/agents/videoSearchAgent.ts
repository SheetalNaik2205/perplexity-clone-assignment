import { BaseMessage } from "@langchain/core/messages";
import { PromptTemplate } from "@langchain/core/prompts";
import {
  RunnableSequence,
  RunnableMap,
  RunnableLambda,
} from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import formatChatHistoryAsString from "../utils/formatHistory";
import { searchSearxng } from "../lib/searxng";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

// Kept the same "standalone question" framing as imageSearchChainPrompt,
// per the TODO checklist in section 2.2.
const videoSearchChainPrompt = `
You will be given a conversation below and a follow up question. You need to rephrase the follow-up question so it is a standalone question that can be used by the LLM to search the web for videos.
You need to make sure the rephrased question agrees with the conversation and is relevant to it.

Example:
1. Follow up question: How does a car engine work?
Rephrased: Car engine working

2. Follow up question: What's the latest iPhone review?
Rephrased: Latest iPhone review

3. Follow up question: How do I do a kickflip?
Rephrased: How to kickflip

Conversation:
{chat_history}
Follow up question: {query}
Rephrased question:
`;

const strParser = new StringOutputParser();

type VideoSearchChainInput = {
  chat_history: BaseMessage[];
  query: string;
};

const createVideoSearchChain = (llm: BaseChatModel) => {
  return RunnableSequence.from([
    RunnableMap.from({
      chat_history: (input: VideoSearchChainInput) =>
        formatChatHistoryAsString(input.chat_history),
      query: (input: VideoSearchChainInput) => input.query,
    }),
    PromptTemplate.fromTemplate(videoSearchChainPrompt),
    llm,
    strParser,
    RunnableLambda.from(async (input: string) => {
      const res = await searchSearxng(input, {
        engines: ["youtube"],
      });

      const videos: {
        img_src: string;
        url: string;
        title: string;
        iframe_src: string;
      }[] = [];

      res.results.forEach((result) => {
        if (
          result.thumbnail &&
          result.url &&
          result.title &&
          result.iframe_src
        ) {
          videos.push({
            img_src: result.thumbnail,
            url: result.url,
            title: result.title,
            iframe_src: result.iframe_src,
          });
        }
      });

      return videos.slice(0, 10);
    }),
  ]);
};

const handleVideoSearch = (
  input: VideoSearchChainInput,
  llm: BaseChatModel
) => {
  const videoSearchChain = createVideoSearchChain(llm);
  return videoSearchChain.invoke(input);
};

export default handleVideoSearch;
