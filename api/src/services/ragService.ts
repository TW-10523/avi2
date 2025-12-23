/**
 * RAG Service - Retrieval Augmented Generation
 */
import { solrService, SolrDocument } from './solrService';
import { llmService, Message } from './llmService';
import { responseFormatter } from './responseFormatter';

export interface RAGResult {
  answer: string;
  sources: string[];
  documentsUsed: number;
}

class RAGService {
  /**
   * Generate answer using RAG
   */
  async generateAnswer(
    query: string,
    documentIds: string[],
    documentNames: string[],
    chatHistory: Message[] = []
  ): Promise<RAGResult> {
    console.log(`[RAG] Query: "${query.substring(0, 50)}..."`);
    console.log(`[RAG] Searching ${documentIds.length} document(s)`);

    // 1. Search documents
    const searchResult = await solrService.search(query, documentIds, 5);
    const docs = searchResult.docs;

    console.log(`[RAG] Found ${docs.length} relevant passages`);

    if (docs.length === 0) {
      return {
        answer: "I couldn't find relevant information in your documents to answer this question.",
        sources: [],
        documentsUsed: 0,
      };
    }

    // 2. Build context from documents
    const context = this.buildContext(docs, documentNames);

    // 3. Generate answer with LLM
    const answer = await this.generateWithContext(query, context, chatHistory);

    // 4. Extract sources
    const sources = docs.map(d => d.title?.[0] || d.id).filter(Boolean);

    return {
      answer: responseFormatter.cleanLLMOutput(answer),
      sources: [...new Set(sources)],
      documentsUsed: docs.length,
    };
  }

  /**
   * Build context string from documents
   */
  private buildContext(docs: SolrDocument[], documentNames: string[]): string {
    return docs
      .map((doc, i) => {
        const content = Array.isArray(doc._text_)
          ? doc._text_.slice(0, 3).join('\n')
          : String(doc.content || doc._text_ || '');

        const title = Array.isArray(doc.title) ? doc.title[0] : doc.title;
        const name = title || documentNames[i] || `Document ${i + 1}`;

        return `=== ${name} ===\n${content.substring(0, 3000)}\n===`;
      })
      .join('\n\n');
  }

  /**
   * Generate answer with context
   */
  private async generateWithContext(
    query: string,
    context: string,
    chatHistory: Message[]
  ): Promise<string> {
    const systemPrompt = `You are a helpful assistant. Answer questions using ONLY the provided document content.

RULES:
1. Extract exact values from documents (names, numbers, dates)
2. Give direct, concise answers
3. Cite the source document when possible
4. If information is not in documents, say so clearly
5. Respond in plain text only - no JSON, no special markers`;

    const userPrompt = `DOCUMENT CONTENT:
${context}

QUESTION: ${query}

Answer based ONLY on the documents above:`;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.slice(-4), // Last 4 messages for context
      { role: 'user', content: userPrompt },
    ];

    const response = await llmService.generate(messages, { temperature: 0.1 });
    return response.content;
  }

  /**
   * Simple answer without RAG (for general queries)
   */
  async generateSimpleAnswer(
    query: string,
    chatHistory: Message[] = []
  ): Promise<string> {
    const systemPrompt = `You are a helpful assistant. Answer questions clearly and concisely.
Respond in plain text only - no JSON, no special markers like [EN] or [JA].`;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.slice(-4),
      { role: 'user', content: query },
    ];

    const response = await llmService.generate(messages, { temperature: 0.3 });
    return responseFormatter.cleanLLMOutput(response.content);
  }
}

// Export singleton instance
export const ragService = new RAGService();
export default RAGService;
