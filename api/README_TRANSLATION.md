# 翻譯服務配置說明

## 概述

這個翻譯服務提供了日英雙向翻譯功能，支援多種 AI 服務提供商，包括：

- OpenAI GPT API
- Google Translate API  
- Azure Translator
- Mock Service (開發/測試用)

## 快速開始

### 1. 安裝依賴

根據您選擇的 AI 服務提供商，安裝相應的依賴：

```bash
# OpenAI GPT
npm install openai

# Google Translate
npm install @google-cloud/translate

# Azure Translator
npm install @azure/ai-translation-text
```

### 2. 環境配置

在項目根目錄創建 `.env` 文件：

```bash
# AI 翻譯服務配置
AI_TRANSLATION_PROVIDER=mock  # 可選: openai, google, azure, mock

# OpenAI 配置
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo
AI_MAX_TOKENS=1000
AI_TEMPERATURE=0.3

# Google Translate 配置
GOOGLE_TRANSLATE_API_KEY=your_google_translate_api_key_here
GOOGLE_PROJECT_ID=your_project_id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json

# Azure Translator 配置
AZURE_TRANSLATOR_KEY=your_azure_translator_key_here
AZURE_TRANSLATOR_ENDPOINT=https://api.cognitive.microsofttranslator.com

# 服務器配置
PORT=3000
NODE_ENV=development
```

### 3. 啟動服務

```bash
npm run dev
```

## API 端點

### POST /api/translate

翻譯文本的主要端點。

**請求體：**
```json
{
  "sourceText": "こんにちは",
  "sourceLang": "ja",
  "targetLang": "en"
}
```

**響應：**
```json
{
  "success": true,
  "data": {
    "sourceText": "こんにちは",
    "translatedText": "Hello",
    "sourceLang": "ja",
    "targetLang": "en",
    "confidence": 0.95,
    "processingTime": 1200
  },
  "message": "翻訳が完了しました"
}
```

### GET /api/translate/languages

獲取支援的語言列表。

**響應：**
```json
{
  "languages": [
    { "code": "ja", "name": "日本語", "nativeName": "日本語" },
    { "code": "en", "name": "English", "nativeName": "English" }
  ],
  "defaultSource": "ja",
  "defaultTarget": "en"
}
```

### GET /api/translate/history

獲取翻譯歷史（需要用戶認證）。

**查詢參數：**
- `page`: 頁碼 (默認: 1)
- `size`: 每頁大小 (默認: 20)
- `sourceLang`: 源語言過濾
- `targetLang`: 目標語言過濾

### DELETE /api/translate/history

清空翻譯歷史（需要用戶認證）。

## 配置選項

### AI 服務提供商

#### 1. OpenAI GPT

最推薦的選擇，翻譯質量高，支援複雜的語言表達。

```bash
AI_TRANSLATION_PROVIDER=openai
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-3.5-turbo  # 或 gpt-4
AI_MAX_TOKENS=1000
AI_TEMPERATURE=0.3
```

#### 2. Google Translate

穩定可靠，支援大量語言，適合生產環境。

```bash
AI_TRANSLATION_PROVIDER=google
GOOGLE_TRANSLATE_API_KEY=your_api_key
GOOGLE_PROJECT_ID=your_project_id
```

#### 3. Azure Translator

微軟的翻譯服務，與 Azure 生態系統集成良好。

```bash
AI_TRANSLATION_PROVIDER=azure
AZURE_TRANSLATOR_KEY=your_key
AZURE_TRANSLATOR_ENDPOINT=https://api.cognitive.microsofttranslator.com
```

#### 4. Mock Service

開發和測試用，不需要 API 密鑰。

```bash
AI_TRANSLATION_PROVIDER=mock
```

## 自定義配置

### 更新 AI 服務配置

```typescript
import { AITranslationServiceFactory, getAIServiceConfig } from '@/service/aiTranslationService';

// 獲取當前配置
const factory = AITranslationServiceFactory.getInstance();

// 更新配置
factory.updateConfig({
  provider: 'openai',
  apiKey: 'new_api_key',
  model: 'gpt-4'
});

// 創建新的服務實例
const service = factory.createService();
```

### 添加新的 AI 服務提供商

1. 在 `aiTranslationService.ts` 中創建新的服務類
2. 實現 `AITranslationService` 接口
3. 在工廠類中添加新的 case

```typescript
class CustomTranslationService implements AITranslationService {
  public async translate(request: ITranslateRequest): Promise<TranslationResult> {
    // 實現翻譯邏輯
  }
  
  public isAvailable(): boolean {
    // 檢查服務是否可用
  }
}
```

## 錯誤處理

服務包含完整的錯誤處理機制：

- **400**: 請求參數錯誤（文本為空、語言不支持等）
- **401**: 認證失敗
- **429**: 請求過於頻繁
- **500**: 服務器內部錯誤
- **503**: AI 服務不可用

## 性能優化

### 1. 緩存

翻譯結果可以緩存以提高性能：

```typescript
// 在 translateText 函數中添加緩存邏輯
const cacheKey = `${sourceText}_${sourceLang}_${targetLang}`;
const cachedResult = await cache.get(cacheKey);

if (cachedResult) {
  return cachedResult;
}

// 執行翻譯並緩存結果
await cache.set(cacheKey, result, 3600); // 緩存1小時
```

### 2. 批量翻譯

支援批量翻譯以提高效率：

```typescript
// 批量翻譯端點
router.post('/translate/batch', async (ctx, next) => {
  const { texts, sourceLang, targetLang } = ctx.request.body;
  
  const results = await Promise.all(
    texts.map(text => aiService.translate({ text, sourceLang, targetLang }))
  );
  
  ctx.state.formatData = { results };
  await next();
});
```

## 監控和日誌

### 日誌記錄

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'translation.log' })
  ]
});

// 在翻譯函數中記錄日誌
logger.info('Translation request', {
  sourceText: request.sourceText.substring(0, 100),
  sourceLang: request.sourceLang,
  targetLang: request.targetLang,
  userId: ctx.state.user?.userId,
  timestamp: new Date()
});
```

### 性能監控

```typescript
// 記錄翻譯性能指標
const metrics = {
  processingTime: translationResult.processingTime,
  confidence: translationResult.confidence,
  provider: translationResult.provider,
  textLength: sourceText.length,
  timestamp: new Date()
};

// 發送到監控系統
await sendMetrics(metrics);
```

## 測試

### 單元測試

```typescript
import { translateText } from '@/service/translate';

describe('Translation Service', () => {
  it('should translate Japanese to English', async () => {
    const mockCtx = {
      request: {
        body: {
          sourceText: 'こんにちは',
          sourceLang: 'ja',
          targetLang: 'en'
        }
      },
      state: {},
      app: {
        emit: jest.fn()
      }
    };
    
    await translateText(mockCtx, jest.fn());
    
    expect(mockCtx.state.formatData.success).toBe(true);
  });
});
```

### API 測試

```bash
# 測試翻譯 API
curl -X POST http://localhost:3000/api/translate \
  -H "Content-Type: application/json" \
  -d '{
    "sourceText": "こんにちは",
    "sourceLang": "ja",
    "targetLang": "en"
  }'

# 測試語言列表 API
curl http://localhost:3000/api/translate/languages
```

## 部署

### Docker 部署

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### 環境變數檢查

```typescript
// 啟動時檢查必要的環境變數
function validateEnvironment() {
  const requiredVars = ['AI_TRANSLATION_PROVIDER'];
  
  if (process.env.AI_TRANSLATION_PROVIDER === 'openai') {
    requiredVars.push('OPENAI_API_KEY');
  }
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}
```

## 故障排除

### 常見問題

1. **AI 服務不可用**
   - 檢查 API 密鑰是否正確
   - 檢查網絡連接
   - 檢查服務配額是否用完

2. **翻譯質量差**
   - 調整 temperature 參數
   - 使用更高級的模型（如 GPT-4）
   - 優化提示詞

3. **響應時間長**
   - 檢查網絡延遲
   - 考慮使用緩存
   - 優化 AI 服務配置

### 調試模式

```bash
# 啟用調試日誌
DEBUG=translation:* npm run dev

# 查看詳細錯誤信息
NODE_ENV=development npm run dev
```

## 貢獻

歡迎提交 Issue 和 Pull Request 來改進這個翻譯服務！

## 許可證

MIT License

