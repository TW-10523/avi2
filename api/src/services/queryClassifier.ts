/**
 * Query Classifier - Detect language and classify query type
 */

export type QueryLanguage = 'en' | 'ja' | 'unknown';
export type QueryType = 'document' | 'general';

export interface ClassificationResult {
  language: QueryLanguage;
  type: QueryType;
  confidence: number;
}

// Keywords that indicate document/company-related queries
const DOCUMENT_KEYWORDS_EN = [
  // Document references
  'document', 'file', 'pdf', 'uploaded', 'attachment',
  // Personal info
  'my name', 'my age', 'my address', 'my phone', 'my email',
  'my birthday', 'date of birth', 'my account', 'my balance',
  // Financial
  'payment', 'due date', 'credit', 'limit', 'statement', 'balance',
  'invoice', 'receipt', 'transaction', 'amount',
  // Work related
  'policy', 'procedure', 'guideline', 'rule', 'regulation',
  'employee', 'salary', 'payslip', 'leave', 'vacation',
  // Questions about content
  'what is in', 'what does', 'find in', 'show me', 'tell me about',
  'according to', 'mentioned in', 'says about',
];

const DOCUMENT_KEYWORDS_JA = [
  // Document references
  'ドキュメント', 'ファイル', 'PDF', 'アップロード', '添付',
  // Personal info
  '私の名前', '私の年齢', '私の住所', '私の電話', '私のメール',
  '誕生日', '生年月日', '口座', '残高',
  // Financial
  '支払', '期日', 'クレジット', '限度', '明細', '残高',
  '請求書', '領収書', '取引', '金額',
  // Work related
  'ポリシー', '手続き', 'ガイドライン', '規則', '規定',
  '従業員', '給与', '給料明細', '休暇',
];

class QueryClassifier {
  /**
   * Detect the language of a query
   */
  detectLanguage(text: string): QueryLanguage {
    const japaneseChars = text.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g);
    const japaneseRatio = japaneseChars ? japaneseChars.length / text.length : 0;

    if (japaneseRatio > 0.3) return 'ja';
    if (japaneseRatio < 0.1) return 'en';
    return 'unknown';
  }

  /**
   * Classify if query needs document search (RAG)
   */
  classifyQueryType(text: string): QueryType {
    const lowerText = text.toLowerCase();

    // Check English keywords
    for (const keyword of DOCUMENT_KEYWORDS_EN) {
      if (lowerText.includes(keyword)) {
        return 'document';
      }
    }

    // Check Japanese keywords
    for (const keyword of DOCUMENT_KEYWORDS_JA) {
      if (text.includes(keyword)) {
        return 'document';
      }
    }

    // Question patterns that likely need documents
    if (/^(what|where|when|how much|who|which)\s+(is|are|was|were)\s+(my|the|our)/i.test(text)) {
      return 'document';
    }

    return 'general';
  }

  /**
   * Full classification
   */
  classify(text: string): ClassificationResult {
    const language = this.detectLanguage(text);
    const type = this.classifyQueryType(text);
    
    // Confidence based on keyword matches
    const lowerText = text.toLowerCase();
    let matches = 0;
    
    for (const keyword of [...DOCUMENT_KEYWORDS_EN, ...DOCUMENT_KEYWORDS_JA]) {
      if (lowerText.includes(keyword.toLowerCase()) || text.includes(keyword)) {
        matches++;
      }
    }

    const confidence = type === 'document' 
      ? Math.min(0.5 + matches * 0.1, 1.0)
      : 0.7;

    return { language, type, confidence };
  }

  /**
   * Check if query should use RAG
   */
  shouldUseRAG(text: string, hasDocuments: boolean): boolean {
    if (!hasDocuments) return false;
    
    const { type } = this.classify(text);
    return type === 'document';
  }
}

// Export singleton instance
export const queryClassifier = new QueryClassifier();
export default QueryClassifier;
