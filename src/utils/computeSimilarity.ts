/**
 * NOTE: imported by the given `academicSearchAgent.ts`
 * (`import computeSimilarity from "../utils/computeSimilarity"`) but not
 * included in the assignment doc. Standard cosine similarity between two
 * embedding vectors, used by rerankDocs to score doc-vs-query relevance.
 */
const computeSimilarity = (x: number[], y: number[]): number => {
  const dotProduct = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const magX = Math.sqrt(x.reduce((sum, xi) => sum + xi * xi, 0));
  const magY = Math.sqrt(y.reduce((sum, yi) => sum + yi * yi, 0));
  if (magX === 0 || magY === 0) return 0;
  return dotProduct / (magX * magY);
};

export default computeSimilarity;
