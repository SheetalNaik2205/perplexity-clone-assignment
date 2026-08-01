import { ChatOpenAI } from "@langchain/openai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import "dotenv/config";

export const getLLM = () => {
  return new ChatOpenAI({
    apiKey: process.env.GROQ_API_KEY,
    model: "llama-3.3-70b-versatile",
    configuration: {
      baseURL: "https://api.groq.com/openai/v1",
    },
  });
};

export const getEmbeddings = () => {
  return new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    model: "gemini-embedding-001",
  });
};