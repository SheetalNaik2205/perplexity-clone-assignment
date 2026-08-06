import express from "express";
import cors from "cors";
import { getLLM, getEmbeddings } from "./config/openai.js";
import { dispatchSearch, dispatchList } from "./dispatch.js";
import generateSuggestions from "./agents/suggestionGeneratorAgent.js";
import type { FocusMode, ListMode } from "./dispatch.js";

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;

app.get("/health", (req, res) => {
  res.json({ success: true, data: "Server is running" });
});

// Streamed agents (web, academic, reddit, youtube, writing)
app.post("/api/search", async (req, res) => {
  try {
    const { focusMode, query, history } = req.body;
    const llm = getLLM();
    const embeddings = getEmbeddings();

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const emitter = dispatchSearch(
      focusMode as FocusMode,
      query,
      history || [],
      llm,
      embeddings
    );

    emitter.on("data", (data: string) => {
      res.write(`data: ${data}\n\n`);
    });

    emitter.on("end", () => {
      res.write("event: end\ndata: {}\n\n");
      res.end();
    });

    emitter.on("error", (err: any) => {
      res.write(`event: error\ndata: ${JSON.stringify({ error: String(err) })}\n\n`);
      res.end();
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// List agents (image, video) - single JSON response, no streaming
app.post("/api/list", async (req, res) => {
  try {
    const { mode, query, history } = req.body;
    const llm = getLLM();

    const result = await dispatchList(mode as ListMode, query, history || [], llm);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Suggestion generator - separate endpoint, called after an answer finishes
app.post("/api/suggestions", async (req, res) => {
  try {
    const { history } = req.body;
    const llm = getLLM();

    const suggestions = await generateSuggestions({ chat_history: history || [] }, llm);
    res.json({ success: true, data: suggestions });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});