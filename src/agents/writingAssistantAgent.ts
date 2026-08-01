import { BaseMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import eventEmitter from "events";
import handleStream from "../utils/handleStream";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

const writingAssistantPrompt = `
You are futuresearch, an AI model who is expert at writing and helping users with their writing tasks. You are set on focus mode 'Writing Assistant', this means you do not perform any web searches — you only use your existing knowledge and the conversation to help the user write, edit, or revise text.

Do not attempt to search the web or claim to have looked anything up; you have no access to search in this mode. If you don't have enough information to help the user (e.g. they reference specific facts, current events, or details you don't know), say so plainly and either ask the user for more detail or suggest they switch to a search-enabled focus mode (Web, Academic, Reddit, or Youtube) for that part of the task.

Be direct, helpful, and concise unless the user is asking for long-form writing. Match the tone and format the user is asking for (emails, essays, code comments, social posts, etc). Today's date is ${new Date().toISOString()}
`;

const strParser = new StringOutputParser();

type WritingAssistantInput = {
  chat_history: BaseMessage[];
  query: string;
};

const createWritingAssistantChain = (llm: BaseChatModel) => {
  return RunnableSequence.from([
    ChatPromptTemplate.fromMessages([
      ["system", writingAssistantPrompt],
      new MessagesPlaceholder("chat_history"),
      ["user", "{query}"],
    ]),
    llm,
    strParser,
  ]).withConfig({
    runName: "FinalResponseGenerator",
  });
};

const basicWritingAssistant = (
  query: string,
  history: BaseMessage[],
  llm: BaseChatModel
) => {
  const emitter = new eventEmitter();

  try {
    const writingAssistantChain = createWritingAssistantChain(llm);

    // No "sources" event will ever fire here — there's no FinalSourceRetriever
    // step in this chain — but handleStream needs zero special-casing to
    // handle that, since it only reacts to events that actually occur.
    const stream = writingAssistantChain.streamEvents(
      { chat_history: history, query: query },
      { version: "v1" }
    );

    handleStream(stream, emitter);
  } catch (err) {
    emitter.emit(
      "error",
      JSON.stringify({ data: "An error has occurred please try again later" })
    );
    console.error(err);
  }

  return emitter;
};

const handleWritingAssistant = (
  message: string,
  history: BaseMessage[],
  llm: BaseChatModel
) => {
  return basicWritingAssistant(message, history, llm);
};

export default handleWritingAssistant;
