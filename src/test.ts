import { getLLM } from "./config/openai.js";
import generateSuggestions from "./agents/suggestionGeneratorAgent.js";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

const llm = getLLM();

const history = [
  new HumanMessage("What is React?"),
  new AIMessage("React is a JavaScript library for building user interfaces, developed by Meta."),
];

const suggestions = await generateSuggestions({ chat_history: history }, llm);

console.log(suggestions);