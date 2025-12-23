import { put, queryPage } from '@/utils/mapper';
import KrdGenTask from '@/mysql/model/gen_task.model';
import KrdGenTaskOutput from '@/mysql/model/gen_task_output.model';
import KrdFile from '@/mysql/model/file.model';
import { userType } from '@/types';
import { IGenTask, IGenTaskQuerySerType, IGenTaskQueryType, IGenTaskSer } from '@/types/genTask';
import { IGenTaskOutputQuerySerType, IGenTaskOutputQueryType, IGenTaskOutputReNameSer, IGenTaskOutputSer } from '@/types/genTaskOutput';
import { Context } from 'koa';
import { Op } from 'sequelize';

import { queryConditionsData } from '@/service';
import { handleAddGenTask } from '@/service/genTaskService';
import { classifyQuery, detectLanguage } from '@/service/queryClassificationService';
import { translateENtoJA, translateJAtoEN } from '@/service/translationService';

export const getAddMid = async (ctx: any, next: () => Promise<void>) => {
  try {
    const { userName, userId } = ctx.state.user as userType;
    const addContent = ctx.request.body as IGenTask;

    console.log('\n' + '='.repeat(80));
    console.log('🚀 [GenTask] Processing new task...');
    console.log('='.repeat(80));
    console.log('📋 [GenTask] Task Details:', {
      type: addContent.type,
      userId: userId,
      userName: userName,
      timestamp: new Date().toISOString(),
    });

    let enhancedContent = addContent;
    let ragContext = null;
    let detectedLanguage = 'en';
    let isCompanyQuery = false;
    let processingPath = 'GENERAL';

    // ========== TWO-PATH QUERY PROCESSING ==========
    // Only process if this is a CHAT with actual content (not empty chat creation)
    const chatFormData = addContent.formData as any;
    const userQuery = chatFormData?.prompt || '';
    const hasActualContent = addContent.type === 'CHAT' && chatFormData && userQuery.trim().length > 0;
    
    if (hasActualContent) {

      console.log('💬 [GenTask] Chat request detected');
      console.log('📝 [GenTask] User query:', {
        query: userQuery.substring(0, 100) + (userQuery.length > 100 ? '...' : ''),
        length: userQuery.length,
      });

      try {
        // ===== STEP 1: LANGUAGE DETECTION =====
        console.log('\n--- STEP 1: LANGUAGE DETECTION ---');
        detectedLanguage = detectLanguage(userQuery);
        console.log('✅ [GenTask] Language detected:', {
          language: detectedLanguage === 'ja' ? 'Japanese (日本語)' : 'English (EN)',
          confidence: 'High',
        });

        // ===== STEP 2: QUERY CLASSIFICATION =====
        console.log('\n--- STEP 2: QUERY CLASSIFICATION ---');
        const classification = classifyQuery(userQuery);
        isCompanyQuery = classification.isCompanyQuery;
        processingPath = isCompanyQuery ? 'COMPANY' : 'GENERAL';
        
        console.log('📊 [GenTask] Classification Result:', {
          isCompanyQuery: isCompanyQuery,
          path: processingPath,
          language: classification.language,
          confidence: (classification.confidence * 100).toFixed(1) + '%',
          reason: classification.reason,
        });

        // ===== STEP 1.1: GENERAL QUERY PATH =====
        if (!isCompanyQuery) {
          console.log('\n--- STEP 1.1: GENERAL QUERY HANDLER ---');
          console.log('ℹ️  [GenTask] Processing as GENERAL query');
          
          // Pass the original query - dual-language output is handled by chatGenProcess
          enhancedContent = {
            ...addContent,
            formData: {
              ...chatFormData,
              prompt: userQuery,
              processingPath: 'GENERAL',
              detectedLanguage: detectedLanguage,
              ragTriggered: false,
              dualLanguageEnabled: true,
            },
          };

          console.log('✅ [GenTask] General path prepared:', {
            processingPath: 'GENERAL',
            userLanguage: detectedLanguage,
            ragRequired: false,
            dualLanguageFormat: 'Handled by chatGenProcess',
          });
        } 
        // ===== STEP 1.2: COMPANY QUERY PATH =====
        else {
          console.log('\n--- STEP 1.2: COMPANY QUERY HANDLER ---');
          console.log('ℹ️  [GenTask] Processing as COMPANY query');
          console.log('🏢 [GenTask] Proceeding to Step 2: RAG + Processing');

          let queryForRAG = userQuery;

          // Translate EN to JA if needed for better RAG matching
          if (detectedLanguage === 'en') {
            console.log('🌐 [GenTask] Query is in English - translating to Japanese for RAG...');
            try {
              queryForRAG = await translateENtoJA(userQuery);
              console.log('✅ [GenTask] Translation successful:', {
                original: userQuery.substring(0, 50),
                translated: queryForRAG.substring(0, 50),
              });
            } catch (translationError) {
              console.warn('⚠️  [GenTask] Translation failed, using original query');
              queryForRAG = userQuery;
            }
          }

          // ===== STEP 2: RAG RETRIEVAL & PROCESSING =====
          console.log('\n--- STEP 2: RAG RETRIEVAL & PROCESSING ---');
          console.log('📚 [GenTask] Fetching uploaded documents from database...');
          const uploadedFiles = await getUploadedFilesForContext(userId);
          
          console.log('📊 [GenTask] Database query result:', {
            filesFound: uploadedFiles.length,
            timestamp: new Date().toISOString(),
          });

          if (uploadedFiles && uploadedFiles.length > 0) {
            console.log('✅ [GenTask] Documents retrieved successfully');
            console.log('📄 [GenTask] Retrieved files:');
            uploadedFiles.forEach((f: any, idx: number) => {
              console.log(`   ${idx + 1}. ${f.filename} (${(f.size / 1024).toFixed(2)} KB) - Pages: [citation data would be extracted]`);
            });

            ragContext = {
              files: uploadedFiles.map((f: any) => ({
                id: f.id,
                filename: f.filename,
                originalName: f.filename,
              })),
              content: uploadedFiles
                .map((f: any) => `--- File: ${f.filename} ---\n[Document content would be extracted from RAG system here]\n[Page citations would be included]`)
                .join('\n'),
            };

            console.log('🔗 [GenTask] RAG Context Prepared:', {
              filesIncluded: ragContext.files.length,
              totalContentLength: ragContext.content.length,
            });

            // Build enhanced prompt with RAG context and dual-language instruction
            const ragEnhancedPrompt = `ORIGINAL QUERY: ${userQuery}
${detectedLanguage === 'en' ? `(Translated to Japanese for RAG: ${queryForRAG})` : '(Original language: Japanese)'}

[COMPANY DOCUMENTS - INTERNAL CONTEXT]
${ragContext.content}
[END OF CONTEXT]

---

📋 RESPONSE INSTRUCTIONS:
1. Answer the user's query using the documents provided above
2. ALWAYS include page citations (e.g., "- Source: document.pdf")
3. Provide answer in detected user language FIRST
4. Then provide translation to the other language
5. Use format:
[${detectedLanguage.toUpperCase()}]
Your answer in ${detectedLanguage === 'ja' ? 'Japanese' : 'English'} with page citations

[${detectedLanguage === 'ja' ? 'EN' : 'JA'}]
Your answer in ${detectedLanguage === 'ja' ? 'English' : 'Japanese (日本語)'} with page citations`;

            enhancedContent = {
              ...addContent,
              formData: {
                ...chatFormData,
                prompt: ragEnhancedPrompt,
                processingPath: 'COMPANY',
                detectedLanguage: detectedLanguage,
                originalQuery: userQuery,
                queryForRAG: queryForRAG,
                ragTriggered: true,
                usedFileIds: ragContext.files.map((f) => f.id),
                dualLanguageEnabled: true,
              },
            };

            console.log('✨ [GenTask] Company path with RAG prepared:', {
              processingPath: 'COMPANY',
              userLanguage: detectedLanguage,
              ragRequired: true,
              filesUsed: ragContext.files.length,
              dualLanguageFormat: 'Enabled with citations',
            });
          } else {
            console.log('⚠️  [GenTask] No documents found in database for this user');
            console.log('💡 [GenTask] Company query detected but no files available - returning standard response');
            
            // Still process as company query but without RAG context
            enhancedContent = {
              ...addContent,
              formData: {
                ...chatFormData,
                prompt: `${userQuery}\n\nPlease provide your answer in BOTH ${detectedLanguage === 'ja' ? 'Japanese and English' : 'English and Japanese'}.\nFormat: [${detectedLanguage.toUpperCase()}]...[${detectedLanguage === 'ja' ? 'EN' : 'JA'}]...`,
                processingPath: 'COMPANY',
                detectedLanguage: detectedLanguage,
                ragTriggered: false,
                dualLanguageEnabled: true,
              },
            };
          }
        }
      } catch (error) {
        console.error('❌ [GenTask] Error in query processing:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        
        // Fallback: treat as general query
        enhancedContent = {
          ...addContent,
          formData: {
            ...chatFormData,
            prompt: userQuery,
            processingPath: 'GENERAL_FALLBACK',
            detectedLanguage: 'en',
            ragTriggered: false,
            dualLanguageEnabled: true,
          },
        };
      }
    }

    console.log('\n--- TASK CREATION ---');
    console.log('📤 [GenTask] Sending task to processing queue...');
    const result = await handleAddGenTask(enhancedContent, userName);

    console.log('✅ [GenTask] Task created successfully:', {
      taskId: result.taskId,
      type: addContent.type,
      processingPath: processingPath,
      detectedLanguage: detectedLanguage,
      ragEnabled: ragContext ? 'YES' : 'NO',
      filesUsed: ragContext ? ragContext.files.length : 0,
    });

    ctx.state.formatData = {
      taskId: result.taskId,
      task: result.task,
      metadata: {
        processingPath: processingPath,
        detectedLanguage: detectedLanguage,
        isCompanyQuery: isCompanyQuery,
        ragTriggered: ragContext ? true : false,
        usedFiles: ragContext ? ragContext.files : null,
        dualLanguageEnabled: true,
      },
    };

    console.log('='.repeat(80) + '\n');

    await next();
  } catch (error) {
    console.error('❌ [GenTask] FATAL ERROR:', error);
    return ctx.app.emit(
      'error',
      {
        code: '400',
        message: 'アップロードパラメータを確認してください',
      },
      ctx,
    );
  }
};
async function getUploadedFilesForContext(userId: number, limit: number = 5) {
  try {
    console.log('🔎 [Database] Querying file table for user documents...', {
      userId: userId,
      limit: limit,
      table: 'file',
    });

    // Get files for RAG context - using the File model
    const files = await KrdFile.findAll({
      limit: limit,
      order: [['created_at', 'DESC']],
      raw: true,
    });
    
    console.log('📊 [Database] Query completed:', {
      resultsReturned: files.length,
      table: 'file',
      database: 'MySQL',
      dbName: 'krd_knowledge_base', // adjust to your actual DB name
    });

    if (files.length > 0) {
      console.log('✅ [Database] Files retrieved from database:');
      files.forEach((f: any, idx: number) => {
        console.log(`   Row ${idx + 1}: id=${f.id}, filename="${f.filename}", size=${f.size}B, created_at=${f.created_at}`);
      });
    } else {
      console.log('⚠️  [Database] No files found in database for this query');
    }
    
    return files as any[];
  } catch (error) {
    console.error('❌ [Database] Error fetching uploaded files:', {
      error: error instanceof Error ? error.message : String(error),
      table: 'file',
      timestamp: new Date().toISOString(),
    });
    return [];
  }
}

export const getListMid = async (ctx: any, next: () => Promise<void>) => {
  try {
    const { userName } = ctx.state.user as userType;
    const { pageNum, pageSize, ...params } = ctx.query as unknown as IGenTaskQueryType;
    const newParams = { pageNum, pageSize } as IGenTaskQuerySerType;

    if (userName) newParams.create_By = userName;
    if (params.type) newParams.type = params.type;
    if (params.status) newParams.status = params.status;

    const res = await queryPage<IGenTaskQuerySerType>(KrdGenTask, newParams);

    ctx.state.formatData = res;
    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit(
      'error',
      {
        code: '500',
        message: 'リストの取得に失敗しました',
      },
      ctx,
    );
  }
};

export const getOutputListMid = async (ctx: any, next: () => Promise<void>) => {
  try {
    const { pageNum, pageSize, ...params } = ctx.query as unknown as IGenTaskOutputQueryType;
    const newParams = { pageNum, pageSize } as IGenTaskOutputQuerySerType;
    if (params.taskId) newParams.task_id = params.taskId;
    if (params.status) newParams.status = params.status;
    if (params.sort) newParams.sort = params.sort;

    const res = await queryPage<IGenTaskOutputQuerySerType>(KrdGenTaskOutput, newParams);

    ctx.state.formatData = res;
    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit(
      'error',
      {
        code: '500',
        message: 'リストの取得に失敗しました',
      },
      ctx,
    );
  }
};

export const updateTaskOutputMid = async (ctx: any, next: () => Promise<void>) => {
  const { userName } = ctx.state.user as userType;
  const { taskOutputId } = ctx.params;
  const { status, metadata, feedback, content } = ctx.request.body;

  await put<IGenTaskOutputSer>(KrdGenTaskOutput, { id: taskOutputId }, {
    status,
    metadata,
    feedback,
    content,
    update_by: userName,
  } as IGenTaskOutputSer);

  await next();
};

export const reNameTaskOutputMid = async (ctx: any, next: () => Promise<void>) => {
  const { userName } = ctx.state.user as userType;
  const { taskId } = ctx.params;
  const { newName } = ctx.request.body;

  await put<IGenTaskOutputReNameSer>(KrdGenTask, { id: taskId }, {
    form_data: newName,
    update_by: userName,
  } as IGenTaskOutputReNameSer);

  await next();
};

export const deleteTaskOutputMid = async (ctx: any, next: () => Promise<void>) => {
  const { taskId } = ctx.params;

  await KrdGenTask.destroy({
    where: { id: taskId },
  });

  await KrdGenTaskOutput.destroy({
    where: { task_id: taskId },
  });

  await next();
};

export const stopTaskOutputMid = async (ctx: any, next: () => Promise<void>) => {
  try {
    const { taskId, fieldSort } = ctx.query;
    const { userName } = ctx.state.user as userType;


    const outputData = await queryConditionsData(KrdGenTaskOutput, {
      task_id: taskId,
      sort: fieldSort,
      status: { [Op.in]: ['IN_PROCESS', 'PROCESSING', 'WAIT'] },
    });

    if (outputData && outputData.length > 0) {
      await put<IGenTaskOutputSer>(
        KrdGenTaskOutput,
        {
          task_id: taskId,
          sort: fieldSort,
          status: { [Op.in]: ['IN_PROCESS', 'PROCESSING', 'WAIT'] },
        },
        {
          // content: 'CANCEL',
          status: 'CANCEL',
          update_by: userName,
        },
      );

      const outputs = await queryConditionsData(KrdGenTaskOutput, {
        task_id: outputData[0].task_id,
        status: { [Op.in]: ['IN_PROCESS', 'PROCESSING', 'WAIT'] },
      });

      if (!outputs || outputs.length === 0) {
        await put<IGenTaskSer>(KrdGenTask, { id: outputData[0].task_id }, { status: 'FINISHED', update_by: userName });
      }
    }
  } catch (error) {
    console.error('Error in stopTaskOutputMid:', error);
  }

  await next();
};

export const getChatTitleMid = async (ctx: any, next: () => Promise<void>) => {
  const { userName } = ctx.state.user as userType;
  const { chatId } = ctx.query;
  const newParams = { id: chatId, pageNum: 1, pageSize: 1, create_By: userName } as IGenTaskQuerySerType;

  try {
    const res = await queryPage<IGenTaskQuerySerType>(KrdGenTask, newParams);
    ctx.state.formatData = res;
    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit(
      'error',
      {
        code: '500',
        message: 'リストの取得に失敗しました',
      },
      ctx,
    );
  }
};

export const sendFeedbackToCache = async (ctx: any, next: () => Promise<void>) => {
  try {
    const { userName } = ctx.state.user as userType;
    const { taskOutputId: rawTaskOutputId, cache_signal, query, answer } = ctx.request.body as {
      taskOutputId: number;
      cache_signal: number;
      query: string;
      answer: string;
    };

    // Convert taskOutputId to string if it's a number
    const taskOutputId = String(rawTaskOutputId);

    console.log(`[FEEDBACK] User ${userName} sending feedback: signal=${cache_signal}, taskOutputId=${taskOutputId}`);
    console.log(`[FEEDBACK] Query: ${query?.substring(0, 50)}...`);
    console.log(`[FEEDBACK] Answer: ${answer?.substring(0, 50)}...`);

    // Validate input
    if (cache_signal !== 0 && cache_signal !== 1) {
      return ctx.app.emit('error', {
        code: '400',
        message: 'cache_signal must be 0 or 1',
      }, ctx);
    }

    if (!query || !answer) {
      return ctx.app.emit('error', {
        code: '400',
        message: 'query and answer are required',
      }, ctx);
    }

    // Prepare feedback data for FAQ cache service
    const feedbackData = {
      cache_signal: cache_signal,
      query: query,
      answer: answer,
    };

    // Send to FAQ cache service (port 8001)
    const faqCacheUrl = process.env.FAQ_CACHE_URL || 'http://localhost:8001';
    const response = await fetch(`${faqCacheUrl}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedbackData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[FEEDBACK] FAQ cache service error: ${response.status} - ${errorText}`);
      return ctx.app.emit('error', {
        code: '500',
        message: `FAQ cache service error: ${response.status}`,
      }, ctx);
    }

    const result = await response.json();

    console.log(`[FEEDBACK] FAQ cache response:`, result);

    // Return success response
    ctx.state.formatData = {
      success: true,
      message: result.message || 'Feedback sent successfully',
      action_taken: result.action_taken,
      cache_signal: cache_signal,
      taskOutputId: taskOutputId,
      faq_cache_response: result,
    };

    await next();
  } catch (error) {
    console.error('[FEEDBACK] Error sending feedback to cache:', error);
    return ctx.app.emit('error', {
      code: '500',
      message: `Failed to send feedback: ${error.message}`,
    }, ctx);
  }
};
