import { BaseMessage } from "@langchain/core/messages";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence, RunnableMap } from "@langchain/core/runnables";
import formatChatHistoryAsString from "../utils/formatHistory";
import ListLineOutputParser from "../lib/outputParsers/listLineOutputParser";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

const suggestionGeneratorPrompt = `
You are an AI suggestion generator for an AI powered search engine. You will be given a conversation below. You need to generate 4-5 medium-length suggestions for follow-up questions the user might want to ask next, based on the conversation so far.

You need to make sure the suggestions are relevant to the conversation and help the user dig deeper into the topic that has already been discussed. Do not repeat questions that have already been asked or answered in the conversation.

Make sure the suggestions are medium in length, are informative, and are direct questions that can be sent to a search engine or chat model without further editing.

Provide these suggestions separated by newlines between the XML tags <suggestions> and </suggestions>. For example:

<suggestions>
Tell me more about X
How does Y compare to Z?
What are the risks of X?
</suggestions>

Conversation:
{chat_history}
`;

const outputParser = new ListLineOutputParser({ key: "suggestions" });

type SuggestionGeneratorInput = {
  chat_history: BaseMessage[];
};

const createSuggestionGeneratorChain = (llm: BaseChatModel) => {
  return RunnableSequence.from([
    RunnableMap.from({
      chat_history: (input: SuggestionGeneratorInput) =>
        formatChatHistoryAsString(input.chat_history),
    }),
    PromptTemplate.fromTemplate(suggestionGeneratorPrompt),
    llm,
    outputParser,
  ]);
};

const generateSuggestions = (
  input: SuggestionGeneratorInput,
  llm: BaseChatModel
) => {
  // Force temperature = 0 for consistent, less repetitive suggestions.
  // Mutated directly on the llm instance (rather than passed as an option)
  // to match the given code pattern in section 4.
  (llm as any).temperature = 0;

  return createSuggestionGeneratorChain(llm).invoke(input);
};

export default generateSuggestions;

/**
 * Wiring decision (section 4 TODO):
 *
 * This is called from the SAME route handler as the triggering search/writing
 * agent, right after that agent's stream ends — not exposed as its own
 * separate endpoint.
 *
 * Why: the emitter for the main agent already fires "end" with the fully
 * streamed AI response available server-side at that point, so the updated
 * chat_history (with the new AI message appended) is already in hand with no
 * extra round trip needed. Calling generateSuggestions() there and pushing
 * its result as one more "data" event (e.g. { type: "suggestions", data: [...] })
 * on the same emitter before "end" keeps this to a single request/response
 * cycle for the frontend, instead of requiring a second HTTP call once the
 * answer finishes rendering.
 */
