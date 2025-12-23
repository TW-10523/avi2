/**
 * Response Formatter - Clean dual-language response formatting
 */

export interface DualLanguageResponse {
  dualLanguage: true;
  japanese: string;
  translated: string;
  targetLanguage: string;
}

export interface FormattedResponse {
  raw: string;
  wrapped: string;
}

class ResponseFormatter {
  /**
   * Clean LLM output - remove markers, JSON artifacts, and mixed content
   */
  cleanLLMOutput(text: string): string {
    if (!text) return '';

    let cleaned = text;

    // Try to extract from JSON if wrapped
    if (cleaned.includes('"dualLanguage"') || cleaned.includes('"translated"')) {
      try {
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          cleaned = parsed.translated || parsed.english || parsed.content || cleaned;
        }
      } catch {
        // Remove JSON artifacts manually
        cleaned = cleaned.replace(/\{[^}]*"dualLanguage"[^}]*\}/g, '');
      }
    }

    // Extract content from [EN] marker if present
    const enMatch = cleaned.match(/\[EN\]\s*([\s\S]*?)(?=\[J\s*A\s*\]|\[\/EN\]|$)/i);
    if (enMatch && enMatch[1].trim().length > 10) {
      cleaned = enMatch[1].trim();
    }

    // Cut off at [JA] marker
    const jaIndex = cleaned.search(/\[J\s*A\s*\]/i);
    if (jaIndex > 20) {
      cleaned = cleaned.substring(0, jaIndex).trim();
    }

    // Remove all markers and artifacts
    cleaned = cleaned
      .replace(/\[\s*EN\s*\]/gi, '')
      .replace(/\[\s*J\s*A\s*\]/gi, '')
      .replace(/\[ENGLISH\]/gi, '')
      .replace(/\[JAPANESE\]/gi, '')
      .replace(/\[JAPANESU\]/gi, '')
      .replace(/<!--.*?-->/g, '')
      .replace(/\{[^}]*"dualLanguage"[^}]*\}/g, '')
      .trim();

    return cleaned;
  }

  /**
   * Clean Japanese text
   */
  cleanJapaneseOutput(text: string): string {
    if (!text) return '';

    let cleaned = text;

    // Try to extract from JSON
    if (cleaned.includes('"dualLanguage"') || cleaned.includes('"japanese"')) {
      try {
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          cleaned = parsed.japanese || parsed.content || cleaned;
        }
      } catch {
        cleaned = cleaned.replace(/\{[^}]*"dualLanguage"[^}]*\}/g, '');
      }
    }

    // Remove markers
    cleaned = cleaned
      .replace(/\[\s*EN\s*\]/gi, '')
      .replace(/\[\s*J\s*A\s*\]/gi, '')
      .replace(/<!--.*?-->/g, '')
      .trim();

    return cleaned;
  }

  /**
   * Create dual-language response wrapper
   */
  createDualLanguageResponse(
    englishText: string,
    japaneseText: string,
    userLanguage: string = 'en'
  ): FormattedResponse {
    const response: DualLanguageResponse = {
      dualLanguage: true,
      japanese: this.cleanJapaneseOutput(japaneseText),
      translated: this.cleanLLMOutput(englishText),
      targetLanguage: userLanguage,
    };

    const raw = JSON.stringify(response);
    const wrapped = `<!--DUAL_LANG_START-->${raw}<!--DUAL_LANG_END-->`;

    return { raw, wrapped };
  }

  /**
   * Parse dual-language response from wrapped format
   */
  parseDualLanguageResponse(content: string): DualLanguageResponse | null {
    try {
      // Extract JSON from wrapper
      const match = content.match(/<!--DUAL_LANG_START-->([\s\S]*?)<!--DUAL_LANG_END-->/);
      if (match) {
        return JSON.parse(match[1]);
      }

      // Try direct JSON parse
      if (content.includes('"dualLanguage"')) {
        const jsonMatch = content.match(/\{[\s\S]*"dualLanguage"[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get fallback message
   */
  getFallbackMessage(language: string = 'en'): string {
    return language === 'ja'
      ? '申し訳ありませんが、回答を生成できませんでした。もう一度お試しください。'
      : "I'm sorry, I couldn't generate a response. Please try again.";
  }
}

// Export singleton instance
export const responseFormatter = new ResponseFormatter();
export default ResponseFormatter;
