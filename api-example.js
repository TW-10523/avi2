// 後端 API 路由示例 (Node.js + Express)
// 這個文件展示如何創建後端翻譯 API

const express = require('express');
const router = express.Router();

// 假設您已經有 AI 翻譯服務的配置
const { translateWithAI } = require('../services/aiService');
const { validateTranslationRequest } = require('../middleware/validation');
const { rateLimit } = require('../middleware/rateLimit');

/**
 * POST /api/translate
 * 日英雙向翻譯 API
 */
router.post('/translate', 
  rateLimit, // 速率限制中間件
  validateTranslationRequest, // 請求驗證中間件
  async (req, res) => {
    try {
      const { sourceText, sourceLang, targetLang } = req.body;
      
      // 驗證語言代碼
      if (!['ja', 'en'].includes(sourceLang) || !['ja', 'en'].includes(targetLang)) {
        return res.status(400).json({
          success: false,
          message: '不支援的語言代碼，僅支援日文(ja)和英文(en)'
        });
      }
      
      // 驗證文本長度
      if (!sourceText || sourceText.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: '翻譯文本不能為空'
        });
      }
      
      if (sourceText.length > 2000) {
        return res.status(400).json({
          success: false,
          message: '翻譯文本長度不能超過2000字符'
        });
      }
      
      // 調用 AI 翻譯服務
      const translationResult = await translateWithAI({
        text: sourceText.trim(),
        sourceLanguage: sourceLang,
        targetLanguage: targetLang
      });
      
      // 記錄翻譯歷史（可選）
      await saveTranslationHistory({
        sourceText: sourceText.trim(),
        translatedText: translationResult.translatedText,
        sourceLang,
        targetLang,
        userId: req.user?.id, // 如果用戶已登入
        timestamp: new Date()
      });
      
      // 返回翻譯結果
      res.json({
        success: true,
        data: {
          sourceText: sourceText.trim(),
          translatedText: translationResult.translatedText,
          sourceLang,
          targetLang,
          confidence: translationResult.confidence || 0.95,
          processingTime: translationResult.processingTime || 0
        },
        message: '翻譯成功'
      });
      
    } catch (error) {
      console.error('翻譯 API 錯誤:', error);
      
      // 根據錯誤類型返回適當的錯誤信息
      if (error.name === 'AI Service Error') {
        res.status(503).json({
          success: false,
          message: 'AI 翻譯服務暫時不可用，請稍後再試',
          error: error.message
        });
      } else if (error.name === 'Rate Limit Error') {
        res.status(429).json({
          success: false,
          message: '請求過於頻繁，請稍後再試',
          retryAfter: error.retryAfter
        });
      } else {
        res.status(500).json({
          success: false,
          message: '翻譯服務內部錯誤，請稍後再試',
          error: process.env.NODE_ENV === 'development' ? error.message : 'Internal Server Error'
        });
      }
    }
  }
);

/**
 * GET /api/translate/languages
 * 獲取支援的語言列表
 */
router.get('/languages', (req, res) => {
  res.json({
    success: true,
    data: {
      languages: [
        { code: 'ja', name: '日本語', nativeName: '日本語' },
        { code: 'en', name: 'English', nativeName: 'English' }
      ],
      defaultSource: 'ja',
      defaultTarget: 'en'
    }
  });
});

/**
 * GET /api/translate/history
 * 獲取翻譯歷史（需要用戶認證）
 */
router.get('/history', 
  authenticateUser, // 用戶認證中間件
  async (req, res) => {
    try {
      const { page = 1, size = 20 } = req.query;
      const userId = req.user.id;
      
      const history = await getTranslationHistory(userId, {
        page: parseInt(page),
        size: parseInt(size)
      });
      
      res.json({
        success: true,
        data: history,
        pagination: {
          page: parseInt(page),
          size: parseInt(size),
          total: history.total
        }
      });
      
    } catch (error) {
      console.error('獲取翻譯歷史錯誤:', error);
      res.status(500).json({
        success: false,
        message: '獲取翻譯歷史失敗'
      });
    }
  }
);

module.exports = router;

// AI 翻譯服務示例
async function translateWithAI({ text, sourceLanguage, targetLanguage }) {
  try {
    // 這裡調用您的 AI 翻譯服務
    // 例如：OpenAI API、Google Translate API、或其他 AI 服務
    
    // 示例：使用 OpenAI GPT 進行翻譯
    const prompt = `請將以下${sourceLanguage === 'ja' ? '日文' : '英文'}文本翻譯成${targetLanguage === 'ja' ? '日文' : '英文'}：
    
原文：${text}

請只返回翻譯結果，不要添加任何解釋或額外文字。`;
    
    // 調用 OpenAI API（需要配置 API Key）
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "你是一個專業的日英雙向翻譯專家。請準確翻譯用戶提供的文本。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    });
    
    const translatedText = response.choices[0].message.content.trim();
    
    return {
      translatedText,
      confidence: 0.95,
      processingTime: Date.now() - startTime
    };
    
  } catch (error) {
    throw new Error(`AI 翻譯服務錯誤: ${error.message}`);
  }
}

// 保存翻譯歷史
async function saveTranslationHistory(historyData) {
  try {
    // 這裡保存到數據庫
    // 例如：MongoDB、PostgreSQL 等
    const history = new TranslationHistory(historyData);
    await history.save();
  } catch (error) {
    console.error('保存翻譯歷史失敗:', error);
    // 不拋出錯誤，因為這不影響翻譯功能
  }
}

// 獲取翻譯歷史
async function getTranslationHistory(userId, options) {
  try {
    const { page, size } = options;
    const skip = (page - 1) * size;
    
    const history = await TranslationHistory.find({ userId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(size);
    
    const total = await TranslationHistory.countDocuments({ userId });
    
    return {
      items: history,
      total,
      hasMore: skip + size < total
    };
    
  } catch (error) {
    throw new Error(`獲取翻譯歷史失敗: ${error.message}`);
  }
}

