/**
 * Query Classification Service
 * Classifies user queries as "company" or "general"
 * Detects language (English or Japanese)
 * Returns classification result with language info
 * 
 * Logic Flow:
 * 1. Detect user query language (English/Japanese)
 * 2. Classify query as company-related or general
 * 3. If company query + English: translate to Japanese for RAG
 * 4. If company query + Japanese: proceed to RAG directly
 * 5. If general query: answer with LLM directly (dual output)
 */

export interface ClassificationResult {
  isCompanyQuery: boolean;
  language: 'en' | 'ja';
  confidence: number;
  detectedKeywords: string[];
  reason: string;
  queryType: 'company' | 'general';
}

// Company-related keywords in English (expanded)
const COMPANY_KEYWORDS_EN = [
  // HR Related
  'leave', 'vacation', 'holiday', 'absence', 'absent', 'off day', 'pto', 'time off',
  'salary', 'wage', 'payment', 'bonus', 'allowance', 'compensation', 'pay', 'income',
  'benefits', 'insurance', 'health', 'medical', 'dental', 'eye care', 'vision',
  'training', 'development', 'course', 'certification', 'education', 'learning',
  'promotion', 'raise', 'increment', 'appraisal', 'evaluation', 'performance review',
  'employee', 'staff', 'team', 'department', 'division', 'company', 'colleague',
  
  // Work-related (expanded for general work questions)
  'work', 'job', 'task', 'project', 'deadline', 'meeting', 'conference', 'call',
  'office', 'remote', 'work from home', 'wfh', 'commute', 'working hours', 'hybrid',
  'shift', 'overtime', 'night shift', 'schedule', 'attendance', 'clock in', 'clock out',
  'workplace', 'workspace', 'desk', 'equipment', 'laptop', 'computer', 'access',
  
  // Policy & Rules
  'policy', 'regulation', 'rule', 'procedure', 'guideline', 'requirement', 'process',
  'standard', 'code of conduct', 'ethics', 'compliance', 'internal', 'handbook',
  'company', 'organization', 'corporate', 'business', 'firm', 'enterprise',
  
  // General workplace
  'hr', 'human resources', 'payroll', 'finance', 'accounting', 'admin', 'it',
  'manager', 'supervisor', 'director', 'executive', 'ceo', 'boss', 'lead', 'head',
  'contract', 'agreement', 'employment', 'resignation', 'retirement', 'termination',
  'sick leave', 'maternity', 'paternity', 'bereavement', 'personal day',
  'expense', 'reimbursement', 'travel', 'business trip', 'per diem',
  'onboarding', 'offboarding', 'orientation', 'probation', 'tenure',
  
  // Questions about how to do work tasks
  'how to', 'how do i', 'where can i', 'what is the', 'can i', 'am i allowed',
  'submit', 'request', 'apply', 'approve', 'file', 'report', 'claim',
  
  // Personal info (from uploaded documents)
  'my name', 'my age', 'my address', 'my phone', 'my email', 'my id',
  'my birthday', 'my birth', 'my date of birth', 'my dob',
  'my account', 'my card', 'my balance', 'my credit', 'my statement',
  'my payment', 'my due', 'my limit', 'card holder', 'holder name',
  'total credit', 'credit limit', 'payment due', 'due date',
  'document', 'pdf', 'uploaded', 'file',
];

// Company-related keywords in Japanese (expanded)
const COMPANY_KEYWORDS_JA = [
  // HR Related
  '休暇', '有給', '休日', '休み', '欠席', '年休', '特別休暇',
  '給与', '給料', '賃金', 'ボーナス', '手当', '報酬', '月給', '年収',
  '福利', '厚生', '保険', '健康', '医療', '歯科', '眼科', '健康診断',
  '研修', '訓練', '開発', 'コース', '認定', '教育', '学習', 'スキルアップ',
  '昇進', '昇格', '昇給', '評価', '査定', '人事評価', '業績評価',
  '従業員', 'スタッフ', 'チーム', '部門', '部署', '会社', '同僚', '社員',
  
  // Work-related (expanded)
  '仕事', '業務', 'タスク', 'プロジェクト', '納期', '締切', '期限',
  '会議', '打ち合わせ', '会社', 'オフィス', 'リモート', 'テレワーク',
  '在宅勤務', '通勤', '勤務', 'シフト', '残業', '夜勤', '時短',
  'スケジュール', '出勤', '勤務時間', '就業', '労働', '作業',
  '職場', 'デスク', '設備', 'パソコン', 'PC', 'アクセス',
  
  // Policy & Rules
  'ポリシー', '規程', '規則', '手続き', 'ガイドライン', '要件', 'プロセス',
  '基準', '行動規範', '倫理', 'コンプライアンス', '内部', 'マニュアル',
  '組織', '法人', 'ビジネス', '会社', '企業', '本社', '支社',
  
  // General workplace
  '人事', '給与計算', '財務', '会計', '経理', '総務', 'IT',
  'マネージャー', '上司', '監督', 'ディレクター', '役員', '社長', '部長', '課長',
  '契約', '協定', '雇用', '退職', '定年', '退職金', '解雇',
  '病気休暇', '産休', '育休', 'パパ休暇', '忌引', '介護休暇',
  '経費', '精算', '出張', '日当', '交通費',
  '入社', '退社', 'オリエンテーション', '試用期間', '正社員',
  
  // Question patterns
  '方法', 'やり方', 'どうすれば', 'どこで', '何が', 'できますか', '許可',
  '申請', 'リクエスト', '承認', '提出', '報告', '請求',
  
  // Personal info (from uploaded documents)
  '私の名前', '私の年齢', '私の住所', '私の電話', '私のメール', '私のID',
  '私の誕生日', '私の生年月日', 'カード', '口座', '残高', 'クレジット',
  '支払期限', '支払日', '期日', '限度額', 'カード名義', '名義人',
  'ドキュメント', 'PDF', 'アップロード', 'ファイル',
];

/**
 * Detect language of the query
 * Returns 'en' for English, 'ja' for Japanese
 */
export function detectLanguage(query: string): 'en' | 'ja' {
  // Japanese character ranges
  const hiraganaRegex = /[\u3040-\u309F]/g;
  const katakanaRegex = /[\u30A0-\u30FF]/g;
  const kanjiRegex = /[\u4E00-\u9FFF]/g;
  
  const japaneseChars = (query.match(hiraganaRegex) || []).length +
                        (query.match(katakanaRegex) || []).length +
                        (query.match(kanjiRegex) || []).length;
  
  // If more than 20% of characters are Japanese, classify as Japanese
  const japanesePercentage = japaneseChars / query.length;
  
  console.log('🔤 [Language Detection]', {
    query: query.substring(0, 50),
    japaneseChars,
    totalChars: query.length,
    percentage: (japanesePercentage * 100).toFixed(1) + '%',
  });
  
  return japanesePercentage > 0.2 ? 'ja' : 'en';
}

/**
 * Classify query as company-related or general
 */
export function classifyQuery(query: string): ClassificationResult {
  const language = detectLanguage(query);
  const lowerQuery = query.toLowerCase();
  
  // Select appropriate keyword list based on language
  const keywords = language === 'ja' ? COMPANY_KEYWORDS_JA : COMPANY_KEYWORDS_EN;
  
  // Find matching keywords
  const detectedKeywords = keywords.filter(kw => {
    if (language === 'ja') {
      // For Japanese, do direct substring matching
      return lowerQuery.includes(kw.toLowerCase());
    } else {
      // For English, check word boundaries
      const wordRegex = new RegExp(`\\b${kw}\\b`, 'i');
      return wordRegex.test(query);
    }
  });
  
  // Calculate confidence: number of matched keywords / total keywords
  const confidence = detectedKeywords.length / keywords.length;
  
  // Company query if:
  // 1. At least 1 keyword detected, OR
  // 2. Query contains work-related common terms
  const workTerms = language === 'ja' 
    ? ['仕事', '会社', '業務', '勤務', 'オフィス']
    : ['work', 'office', 'job', 'task', 'project', 'team', 'company'];
  
  const hasWorkTerms = workTerms.some(term => 
    language === 'ja' 
      ? lowerQuery.includes(term.toLowerCase())
      : new RegExp(`\\b${term}\\b`, 'i').test(query)
  );
  
  const isCompanyQuery = detectedKeywords.length > 0 || hasWorkTerms;
  
  const queryType = isCompanyQuery ? 'company' : 'general';
  const reason = isCompanyQuery
    ? `Company query detected (keywords: ${detectedKeywords.slice(0, 3).join(', ')})`
    : 'General query - no company-related keywords detected';
  
  console.log('📊 [Query Classification]', {
    isCompanyQuery,
    queryType,
    language,
    detectedKeywords: detectedKeywords.slice(0, 5),
    confidence: (confidence * 100).toFixed(1) + '%',
    reason,
  });
  
  return {
    isCompanyQuery,
    language,
    confidence,
    detectedKeywords,
    reason,
    queryType,
  };
}

/**
 * Get all company keywords in a specific language
 */
export function getCompanyKeywords(language: 'en' | 'ja'): string[] {
  return language === 'ja' ? COMPANY_KEYWORDS_JA : COMPANY_KEYWORDS_EN;
}
