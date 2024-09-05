import { Embeddings } from '@langchain/core/embeddings';
import { Document } from '@langchain/core/documents';
import computeSimilarity from '../utils/computeSimilarity';
import logger from '../utils/logger';

export const rerankDocs = async ({
  query,
  docs,
  embeddings,
  returnSize,
  weight,
}: {
  query: string;
  docs: Document[];
  embeddings: Embeddings;
  returnSize: number;
  weight: number;
}) => {
  try {
    if (docs.length === 0) {
      return docs;
    }

    if (query === 'Summarize') {
      return docs;
    }

    const docsWithContent = docs.filter(
      (doc) => doc.pageContent && doc.pageContent.length > 0,
    );

    const [docEmbeddings, queryEmbedding] = await Promise.all([
      embeddings.embedDocuments(docsWithContent.map((doc) => doc.pageContent)),
      embeddings.embedQuery(query),
    ]);

    const similarity = docEmbeddings.map((docEmbedding, i) => {
      const sim = computeSimilarity(queryEmbedding, docEmbedding);

      return {
        index: i,
        similarity: sim,
      };
    });
    if (returnSize <= 0) {
      return similarity
        .filter((sim) => sim.similarity > weight)
        .sort((a, b) => b.similarity - a.similarity)
        .map((sim) => docsWithContent[sim.index]);
    } else {
      return similarity
        .filter((sim) => sim.similarity > weight)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, returnSize)
        .map((sim) => docsWithContent[sim.index]);
    }
  } catch (e) {
    logger.error('rerankDocs error:', e);
    return [];
  }
};
