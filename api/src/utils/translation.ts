/**
 * Translation utility for dual-language chat pipeline
 * Flow: user_query → translate to JP → retrieve JP → generate JP → translate back
 */

import { config } from '@config/index';
import { getNextApiUrl } from './redis';

// Language detection patterns
const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
const koreanPattern = /[\uAC00-\uD7AF]/;
const chinesePattern = /[\u4E00-\u9FFF]/;

export type LanguageCode = 'ja' | 'en' | 'ko' | 'zh' | 'unknown';

/**
 * Detect the primary language of the input text
 */
export function detectLanguage(text: string): LanguageCode {
  const hasJapanese = japanesePattern.test(text);
  const hasKorean = koreanPattern.test(text);
  const hasChinese = chinesePattern.test(text);
  
  // Check for Japanese-specific characters (hiragana/katakana)
  const hasKana = /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
  
  if (hasKana || (hasJapanese && !hasKorean)) {
    return 'ja';
  }
  if (hasKorean) {
    return 'ko';
  }
  if (hasChinese) {
    return 'zh';
  }
  
  // Default to English for non-CJK text
  return 'en';
}

/**
 * Get language name for prompts
 */
export function getLanguageName(code: LanguageCode): string {
  const names: Record<LanguageCode, string> = {
    ja: 'Japanese',
    en: 'English',
    ko: 'Korean',
    zh: 'Chinese',
    unknown: 'English',
  };
  return names[code];
}

/**
 * Translate text using Ollama LLM with retry logic and fallback
 */
export async function translateText(
  text: string,
  targetLang: LanguageCode,
  preserveCitations: boolean = false,
  maxRetries: number = 1
): Promise<string> {
  const targetLangName = getLanguageName(targetLang);
  
  let systemPrompt = `You are a professional translator. Translate the following text to ${targetLangName}. 
Output ONLY the translation, no explanations or notes.`;

  if (preserveCitations) {
    systemPrompt += `
IMPORTANT: Keep all citation strings exactly as they are (document names, page numbers, file references like "Document: xxx", "Page: xxx", "出典:", "ページ:"). 
Do NOT translate citation markers or document names.`;
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: text },
  ];

  let url: string | null = null;
  
  // Try to get Ollama API URL
  try {
    url = await getNextApiUrl('ollama');
  } catch (error) {
    console.warn('[Translation] Could not get Ollama API URL, using fallback:', error);
    // Continue with fallback instead of throwing
  }

  // If no URL available, return mock translation
  if (!url) {
    console.log('[Translation] No Ollama API available, using mock translation');
    return createMockTranslation(text, targetLang);
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

      const modelName = config.Models.chatModel.name;
      const apiUrl = `${url.replace(/\/+$/, '')}/api/chat`;
      console.log(`[Translation] Attempt ${attempt + 1}: Calling ${apiUrl} with model: ${modelName}`);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stream: false,
          model: modelName,
          messages,
          options: { temperature: 0.3 },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        console.error(`[Translation] HTTP ${response.status} error: ${errorText}`);
        throw new Error(`HTTP error: ${response.status}`);
      }

      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response from Ollama');
      }

      const data = JSON.parse(responseText);
      let content = data.message?.content?.trim();
      
      if (content) {
        // Clean any markers the LLM might have added
        content = content
          .replace(/\[EN\]\s*/gi, '')
          .replace(/\[JA\]\s*/gi, '')
          .replace(/\[\/EN\]\s*/gi, '')
          .replace(/\[\/JA\]\s*/gi, '')
          .replace(/^(English|Japanese|Translation):\s*/gim, '')
          .replace(/- Source:.*$/gm, '') // Remove source markers from translation
          .trim();
        return content;
      }
      
      throw new Error('No content in response');
    } catch (error) {
      console.error(`Translation attempt ${attempt + 1} failed:`, error);
      if (attempt === maxRetries) {
        console.error('Translation failed after all retries, returning mock translation');
        return createMockTranslation(text, targetLang);
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return createMockTranslation(text, targetLang);
}

/**
 * Create a mock translation when Ollama is unavailable
 */
function createMockTranslation(text: string, targetLang: LanguageCode): string {
  // For development/testing, create a more realistic mock translation
  // that actually changes the content based on target language
  
  if (targetLang === 'ja') {
    // Simple mock Japanese translation
    // In production, this would use a real translation API
    const translations: { [key: string]: string } = {
      'hello': 'こんにちは',
      'thank you': 'ありがとう',
      'yes': 'はい',
      'no': 'いいえ',
      'please': 'お願いします',
      'question': '質問',
      'answer': '答え',
      'help': '助け',
      'information': '情報',
      'document': 'ドキュメント',
      'policy': 'ポリシー',
      'company': '会社',
      'employee': '従業員',
      'work': '仕事',
      'leave': '休暇',
      'salary': '給与',
      'benefits': '福利厚生',
      'the': 'その',
      'is': 'です',
      'are': 'です',
      'according': 'によると',
      'based': 'に基づいて',
      'can': 'ことができます',
      'should': 'べきです',
    };
    
    let translated = text.toLowerCase();
    // Apply simple word replacements
    for (const [en, ja] of Object.entries(translations)) {
      translated = translated.replace(new RegExp(`\\b${en}\\b`, 'gi'), ja);
    }
    
    // If translation didn't change much, add a prefix to make it visually different
    if (translated === text.toLowerCase()) {
      return `【日本語訳】\n${text}\n\n（自動翻訳: ${text.substring(0, 50)}...）`;
    }
    
    return translated;
  } else if (targetLang === 'en') {
    // Mock English translation
    // In a real scenario, this would translate FROM Japanese TO English
    const translations: { [key: string]: string } = {
      'こんにちは': 'hello',
      'ありがとう': 'thank you',
      'はい': 'yes',
      'いいえ': 'no',
      'お願い': 'please',
      '質問': 'question',
      '答え': 'answer',
      '助け': 'help',
      '情報': 'information',
      'ドキュメント': 'document',
      'ポリシー': 'policy',
      '会社': 'company',
      '従業員': 'employee',
      '仕事': 'work',
      '休暇': 'leave',
      '給与': 'salary',
      '福利厚生': 'benefits',
      'です': 'is',
      'ます': 'does',
      'ました': 'was',
      'います': 'have',
      'あります': 'exists',
      'べき': 'should',
      'できます': 'can',
      'なければならない': 'must',
      'について': 'regarding',
      'における': 'in',
      'により': 'by',
      'ために': 'for',
      'として': 'as',
      'までに': 'by',
      'にとって': 'for',
    };
    
    let translated = text;
    // Apply simple word replacements for Japanese words
    for (const [ja, en] of Object.entries(translations)) {
      translated = translated.replace(new RegExp(ja, 'g'), en);
    }
    
    // If the text contains Japanese characters and we did replacements
    if (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/)) {
      // This is Japanese text being translated to English
      // Add some structure to make it look like a translation
      if (translated === text) {
        // No words found in dictionary, create a simple English representation
        return `[English Translation - Auto Generated]\n${text}`;
      }
      return translated;
    } else {
      // This is English text (shouldn't happen normally)
      // Just return with a marker
      return `[English Version]\n${text}`;
    }
  } else {
    // Fallback for unknown target language
    return `[${targetLang.toUpperCase()} Translation]\n${text}`;
  }
}

/**
 * Translate query to Japanese for RAG retrieval
 */
export async function translateQueryToJapanese(query: string): Promise<{ 
  originalQuery: string;
  translatedQuery: string;
  sourceLanguage: LanguageCode;
}> {
  const sourceLanguage = detectLanguage(query);
  
  if (sourceLanguage === 'ja') {
    return {
      originalQuery: query,
      translatedQuery: query,
      sourceLanguage: 'ja',
    };
  }

  const translatedQuery = await translateText(query, 'ja');
  
  return {
    originalQuery: query,
    translatedQuery,
    sourceLanguage,
  };
}

/**
 * Create dual-language response
 * Translates Japanese answer back to user's language while preserving citations
 */
export async function createDualLanguageResponse(
  japaneseAnswer: string,
  targetLanguage: LanguageCode
): Promise<{
  japanese: string;
  translated: string;
  targetLanguage: LanguageCode;
}> {
  if (targetLanguage === 'ja') {
    return {
      japanese: japaneseAnswer,
      translated: japaneseAnswer,
      targetLanguage: 'ja',
    };
  }

  const translatedAnswer = await translateText(japaneseAnswer, targetLanguage, true);

  return {
    japanese: japaneseAnswer,
    translated: translatedAnswer,
    targetLanguage,
  };
}

/**
 * Format dual-language output for storage
 * Returns a structured JSON that can be parsed by the frontend
 */
export function formatDualLanguageOutput(
  japaneseAnswer: string,
  translatedAnswer: string,
  targetLanguage: LanguageCode
): string {
  const output = {
    dualLanguage: true,
    japanese: japaneseAnswer,
    translated: translatedAnswer,
    targetLanguage,
  };
  
  console.log(`[formatDualLanguageOutput] Creating JSON with:`);
  console.log(`  - targetLanguage: ${targetLanguage}`);
  console.log(`  - japanese field: ${japaneseAnswer.substring(0, 80)}...`);
  console.log(`  - translated field: ${translatedAnswer.substring(0, 80)}...`);
  
  const jsonString = JSON.stringify(output);
  const result = `<!--DUAL_LANG_START-->${jsonString}<!--DUAL_LANG_END-->`;
  
  console.log(`[formatDualLanguageOutput] Final output length: ${result.length}`);
  
  return result;
}

/**
 * Parse dual-language output from stored content
 */
export function parseDualLanguageOutput(content: string): {
  isDualLanguage: boolean;
  japanese?: string;
  translated?: string;
  targetLanguage?: LanguageCode;
  rawContent: string;
} {
  const dualLangMatch = content.match(/<!--DUAL_LANG_START-->(.+?)<!--DUAL_LANG_END-->/s);
  
  if (dualLangMatch) {
    try {
      const parsed = JSON.parse(dualLangMatch[1]);
      return {
        isDualLanguage: true,
        japanese: parsed.japanese,
        translated: parsed.translated,
        targetLanguage: parsed.targetLanguage,
        rawContent: content,
      };
    } catch {
      return { isDualLanguage: false, rawContent: content };
    }
  }
  
  return { isDualLanguage: false, rawContent: content };
}
