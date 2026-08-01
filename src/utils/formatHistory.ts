import { BaseMessage } from "@langchain/core/messages";

/**
 * NOTE: this file is imported by the given `academicSearchAgent.ts`
 * (`import formatChatHistoryAsString from "../utils/formatHistory"`) but its
 * implementation wasn't part of the assignment doc. Standard implementation:
 * turns the chat_history array into a flat "Role: content" transcript, which
 * is what gets interpolated into the retriever prompt's {chat_history} slot.
 */
const formatChatHistoryAsString = (history: BaseMessage[]): string => {
  return history
    .map((message) => `${message._getType()}: ${message.content}`)
    .join("\n");
};

export default formatChatHistoryAsString;
