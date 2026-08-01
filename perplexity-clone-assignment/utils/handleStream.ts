import eventEmitter from "events";
import type { StreamEvent } from "@langchain/core/tracers/log_stream";

/**
 * Shared streaming contract handler (section 0.1).
 *
 * Walks the AsyncGenerator produced by `.streamEvents()` on a chain whose
 * final answering step is tagged `.withConfig({ runName: "FinalResponseGenerator" })`
 * and (where applicable) whose reranking step is tagged
 * `.withConfig({ runName: "FinalSourceRetriever" })`.
 *
 * Re-emits three kinds of "data" payloads on the given emitter:
 *   - { type: "sources",  data: Document[] }  — once, when FinalSourceRetriever ends
 *   - { type: "response", data: <chunk> }     — repeatedly, as FinalResponseGenerator streams
 * and finally emits "end" when FinalResponseGenerator completes.
 *
 * This function is identical across every agent in the project (Group A,
 * writingAssistantAgent) — pulled out here per the TODO in section 0.1 so it
 * isn't copy-pasted per file.
 */
const handleStream = async (
  stream: AsyncGenerator<StreamEvent, any, unknown>,
  emitter: eventEmitter
) => {
  for await (const event of stream) {
    if (
      event.event === "on_chain_end" &&
      event.name === "FinalSourceRetriever"
    ) {
      emitter.emit(
        "data",
        JSON.stringify({ type: "sources", data: event.data.output })
      );
    }
    if (
      event.event === "on_chain_stream" &&
      event.name === "FinalResponseGenerator"
    ) {
      emitter.emit(
        "data",
        JSON.stringify({ type: "response", data: event.data.chunk })
      );
    }
    if (
      event.event === "on_chain_end" &&
      event.name === "FinalResponseGenerator"
    ) {
      emitter.emit("end");
    }
  }
};

export default handleStream;
