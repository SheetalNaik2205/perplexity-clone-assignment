import eventEmitter from "events";
import type { StreamEvent } from "@langchain/core/tracers/log_stream";

const handleStream = async (
  stream: AsyncGenerator<StreamEvent, any, unknown>,
  emitter: eventEmitter
) => {
  try {
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
  } catch (err) {
    emitter.emit(
      "data",
      JSON.stringify({
        type: "response",
        data: "Sorry, something went wrong while searching. Please try again.",
      })
    );
    emitter.emit("end");
  }
};

export default handleStream;