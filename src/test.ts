import { getLLM, getEmbeddings } from "./config/openai.js";
import handleWritingAssistant from "./agents/writingAssistantAgent.js";

const llm = getLLM();
const embeddings = getEmbeddings();

const emitter = handleWritingAssistant(
  "Write a two-line poem about the ocean",
  [],
  llm
);

emitter.on("data", (d: string) => {
  const parsed = JSON.parse(d);
  if (parsed.type === "sources") {
    console.log("\n--- SOURCES ---");
    console.log(`Found ${parsed.data.length} sources`);
  }
  if (parsed.type === "response") {
    process.stdout.write(parsed.data);
  }
});

emitter.on("end", () => {
  console.log("\n\n--- DONE ---");
});

emitter.on("error", (e: any) => {
  console.error("ERROR:", e);
});