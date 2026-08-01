import { BaseOutputParser } from "@langchain/core/output_parsers";

interface ListLineOutputParserArgs {
  key?: string;
}

/**
 * Pulls a newline-delimited list out of a single XML-style tag in the LLM's
 * raw text output, e.g.:
 *
 *   <suggestions>
 *   What causes stable diffusion to hallucinate details?
 *   How does classifier-free guidance work?
 *   </suggestions>
 *
 * -> ["What causes stable diffusion to hallucinate details?", "How does classifier-free guidance work?"]
 *
 * `key` must match the tag name used in the prompt (section 4 uses "suggestions").
 */
class ListLineOutputParser extends BaseOutputParser<string[]> {
  private key = "suggestions";
  lc_namespace = ["langchain", "output_parsers", "list_line_output_parser"];

  constructor(args?: ListLineOutputParserArgs) {
    super();
    if (args?.key) {
      this.key = args.key;
    }
  }

  static lc_name() {
    return "ListLineOutputParser";
  }

  async parse(text: string): Promise<string[]> {
    const regex = new RegExp(`<${this.key}>([\\s\\S]*?)<\\/${this.key}>`);
    const match = text.match(regex);

    let lines: string[] = [];
    if (match) {
      lines = match[1]
        .trim()
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    }

    return lines;
  }

  getFormatInstructions(): string {
    throw new Error("Not implemented");
  }
}

export default ListLineOutputParser;
