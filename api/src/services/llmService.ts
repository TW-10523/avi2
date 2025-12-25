/**
 * LLM Service - Clean abstraction for language model interactions
 */
import axios from 'axios';
import { config } from '@/config/index';
 
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
 
export interface LLMResponse {
  content: string;
  tokensUsed?: number;
}
 
class LLMService {
  private baseUrl: string;
  private model: string;
 
  constructor() {
    const url = config.Ollama?.url;
    this.baseUrl = Array.isArray(url) ? url[0] : (url || 'http://localhost:11435');
    // Normalize trailing slashes
    this.baseUrl = this.baseUrl.replace(/\/+$/, '');
    this.model = config.Ollama?.model || 'llama3.2:latest';
  }
 
  /**
   * Generate a response from the LLM
   */
  async generate(
    messages: Message[],
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<LLMResponse> {
    const { temperature = 0.1, maxTokens = 2048 } = options;
 
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/chat`,
        {
          model: this.model,
          messages,
          stream: false,
          options: {
            temperature,
            num_predict: maxTokens,
          },
        },
        { timeout: 120000 }
      );
 
      const content = response.data?.message?.content || '';
      return { content, tokensUsed: content.length / 4 }; // Rough estimate
    } catch (error: any) {
      console.error(`[LLMService] Generation failed:`, error.message);
      throw new Error(`LLM generation failed: ${error.message}`);
    }
  }
 
  /**
   * Simple completion with system prompt
   */
  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: Message[] = [];
   
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });
 
    const response = await this.generate(messages);
    return response.content;
  }
 
  /**
   * Translate text to target language
   */
  async translate(text: string, targetLanguage: string): Promise<string> {
    const systemPrompt = `You are a translator. Translate the following text to ${targetLanguage}.
Return ONLY the translation, nothing else. No explanations, no markers, no formatting.`;
 
    try {
      const result = await this.complete(text, systemPrompt);
      return this.cleanTranslation(result);
    } catch (error: any) {
      console.error(`[LLMService] Translation failed:`, error.message);
      return text; // Return original on failure
    }
  }
 
  /**
   * Clean translation output
   */
  private cleanTranslation(text: string): string {
    return text
      .replace(/\[EN\]/gi, '')
      .replace(/\[JA\]/gi, '')
      .replace(/\[ENGLISH\]/gi, '')
      .replace(/\[JAPANESE\]/gi, '')
      .replace(/<!--.*?-->/g, '')
      .replace(/\{[^}]*"dualLanguage"[^}]*\}/g, '')
      .trim();
  }
 
  /**
   * Check if LLM is available
   */
  async ping(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/api/tags`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
 
// Export singleton instance
export const llmService = new LLMService();
export default LLMService;
 
 