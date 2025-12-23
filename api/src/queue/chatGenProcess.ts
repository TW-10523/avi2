import { getMCPManager } from '@/core/mcpManager';
import File from '@/mysql/model/file.model';
import KrdGenTask from '@/mysql/model/gen_task.model';
import KrdGenTaskOutput from '@/mysql/model/gen_task_output.model';
import { IGenTaskOutputSer } from '@/types/genTaskOutput';
import { IGenTaskSer } from '@/types/genTask';
import { extractToolCallsFromText } from '@/utils/text';
import { config } from '@config/index'
import dns from 'node:dns';
import OpenAI from 'openai';
import { Op } from 'sequelize';
import { execute } from '../service/task.dispatch';
import { put, queryList } from '../utils/mapper';
import { getNextApiUrl } from '../utils/redis';
import { loadRagProcessor } from '@/service/loadRagProcessor';
import { loadCacheProcessor } from '@/service/loadCacheProcessor';
import {
  detectLanguage,
  translateQueryToJapanese,
  createDualLanguageResponse,
  formatDualLanguageOutput,
  translateText,
  LanguageCode,
} from '@/utils/translation';
import { classifyQuery, ClassificationResult } from '@/service/queryClassificationService';

dns.setDefaultResultOrder('ipv4first');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

const callLLM = async (messages: any[], temperature = 0.5, outputId?: number): Promise<string> => {
  if (outputId) {
    const url = await getNextApiUrl('ollama');
    const response = await fetch(`${url.replace(/\/+$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stream: true, model: config.Models.chatModel.name, messages, options: { temperature, repeat_penalty: 1.5 } }),
    });
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let content = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      let [curOutput] = await queryList(KrdGenTaskOutput, { id: { [Op.eq]: outputId } });
      if (!curOutput) {
        console.error(`Output with ID ${outputId} not found.`);
        break;
      }
      if (curOutput.status === 'CANCEL') {
        await reader.cancel().catch(() => { });
        await put<IGenTaskOutputSer>(
          KrdGenTaskOutput,
          { id: outputId },
          {
            // content: '',
            status: 'CANCEL',
            update_by: 'JOB',
          },
        );
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop()!;

      for (const line of lines) {
        [curOutput] = await queryList(KrdGenTaskOutput, { id: { [Op.eq]: outputId } });
        if (curOutput.status === 'CANCEL') {
          await reader.cancel().catch(() => { });
          content = '';
          await put<IGenTaskOutputSer>(
            KrdGenTaskOutput,
            { id: outputId },
            { content, status: 'CANCEL', update_by: 'JOB' },
          );
          break; // forループを抜ける
        }
        if (!line.trim()) continue;
        try {
          const pkg = JSON.parse(line);
          const chunkText = pkg.message?.content || '';
          content += chunkText;

          await put<IGenTaskOutputSer>(
            KrdGenTaskOutput,
            {
              id: outputId,
              status: { [Op.ne]: 'CANCEL' },
            },
            {
              content,
              status: 'PROCESSING',
              update_by: 'JOB',
            },
          );
        } catch (e) {
          console.error('LLM ストリーム解析エラー:', e);
        }
      }
      if (curOutput.status === 'CANCEL') break;
    }
    if (buffer.trim()) {
      try {
        const pkg = JSON.parse(buffer);
        const chunkText = pkg.message?.content || '';
        content += chunkText;
      } catch (e) {
        console.error('LLM ストリーム解析エラー:', e);
      }
    }

    return content || '';
  } else {
    const url = await getNextApiUrl('ollama');
    const response = await fetch(`${url.replace(/\/+$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stream: false, model: config.Models.chatModel.name, messages, options: { temperature } }),
    });
    const res = await response.json();
    return res.message?.content || '';
  }
};

export async function generateWithMCPWithoutToolcalling(prompt: string): Promise<string> {
  const mcpManager = getMCPManager();
  await mcpManager.connectAll();
  const client = mcpManager.getClient();

  const tools = await Promise.all(
    client.getActiveSessions().map(async name => {
      const toolList = await client.listTools(name);
      return toolList.map(tool => ({
        name: `${name}__${tool.name}`,
        description: `[${name}] ${tool.description}`,
        parameters: tool.inputSchema,
      }));
    })
  );
  const flatTools = tools.flat();

  const toolListString = flatTools
    .map(t => `- ${t.name}: ${t.description}`)
    .join('\n');

  const messages = [
    {
      role: 'system',
      content:
        'あなたはツール選定専門家です。ユーザーの質問に対して、適切なツールを以下のリストから選び、次のフォーマットで出力してください：\n\nTOOL: tool_name(arg1=..., arg2=...)\n\n使用可能ツール：\n' +
        toolListString,
    },
    { role: 'user', content: prompt },
  ];

  const response = await callLLM(
    messages, 0.3
  );

  const text = response ?? '';
  const toolCalls = extractToolCallsFromText(text);

  const results: string[] = [];
  for (const call of toolCalls) {
    const [server, tool] = call.name.split('__');
    const result = await client.callTool(server, tool, call.args);
    results.push(`[${call.name}]: ${JSON.stringify(result.content)}`);
  }

  const summaryMessages = [
    {
      role: 'system',
      content: 'あなたはAIアシスタントです。以下の質問とツール結果に基づき、簡潔な日本語で回答してください。',
    },
    { role: 'user', content: `質問: ${prompt}` },
    results.length > 0 ? { role: 'assistant', content: `TOOL実行結果:\n${results.join('\n')}` } : undefined,
  ];

  const summary = await callLLM(
    summaryMessages,
    0.3,
  );

  return summary ?? '[回答失敗]';
}

export async function generateWithMCP(prompt: string): Promise<string> {
  const mcpManager = getMCPManager();
  await mcpManager.connectAll();
  const client = mcpManager.getClient();

  const tools = await Promise.all(
    client.getActiveSessions().map(async name => {
      const t = await client.listTools(name);
      return t.map(tool => ({
        type: "function" as const,
        function: {
          name: `${name}__${tool.name}`,
          description: `[${name}] ${tool.description}`,
          parameters: tool.inputSchema
        }
      }));
    })
  );

  const flatTools = tools.flat();

  const messages = [
    {
      role: 'system',
      content: 'あなたはAIアシスタントです。以下の質問とツール結果を元に、正確で簡潔な日本語の回答を作成してください。',
    },
    { role: "user", content: prompt }
  ];


  const model = process.env.LLM_MODEL || 'gpt-4-turbo';

  let response = await openai.chat.completions.create({
    model,
    messages: messages as OpenAI.ChatCompletionMessageParam[],
    tools: flatTools,
    tool_choice: "auto"
  });

  const msg = response.choices?.[0]?.message;
  const responses: string[] = [];

  if (msg?.tool_calls) {
    for (const call of msg.tool_calls) {
      const [server, tool] = call.function.name.split("__");
      const args = JSON.parse(call.function.arguments);
      const result = await client.callTool(server, tool, args);
      responses.push(result.content);
    }
  } else if (msg?.content) {
    responses.push(msg.content);
  }

  return responses.join('\n');

}



export async function createChatTitle(prompt: string, content: string): Promise<string> {
  try {
    const message = `
Please summarize the following conversation (question and answer) into a Japanese chat title of about 15 characters.
Output only the title—no explanation or extra text.

Conversation:
Q: 【${prompt}】
A: 【${content}】
`;

    const url = await getNextApiUrl('ollama');
    const response = await fetch(`${url}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stream: false,
        model: config.Models.chatTitleGenModel.name,
        prompt: message,
        options: {
          temperature: config.Models.chatTitleGenModel.temperature ?? 0.8,
          repeat_penalty: config.Models.chatTitleGenModel.repeat_penalty ?? 1.5
        }
      }),
    });
    const data = await response.json();

    return data.response;
  } catch (error) {
    console.error(error);
    return "空のチャットタイトル";
  }
}

const generateWithLLM = async (messages: any[], outputId: number) => {
  try {
    return await callLLM(messages, 0.1, outputId);
  } catch (error) {
    console.error('LLM 呼び出し失敗:', error);
    return 'error happen';
  }
};

const chatGenProcess = async (job) => {
  const { taskId } = job.data;
  const type = 'CHAT';
  // const mode: string = (config.RAG.mode || ['splitByPage'])[0];
  const mode: string = (config.RAG.mode || ['splitByPage'])[0];
  const useFaqCache: boolean = config.RAG.useFaqCache || false;
  const ragProcessor = await loadRagProcessor(mode);
  const cacheProcessor = await loadCacheProcessor(useFaqCache);

  const callAviary = async (outputId: number, metadata: string) => {
    // KPI Metrics tracking
    const kpiMetrics = {
      startTime: Date.now(),
      endTime: 0,
      totalTime: 0,
      ragUsed: false,
      ragTime: 0,
      llmTime: 0,
      translationTime: 0,
      queryTranslationTime: 0,
      inputTokens: 0,
      outputTokens: 0,
      modelUsed: config.Models.chatModel.name,
      userLanguage: 'unknown',
      fileCount: 0,
      responseLength: 0,
      englishLength: 0,
      japaneseLength: 0,
    };

    let [curOutput] = await queryList(KrdGenTaskOutput, { id: { [Op.eq]: outputId } });
    if (curOutput.status === 'CANCEL') return { outputId, isOk: false, content: '' };

    const outputs = await queryList(KrdGenTaskOutput, {
      task_id: { [Op.eq]: taskId },
      status: { [Op.ne]: 'IN_PROCESS' },
    });

    const messages = outputs.flatMap((op) => [
      { role: 'user', content: op.metadata },
      ...(op.content ? [{ role: 'assistant', content: op.content }] : []),
    ]);

    const data = JSON.parse(metadata);
    console.log(`\n========== [CHAT PROCESS] Starting chat generation ==========`);
    console.log(`[CHAT PROCESS] Task ID: ${taskId}, Output ID: ${outputId}`);
    console.log(`[CHAT PROCESS] Metadata:`, JSON.stringify(data, null, 2));

    // Check if files are uploaded - either specific files or all files in database
    const hasSpecificFiles = Array.isArray(data.fileId) && data.fileId.length > 0 && data.fileId[0] !== 0;
    
    let storage_keyArray: string[] = [];
    let fileNames: string[] = [];
    let hasFiles = hasSpecificFiles;
    
    if (hasSpecificFiles) {
      console.log(`[CHAT PROCESS] Processing ${data.fileId.length} specific file(s)`);
      for (const id of data.fileId) {
        const [file] = await queryList(File, { id: { [Op.eq]: id } });
        if (file) {
          storage_keyArray.push(file.storage_key);
          fileNames.push(file.filename);
          console.log(`[CHAT PROCESS] File ID ${id}: ${file.filename} (storage_key: ${file.storage_key})`);
        }
      }
    } else if (data.allFileSearch === true) {
      // Get ALL files from database for RAG search
      console.log(`[CHAT PROCESS] allFileSearch=true, fetching all files from database...`);
      const allFiles = await queryList(File, {});
      if (allFiles && allFiles.length > 0) {
        hasFiles = true;
        for (const file of allFiles) {
          storage_keyArray.push(file.storage_key);
          fileNames.push(file.filename);
          console.log(`[CHAT PROCESS] Found file: ${file.filename} (storage_key: ${file.storage_key})`);
        }
        console.log(`[CHAT PROCESS] Found ${allFiles.length} file(s) in database`);
      } else {
        console.log(`[CHAT PROCESS] No files in database`);
      }
    } else {
      console.log(`[CHAT PROCESS] No files to search`);
    }
    
    // Note: shouldUseRAG will be refined after query classification
    // RAG should only be used for COMPANY queries, not general ones
    const filesAvailable = hasFiles && data.allFileSearch === true;
    
    console.log(`[CHAT PROCESS] File check: hasFiles=${hasFiles}, fileCount=${storage_keyArray.length}, allFileSearch=${data.allFileSearch}`);
    console.log(`[CHAT PROCESS] Files available for RAG: ${filesAvailable}`)

    console.log(`[CHAT PROCESS] Checking output status...`);
    try {
      [curOutput] = await queryList(KrdGenTaskOutput, { id: { [Op.eq]: outputId } });
      console.log(`[CHAT PROCESS] Output status: ${curOutput?.status}`);
    } catch (dbError) {
      console.error(`[CHAT PROCESS] Database error:`, dbError);
      return { outputId, isOk: false, content: 'Database error' };
    }
    
    if (curOutput.status === 'CANCEL') {
      console.log(`[CHAT PROCESS] Output ${outputId} was cancelled, aborting`);
      return { outputId, isOk: false, content: '' };
    }

    let prompt = data.prompt;
    
    // Step 1: Classify query (company vs general) and detect language
    console.log(`\n[STEP 1] Query Classification & Language Detection`);
    console.log(`[STEP 1] Original prompt: "${data.prompt}"`);
    
    const classification: ClassificationResult = classifyQuery(data.prompt);
    const userLanguage = classification.language;
    kpiMetrics.userLanguage = userLanguage;
    
    console.log(`[STEP 1] Classification result:`, {
      queryType: classification.queryType,
      isCompanyQuery: classification.isCompanyQuery,
      language: classification.language,
      keywords: classification.detectedKeywords.slice(0, 3),
      confidence: (classification.confidence * 100).toFixed(1) + '%',
    });
    
    // Base query for RAG (will be translated to Japanese for company queries if needed)
    let queryForRAG = data.prompt;
    let queryTranslationStart = 0;
    
    // For company queries: translate to Japanese if user query is in English
    // For general queries: no translation needed for RAG (will answer directly with LLM)
    if (classification.isCompanyQuery) {
      console.log(`[STEP 1] Company query detected - RAG will be used if files are uploaded`);
      if (userLanguage === 'ja') {
        console.log(`[STEP 1] Query is in Japanese - will use directly for RAG`);
      } else {
        console.log(`[STEP 1] Query is in ${userLanguage} - will translate to Japanese for RAG if needed`);
      }
    } else {
      console.log(`[STEP 1] General query detected - will answer directly with LLM (no RAG)`);
    }

    let content = '';
    let isOk = true;
    let englishAnswer = ''; // Store English answer (primary)
    let japaneseTranslation = ''; // Store Japanese translation for dual-output
    
    if (data.useMcp === true) {
      console.log(`\n[STEP 2] Using MCP (Model Context Protocol)`);
      const mcpStartTime = Date.now();
      try {
        englishAnswer = await generateWithMCPWithoutToolcalling(queryForRAG);
        content = englishAnswer;
        kpiMetrics.llmTime = Date.now() - mcpStartTime;
        console.log(`[STEP 2] MCP generation successful, answer length: ${englishAnswer.length}`);
      } catch (e) {
        console.error(`[STEP 2] MCP generation failed:`, e);
        content = 'error happen';
        isOk = false;
      }
    } else {
      // Step 2: RAG search ONLY if files are uploaded AND query is company-related
      // For general queries, skip RAG even if files are uploaded
      const useRAGForQuery = filesAvailable && classification.isCompanyQuery;
      
      console.log(`[CHAT PROCESS] RAG decision: useRAGForQuery=${useRAGForQuery} (filesAvailable=${filesAvailable}, isCompanyQuery=${classification.isCompanyQuery})`);
      
      if (useRAGForQuery) {
        console.log(`\n[STEP 2] RAG Search (Company query + Files uploaded - using RAG)`);
        kpiMetrics.ragUsed = true;
        const ragStartTime = Date.now();
        try {
          [curOutput] = await queryList(KrdGenTaskOutput, { id: { [Op.eq]: outputId } });
          if (curOutput.status === 'CANCEL') {
            console.log(`[STEP 2] Output cancelled during RAG search`);
            return { outputId, isOk: false, content: '' };
          }

          // If user query is not Japanese, translate to Japanese for RAG
          if (userLanguage !== 'ja') {
            try {
              console.log(`[STEP 2] Translating query to Japanese for RAG...`);
              queryTranslationStart = Date.now();
              queryForRAG = await translateText(data.prompt, 'ja');
              kpiMetrics.queryTranslationTime = Date.now() - queryTranslationStart;
              console.log(`[STEP 2] Translation for RAG completed in ${kpiMetrics.queryTranslationTime}ms`);
            } catch (e) {
              console.error(`[STEP 2] Translation for RAG failed, using original prompt`, e);
              queryForRAG = data.prompt;
            }
          } else {
            queryForRAG = data.prompt;
          }

          console.log(`[STEP 2] Starting RAG search with query: "${queryForRAG}"`);
          console.log(`[STEP 2] Searching ${storage_keyArray.length} document(s) via Solr`);
          
          try {
            // Search using Solr directly (RAG backend may not be running)
            const searchTerms = queryForRAG.split(/\s+/).filter(t => t.length > 2).map(t => `"${t}"`).join(' OR ');
            const solrQuery = encodeURIComponent(searchTerms || '*:*');
            const fileFilter = storage_keyArray.map(k => `id:"${k}"`).join(' OR ');
            
            const solrUrl = `${config.ApacheSolr.url}/solr/mycore/select?q=${solrQuery}&fq=${encodeURIComponent(fileFilter)}&rows=5&fl=id,title,content,_text_`;
            console.log(`[STEP 2] Solr search URL: ${solrUrl}`);
            
            const solrResponse = await fetch(solrUrl);
            const solrResult = await solrResponse.json();
            const docs = solrResult.response?.docs || [];
            
            console.log(`[STEP 2] Solr search returned ${docs.length} results`);
            
            if (docs.length > 0) {
              // Format results into prompt with actual content
              const formattedResults = docs.map((doc: any, index: number) => {
                // Solr stores content in _text_ or content field
                const content = (doc._text_ || doc.content || []).join ? 
                  (doc._text_ || doc.content || []).slice(0, 3).join('\n') : 
                  String(doc._text_ || doc.content || '');
                const title = Array.isArray(doc.title) ? doc.title[0] : doc.title;
                return `
=== Document ${index + 1}: ${title || fileNames[index] || 'Document'} ===
${content.substring(0, 3000)}
===`;
              }).join('\n\n');
              
              console.log(`[STEP 2] RAG content preview:`, formattedResults.substring(0, 500));
              
              prompt = `You are a helpful assistant. You MUST answer ONLY using the document content provided.

DOCUMENT CONTENT:
${formattedResults}

QUESTION: ${data.prompt}

CRITICAL INSTRUCTIONS:
1. ONLY use information from the documents above
2. If you cannot find the answer in the documents, respond: "I cannot find this information in the provided documents."
3. For EVERY statement in your answer, explicitly cite the source document
4. Use format: "[Source: Document Title]" after each relevant statement
5. Do NOT invent, assume, or add any information not in the documents
6. Do NOT use JSON format or special markers
7. Do NOT include technical document details or file paths in your answer
8. Give a direct, clear answer based ONLY on document content
9. If similar information appears in multiple documents, cite all sources`;
              
              console.log(`[STEP 2] RAG prompt constructed, length: ${prompt.length}`);
            } else {
              console.log(`[STEP 2] No Solr results found for this query`);
              // When no results found, still construct a prompt that tells LLM
              prompt = `You are a helpful assistant. The user asked the following question about company documents:

QUESTION: ${data.prompt}

However, no relevant information was found in the uploaded documents. 
Respond with: "I cannot find information about [topic] in the provided documents. The uploaded documents do not contain details about this topic."

Do NOT make up any information.`;
            }
          } catch (e) {
            console.error(`[STEP 2] RAG/Solr search error:`, e);
            prompt = queryForRAG; // Fallback to original prompt
          }
          kpiMetrics.ragTime = Date.now() - ragStartTime;
          console.log(`[STEP 2] RAG search completed in ${kpiMetrics.ragTime}ms`);

          [curOutput] = await queryList(KrdGenTaskOutput, { id: { [Op.eq]: outputId } });
          if (curOutput.status === 'CANCEL') {
            console.log(`[STEP 2] Output cancelled after RAG search`);
            return { outputId, isOk: false, content: '' };
          }
        } catch (e) {
          console.error(`[STEP 2] RAG search failed:`, e);
          content = 'error happen';
          isOk = false;
        }
      } else {
        if (!classification.isCompanyQuery) {
          console.log(`\n[STEP 2] Skipping RAG (General query - answering directly with LLM)`);
        } else {
          console.log(`\n[STEP 2] Skipping RAG (No files uploaded - using LLM only)`);
        }
        console.log(`[STEP 2] Using original prompt directly: "${prompt}"`);
      }
      
      // Step 3: Generate answer with LLM (in English)
      if (content !== "error happen") {
        console.log(`\n[STEP 3] LLM Generation`);
        
        // Add system message with response language based on user's language
        const responseLanguage = userLanguage === 'ja' ? 'Japanese' : 'English';
        
        // For RAG queries, enforce strict document-only responses
        let systemMessageContent = '';
        if (kpiMetrics.ragUsed) {
          systemMessageContent = `You are a helpful assistant answering ONLY from provided documents. 
CRITICAL RULES:
1) Respond ONLY in ${responseLanguage}.
2) ONLY answer based on the document content provided above.
3) If information is NOT in the documents, say "This information is not available in the provided documents."
4) ALWAYS include document source and page numbers for every answer.
5) Do NOT make up, assume, or hallucinate any information.
6) Do NOT include ANY language labels, markers, or formatting like *English*, [JA], or similar.
7) Give direct, plain text answers only - NO markers, NO asterisks, NO brackets, NO formatting.
8) Do NOT use JSON format unless specifically requested.`;
        } else {
          systemMessageContent = `You are a helpful assistant. IMPORTANT RULES: 1) Respond ONLY in ${responseLanguage}. 2) Do NOT include any language labels or markers like *English*, [JA], etc. 3) Do NOT include markers like [EN], [JA], or any language tags. 4) Give direct, plain text answers only. 5) Do NOT use JSON format unless specifically requested.`;
        }
        
        const systemMessage = { 
          role: 'system', 
          content: systemMessageContent
        };
        console.log(`[STEP 3] System message: ${systemMessage.content}`);
        
        // Ensure system message is first, then add user prompt
        const messagesWithSystem = messages.some(m => m.role === 'system') 
          ? messages 
          : [systemMessage, ...messages];
        messagesWithSystem.push({ role: 'user', content: prompt });
        
        // Calculate input tokens (approximate)
        const inputText = messagesWithSystem.map(m => m.content).join(' ');
        kpiMetrics.inputTokens = Math.ceil(inputText.length / 4); // Rough estimate: 4 chars per token
        
        console.log(`[STEP 3] Total messages: ${messagesWithSystem.length}`);
        console.log(`[STEP 3] Estimated input tokens: ${kpiMetrics.inputTokens}`);
        console.log(`[STEP 3] Message structure:`, messagesWithSystem.map(m => ({ role: m.role, contentLength: m.content?.length || 0 })));

        [curOutput] = await queryList(KrdGenTaskOutput, { id: { [Op.eq]: outputId } });
        if (curOutput.status === 'CANCEL') {
          console.log(`[STEP 3] Output cancelled before LLM generation`);
          return { outputId, isOk: false, content: '' };
        }

        const llmStartTime = Date.now();
        console.log(`[STEP 3] Calling LLM to generate English response...`);
        englishAnswer = await generateWithLLM(messagesWithSystem, outputId);
        kpiMetrics.llmTime = Date.now() - llmStartTime;
        kpiMetrics.outputTokens = Math.ceil(englishAnswer.length / 4); // Rough estimate
        
        console.log(`[STEP 3] LLM generation completed in ${kpiMetrics.llmTime}ms`);
        console.log(`[STEP 3] Generated answer length: ${englishAnswer.length} characters`);
        console.log(`[STEP 3] Estimated output tokens: ${kpiMetrics.outputTokens}`);
        
        // Clean LLM response - light cleanup only
        console.log(`[STEP 3] Raw LLM answer (first 300 chars): ${englishAnswer.substring(0, 300)}`);
        
        // Remove any language markers that LLM might have added (anywhere in text, not just start)
        englishAnswer = englishAnswer
          .replace(/\*+(English|English \(User Language\)|日本語|Japanese|Translation)\*+\s*:?\s*\n?/gi, '')
          .replace(/\[(English|Japanese)\]\s*:?\s*\n?/gi, '')
          .replace(/^(English|Japanese|Translation)[\s:]*\n?/gmi, '')
          .trim();
        
        // Only extract from [EN] marker if it exists
        const enMatch = englishAnswer.match(/\[EN\]\s*([\s\S]*?)(?=\[J\s*A\s*\]|$)/i);
        if (enMatch && enMatch[1].trim().length > 10) {
          englishAnswer = enMatch[1].trim();
          console.log(`[STEP 3] Extracted English from [EN] marker`);
        }
        
        // Cut off at [JA] marker if present
        const jaIndex = englishAnswer.search(/\[J\s*A\s*\]/i);
        if (jaIndex > 20) {
          englishAnswer = englishAnswer.substring(0, jaIndex).trim();
          console.log(`[STEP 3] Cut off content at [JA] marker`);
        }
        
        // Light cleanup - just remove remaining markers, keep content
        englishAnswer = englishAnswer
          .replace(/\[\s*EN\s*\]/gi, '')
          .replace(/\[\s*J\s*A\s*\]/gi, '')
          .replace(/<!--.*?-->/g, '')
          .trim();
        
        // Only use fallback if completely empty
        if (!englishAnswer || englishAnswer.length === 0) {
          console.log(`[STEP 3] Answer empty, using fallback`);
          englishAnswer = "I'm sorry, I couldn't generate a response. Please try again.";
        }
        
        console.log(`[STEP 3] Final cleaned English answer: ${englishAnswer.substring(0, 200)}`)
        
        console.log(`[STEP 3] Cleaned answer preview: ${englishAnswer.substring(0, 200)}...`);
        
        content = englishAnswer;

        if (outputs.length === 0) {
          console.log(`[STEP 3] First message in chat - generating title...`);
          const chatTitle = await createChatTitle(prompt, englishAnswer);
          console.log(`[STEP 3] Generated chat title: "${chatTitle}"`);
          
          await put<IGenTaskSer>(KrdGenTask, { id: taskId }, {
            form_data: chatTitle,
            update_by: 'JOB',
          });
        }
      }
      isOk = content !== 'error happen';
      console.log(`[STEP 3] Generation status: ${isOk ? 'SUCCESS' : 'FAILED'}`);

      if (config.APP_MODE === 'rag-evaluation') {
        content = prompt + "\n\n## LLM Response\n\n" + content;
        console.log(`[STEP 3] RAG evaluation mode - appending prompt to content`);
      }
    }
    
    // Step 4: Create dual-language output (User's language first, translation second)
    console.log(`\n[STEP 4] Dual-Language Output Creation`);
    if (isOk) {
      try {
        console.log(`[STEP 4] User language: ${userLanguage}`);
        // Ensure we have an answer to work with
        if (!englishAnswer) {
          englishAnswer = content || '';
        }
        console.log(`[STEP 4] LLM answer length: ${englishAnswer.length}`);
        
        // Translate to the OTHER language for dual-language output
        const translationStartTime = Date.now();
        if (userLanguage === 'ja') {
          // User asked in Japanese, LLM responded in Japanese
          // Translate to English
          console.log(`[STEP 4] Translating Japanese answer to English...`);
          console.log(`[STEP 4] BEFORE translation - englishAnswer (actual Japanese): ${englishAnswer.substring(0, 100)}...`);
          const englishTranslation = await translateText(englishAnswer, 'en', true);
          kpiMetrics.translationTime = Date.now() - translationStartTime;
          
          console.log(`[STEP 4] AFTER translation - englishTranslation: ${englishTranslation.substring(0, 100)}...`);
          
          // Clean translation output
          japaneseTranslation = englishAnswer; // Original Japanese response (user's language)
          englishAnswer = englishTranslation;   // English translation (translated language)
          
          console.log(`[STEP 4] FINAL - japaneseTranslation field will contain (ORIGINAL): ${japaneseTranslation.substring(0, 100)}...`);
          console.log(`[STEP 4] FINAL - englishAnswer field will contain (TRANSLATION): ${englishAnswer.substring(0, 100)}...`);
          
          // Create output: formatDualLanguageOutput(japaneseField, translatedField, targetLanguage)
          // For Japanese user: put original Japanese in 'japanese' field, translation in 'translated' field
          content = formatDualLanguageOutput(
            japaneseTranslation, // → goes to "japanese" field (original, user's language)
            englishAnswer,       // → goes to "translated" field (translation)
            'ja'                 // targetLanguage tells frontend: user asked in Japanese
          );
          console.log(`[STEP 4] JSON: {"japanese": "<original ja>", "translated": "<en translation>", "targetLanguage": "ja"}`);
          console.log(`[STEP 4] Frontend will show: Left column = content.japanese, Right column = content.translated`);
        } else {
          // User asked in English, LLM responded in English
          // Translate to Japanese
          console.log(`[STEP 4] Translating English answer to Japanese...`);
          console.log(`[STEP 4] BEFORE translation - englishAnswer (actual English): ${englishAnswer.substring(0, 100)}...`);
          const japaneseTranslation = await translateText(englishAnswer, 'ja', true);
          kpiMetrics.translationTime = Date.now() - translationStartTime;
          
          console.log(`[STEP 4] AFTER translation - japaneseTranslation: ${japaneseTranslation.substring(0, 100)}...`);
          
          // Create output: formatDualLanguageOutput(japaneseField, translatedField, targetLanguage)
          // For English user: put Japanese translation in 'japanese' field, original English in 'translated' field
          console.log(`[STEP 4] FINAL - japaneseTranslation field will contain (TRANSLATION): ${japaneseTranslation.substring(0, 100)}...`);
          console.log(`[STEP 4] FINAL - englishAnswer field will contain (ORIGINAL): ${englishAnswer.substring(0, 100)}...`);
          
          content = formatDualLanguageOutput(
            japaneseTranslation, // → goes to "japanese" field (translation)
            englishAnswer,       // → goes to "translated" field (original, user's language)
            'en'                 // targetLanguage tells frontend: user asked in English
          );
          console.log(`[STEP 4] JSON: {"japanese": "<ja translation>", "translated": "<original en>", "targetLanguage": "en"}`);
          console.log(`[STEP 4] Frontend will show: Left column = content.translated (English), Right column = content.japanese (Japanese)`);
        }
      } catch (e) {
        console.error(`[STEP 4] Dual-language output creation failed:`, e);
        // If translation fails, still create dual-language format with English as both
        content = formatDualLanguageOutput(
          englishAnswer, // Use English as fallback if translation fails
          englishAnswer,
          'en'
        );
        kpiMetrics.englishLength = englishAnswer.length;
        kpiMetrics.japaneseLength = englishAnswer.length;
        console.log(`[STEP 4] Using English as fallback for both languages (translation failed)`);
      }
    } else {
      console.error(`[STEP 4] Cannot create dual-language output: isOk=${isOk}, hasEnglishAnswer=${!!englishAnswer}`);
      // Provide a dual-language error message
      const errEn = 'An error occurred. Please try again or contact support.';
      const errJa = 'エラーが発生しました。再試行するか、サポートに連絡してください。';
      content = formatDualLanguageOutput(errJa, errEn, 'en');
      kpiMetrics.englishLength = errEn.length;
      kpiMetrics.japaneseLength = errJa.length;
    }

    // Final safeguard: ensure dual-language wrapper is present
    if (!content.includes('<!--DUAL_LANG_START-->')) {
      console.warn(`[STEP 4] Dual-language wrapper missing. Adding fallback wrapper.`);
      const jaFallback = japaneseTranslation || englishAnswer || content || '';
      const enFallback = englishAnswer || content || '';
      content = formatDualLanguageOutput(jaFallback, enFallback, 'en');
      kpiMetrics.englishLength = enFallback.length;
      kpiMetrics.japaneseLength = jaFallback.length;
    }
    
    console.log(`[STEP 4] FINAL CONTENT BEING SAVED:`);
    console.log(`Content snippet (first 300 chars): ${content.substring(0, 300)}`);
    console.log(`Content length: ${content.length}`);

    // Step 5: Calculate final KPI metrics and save output
    console.log(`\n[STEP 5] Finalizing & Saving Output`);
    [curOutput] = await queryList(KrdGenTaskOutput, { id: { [Op.eq]: outputId } });
    if (curOutput.status === 'CANCEL') {
      console.log(`[STEP 5] Output was cancelled, aborting save`);
      return { outputId, isOk: false, content: '' };
    }

    // Calculate final metrics
    kpiMetrics.endTime = Date.now();
    kpiMetrics.totalTime = kpiMetrics.endTime - kpiMetrics.startTime;
    kpiMetrics.responseLength = content.length;
    kpiMetrics.fileCount = hasFiles ? data.fileId.length : 0;

    const finalStatus = isOk ? 'FINISHED' : 'FAILED';
    console.log(`[STEP 5] Saving output with status: ${finalStatus}`);
    console.log(`[STEP 5] Content length: ${content.length}`);
    console.log(`[STEP 5] Content preview: ${content.substring(0, 200)}...`);

    // Log KPI Metrics
    console.log(`\n========== [KPI METRICS] ==========`);
    console.log(`[KPI] Total Response Time: ${kpiMetrics.totalTime}ms (${(kpiMetrics.totalTime / 1000).toFixed(2)}s)`);
    console.log(`[KPI] RAG Used: ${kpiMetrics.ragUsed ? 'YES' : 'NO'}`);
    if (kpiMetrics.ragUsed) {
      console.log(`[KPI] RAG Search Time: ${kpiMetrics.ragTime}ms (${(kpiMetrics.ragTime / 1000).toFixed(2)}s)`);
    }
    console.log(`[KPI] LLM Generation Time: ${kpiMetrics.llmTime}ms (${(kpiMetrics.llmTime / 1000).toFixed(2)}s)`);
    console.log(`[KPI] Translation Time: ${kpiMetrics.translationTime}ms (${(kpiMetrics.translationTime / 1000).toFixed(2)}s)`);
    console.log(`[KPI] Model Used: ${kpiMetrics.modelUsed}`);
    console.log(`[KPI] User Language: ${kpiMetrics.userLanguage}`);
    console.log(`[KPI] Input Tokens (estimated): ${kpiMetrics.inputTokens}`);
    console.log(`[KPI] Output Tokens (estimated): ${kpiMetrics.outputTokens}`);
    console.log(`[KPI] Total Tokens (estimated): ${kpiMetrics.inputTokens + kpiMetrics.outputTokens}`);
    console.log(`[KPI] Files Uploaded: ${kpiMetrics.fileCount}`);
    console.log(`[KPI] Response Length: ${kpiMetrics.responseLength} characters`);
    console.log(`[KPI] English Length: ${kpiMetrics.englishLength} characters`);
    console.log(`[KPI] Japanese Length: ${kpiMetrics.japaneseLength} characters`);
    console.log(`[KPI] Tokens per Second: ${kpiMetrics.outputTokens > 0 ? ((kpiMetrics.outputTokens / (kpiMetrics.llmTime / 1000)).toFixed(2)) : 'N/A'}`);
    console.log(`[KPI] ===========================================\n`);

    await put<IGenTaskOutputSer>(
      KrdGenTaskOutput,
      { id: outputId },
      {
        content,
        status: finalStatus,
        update_by: 'JOB',
      },
    );

    console.log(`\n========== [CHAT PROCESS] Completed ==========`);
    console.log(`[CHAT PROCESS] Final status: ${finalStatus}`);
    console.log(`[CHAT PROCESS] Output ID: ${outputId}, Content length: ${content.length}`);
    console.log(`[CHAT PROCESS] Total processing time: ${kpiMetrics.totalTime}ms`);
    console.log(`[CHAT PROCESS] ===========================================\n`);

    return { outputId, isOk, content };
  };

  await execute(type, taskId, callAviary);
};

export default chatGenProcess;
