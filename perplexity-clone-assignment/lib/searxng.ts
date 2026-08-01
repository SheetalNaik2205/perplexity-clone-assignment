import axios from "axios";

/**
 * NOTE: imported by the given `academicSearchAgent.ts`
 * (`import { searchSearxng } from "../lib/searxng"`) but not included in the
 * assignment doc. Standard thin wrapper around a self-hosted SearXNG
 * instance's JSON search API. SEARXNG_API_URL should point at that instance,
 * e.g. http://localhost:4000.
 */
interface SearxngSearchOptions {
  categories?: string[];
  engines?: string[];
  language?: string;
  pageno?: number;
}

interface SearxngSearchResult {
  title: string;
  url: string;
  img_src?: string;
  thumbnail_src?: string;
  thumbnail?: string;
  content?: string;
  author?: string;
  iframe_src?: string;
}

export const searchSearxng = async (
  query: string,
  opts?: SearxngSearchOptions
) => {
  const url = new URL(`${process.env.SEARXNG_API_URL}/search`);
  url.searchParams.append("q", query);
  url.searchParams.append("format", "json");

  if (opts) {
    Object.keys(opts).forEach((key) => {
      const value = (opts as any)[key];
      if (Array.isArray(value)) {
        url.searchParams.append(key, value.join(","));
      } else {
        url.searchParams.append(key, value as string);
      }
    });
  }

  const res = await axios.get(url.toString());

  const results: SearxngSearchResult[] = res.data.results;
  const suggestions: string[] = res.data.suggestions;

  return { results, suggestions };
};
