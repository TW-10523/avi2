/**
 * Chat Processor - Clean chat generation with RAG support
 */
import { ragService } from './ragService';
import { llmService, Message } from './llmService';
import { queryClassifier } from './queryClassifier';
import { responseFormatter } from './responseFormatter';

export interface ChatInput {
  prompt: string;
  chatHistory?: Message[];
  documentIds?: string[];
  documentNames?: string[];
}

export interface ChatOutput {
  content: string;
  language: string;
  usedRAG: boolean;
  sources: string[];
  metrics: {
    totalTime: number;
    ragTime?: number;
    llmTime?: number;
    translationTime?: number;
  };
}

class ChatProcessor {
  /**
   * Process a chat message and generate response
   */
  async process(input: ChatInput): Promise<ChatOutput> {
    const startTime = Date.now();
    const metrics: ChatOutput['metrics'] = { totalTime: 0 };

    console.log('='.repeat(60));
    console.log('[ChatProcessor] Starting...');
    console.log(`[ChatProcessor] Query: "${input.prompt.substring(0, 50)}..."`);

    // 1. Classify query
    const classification = queryClassifier.classify(input.prompt);
    const userLanguage = classification.language === 'ja' ? 'ja' : 'en';
    const hasDocuments = (input.documentIds?.length || 0) > 0;
    const useRAG = classification.type === 'document' && hasDocuments;

    console.log(`[ChatProcessor] Language: ${userLanguage}, UseRAG: ${useRAG}`);

    // 2. Generate answer
    let englishAnswer: string;
    let sources: string[] = [];

    if (useRAG) {
      const ragStart = Date.now();
      const ragResult = await ragService.generateAnswer(
        input.prompt,
        input.documentIds || [],
        input.documentNames || [],
        input.chatHistory || []
      );
      metrics.ragTime = Date.now() - ragStart;
      
      englishAnswer = ragResult.answer;
      sources = ragResult.sources;
      console.log(`[ChatProcessor] RAG completed in ${metrics.ragTime}ms`);
    } else {
      const llmStart = Date.now();
      englishAnswer = await ragService.generateSimpleAnswer(
        input.prompt,
        input.chatHistory || []
      );
      metrics.llmTime = Date.now() - llmStart;
      console.log(`[ChatProcessor] LLM completed in ${metrics.llmTime}ms`);
    }

    // 3. Clean the answer
    englishAnswer = responseFormatter.cleanLLMOutput(englishAnswer);

    if (!englishAnswer || englishAnswer.length < 5) {
      englishAnswer = responseFormatter.getFallbackMessage('en');
    }

    // 4. Translate to Japanese
    const translationStart = Date.now();
    let japaneseAnswer: string;

    try {
      japaneseAnswer = await llmService.translate(englishAnswer, 'Japanese');
      japaneseAnswer = responseFormatter.cleanJapaneseOutput(japaneseAnswer);
    } catch {
      japaneseAnswer = responseFormatter.getFallbackMessage('ja');
    }

    metrics.translationTime = Date.now() - translationStart;
    console.log(`[ChatProcessor] Translation completed in ${metrics.translationTime}ms`);

    // 5. Format dual-language response
    const { wrapped } = responseFormatter.createDualLanguageResponse(
      englishAnswer,
      japaneseAnswer,
      userLanguage
    );

    metrics.totalTime = Date.now() - startTime;

    console.log(`[ChatProcessor] Total time: ${metrics.totalTime}ms`);
    console.log('='.repeat(60));

    return {
      content: wrapped,
      language: userLanguage,
      usedRAG: useRAG,
      sources,
      metrics,
    };
  }

  /**
   * Generate a chat title from first message
   */
  async generateTitle(prompt: string): Promise<string> {
    try {
      const response = await llmService.complete(
        `Generate a short title (max 5 words) for this chat: "${prompt.substring(0, 100)}"`,
        'You are a title generator. Return ONLY a short title, nothing else.'
      );
      return response.substring(0, 50).trim() || 'New Chat';
    } catch {
      return 'New Chat';
    }
  }
}

// Export singleton instance
export const chatProcessor = new ChatProcessor();
export default ChatProcessor;
