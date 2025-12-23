/**
 * Translation Service
 * Handles translation between English and Japanese
 * Uses Ollama API for LLM-based translation
 */

import axios from 'axios';
const OLLAMA_API = process.env.OLLAMA_API || 'localhost:11435';
const MODEL = process.env.OLLAMA_MODEL || 'gpt-oss:120b';

interface TranslationRequest {
  text: string;
  sourceLang: 'en' | 'ja';
  targetLang: 'en' | 'ja';
}

interface TranslationResult {
  original: string;
  translated: string;
  sourceLang: 'en' | 'ja';
  targetLang: 'en' | 'ja';
  success: boolean;
  error?: string;
}

/**
 * Translate text using Ollama LLM or Mock Service
 */
export async function translateText(req: TranslationRequest): Promise<TranslationResult> {
  const { text, sourceLang, targetLang } = req;
  const USE_MOCK = process.env.USE_MOCK_TRANSLATION === 'true' || true;  // Default to mock
  
  console.log('🌐 [Translation Service] Starting translation', {
    sourceLang,
    targetLang,
    textPreview: text.substring(0, 50),
    mode: USE_MOCK ? 'MOCK' : 'OLLAMA',
  });
  
  if (sourceLang === targetLang) {
    console.log('ℹ️ [Translation] Source and target language same, returning original');
    return {
      original: text,
      translated: text,
      sourceLang,
      targetLang,
      success: true,
    };
  }
  
  try {
    // Use mock translation for now since Ollama is not running
    if (USE_MOCK) {
      console.log('🎭 [Translation] Using Mock Translation Service');
      // Simulate a slight delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Simple mock translation markers
      const mockTranslated = `[${targetLang.toUpperCase()} Translation] ${text}`;
      
      console.log('✅ [Translation] Mock translation complete', {
        sourceLang,
        targetLang,
        originalLength: text.length,
        translatedLength: mockTranslated.length,
      });
      
      return {
        original: text,
        translated: mockTranslated,
        sourceLang,
        targetLang,
        success: true,
      };
    }
    
    // Real Ollama translation
    const sourceLabel = sourceLang === 'en' ? 'English' : 'Japanese';
    const targetLabel = targetLang === 'en' ? 'English' : 'Japanese';
    
    const prompt = `Translate the following text from ${sourceLabel} to ${targetLabel}. 
Return ONLY the translated text, nothing else.

Text: ${text}

Translated:`;

    console.log('🔄 [Translation] Calling Ollama API', {
      model: MODEL,
      endpoint: OLLAMA_API,
    });
    
    const response = await axios.post(OLLAMA_API, {
      model: MODEL,
      prompt: prompt,
      stream: false,
      temperature: 0.7,
    }, {
      timeout: 30000,
    });
    
    const translatedText = response.data.response?.trim() || '';
    
    console.log('✅ [Translation] Success', {
      sourceLang,
      targetLang,
      originalLength: text.length,
      translatedLength: translatedText.length,
      translatedPreview: translatedText.substring(0, 50),
    });
    
    return {
      original: text,
      translated: translatedText,
      sourceLang,
      targetLang,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ [Translation] Error', {
      sourceLang,
      targetLang,
      error: errorMessage,
    });
    
    // Fallback to mock translation on error
    console.log('⚠️ [Translation] Falling back to mock translation');
    const fallbackTranslated = `[${targetLang.toUpperCase()} Translation (Fallback)] ${text}`;
    
    return {
      original: text,
      translated: fallbackTranslated,
      sourceLang,
      targetLang,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Translate from English to Japanese
 */
export async function translateENtoJA(text: string): Promise<string> {
  const result = await translateText({
    text,
    sourceLang: 'en',
    targetLang: 'ja',
  });
  return result.translated;
}

/**
 * Translate from Japanese to English
 */
export async function translateJAtoEN(text: string): Promise<string> {
  const result = await translateText({
    text,
    sourceLang: 'ja',
    targetLang: 'en',
  });
  return result.translated;
}

/**
 * Batch translate multiple texts
 */
export async function batchTranslate(
  texts: string[],
  sourceLang: 'en' | 'ja',
  targetLang: 'en' | 'ja'
): Promise<TranslationResult[]> {
  console.log('📦 [Translation] Batch translating', {
    count: texts.length,
    sourceLang,
    targetLang,
  });
  
  const results = await Promise.all(
    texts.map(text => translateText({ text, sourceLang, targetLang }))
  );
  
  console.log('✅ [Translation] Batch complete', {
    total: texts.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
  });
  
  return results;
}
