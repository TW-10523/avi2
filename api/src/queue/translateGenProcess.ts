import File from '@/mysql/model/file.model';
import KrdGenTaskOutput from '@/mysql/model/gen_task_output.model';
import { IGenTaskOutputSer } from '@/types/genTaskOutput';
import dns from 'node:dns';
import { Op } from 'sequelize';
import { execute } from '@/service/task.dispatch';
import { put, queryList } from '@/utils/mapper';
import {getNextApiUrl} from "@/utils/redis";
import { config } from '@config/index';

dns.setDefaultResultOrder('ipv4first');

const callLLM = async (messages: any[], temperature = 0.5, outputId?: number): Promise<string> => {
  if (outputId) {
    const url = await getNextApiUrl('ollama');
    const response = await fetch(`${url.replace(/\/+$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stream: true, model: config.Ollama.model, messages, options: { temperature, repeat_penalty: 1.5 } }),
    });
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let content = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const [curOutput] = await queryList(KrdGenTaskOutput, { id: { [Op.eq]: outputId } });
      if (!curOutput) {
        console.error(`Output with ID ${outputId} not found.`);
        break;
      }
      if (curOutput.status === 'CANCEL') {
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
        if (!line.trim()) continue;
        try {
          const pkg = JSON.parse(line);
          const chunkText = pkg.message?.content || '';
          content += chunkText;

          await put<IGenTaskOutputSer>(
            KrdGenTaskOutput,
            { id: outputId },
            {
              content,
              status: 'PROCESSING',
              update_by: 'JOB',
            },
          );
        } catch {
        }
      }
    }
    if (buffer.trim()) {
      try {
        const pkg = JSON.parse(buffer);
        const chunkText = pkg.message?.content || '';
        content += chunkText;
      } catch { }
    }

    return content || '';
  } else {
    const url = await getNextApiUrl('ollama');
    const response = await fetch(`${url.replace(/\/+$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stream: false, model: config.Ollama.model, messages, options: { temperature } }),
    });
    const res = await response.json();
    return res.message?.content || '';
  }
};

const generateWithLLM = async (messages: any[], outputId: number) => {
  try {
    return await callLLM(messages, 0.1, outputId);
  } catch (error) {
    console.error('LLM 呼び出し失敗:', error);
    return 'error happen';
  }
};

const translateGenProcess = async (job) => {
  const { taskId } = job.data;
  const type = 'TRANSLATE';

  const callAviary = async (outputId: number, metadata: string) => {
    const outputs = await queryList(KrdGenTaskOutput, {
      task_id: { [Op.eq]: taskId },
      status: { [Op.ne]: 'IN_PROCESS' },
    });

    const data = JSON.parse(metadata);

    let content = '';
    let isOk = true;

    const messages = [
      { role: 'system', content: `あなたはユーザーが提供する文章を指定された言語に翻訳する専門アシスタントです。  
翻訳は以下の指針に従ってください :
- 原文の意味を正確に伝えること
- 自然で流暢な表現を使うこと
- 専門用語や固有名詞は適切に処理すること
- 文化的なニュアンスを考慮すること
- 指示された言語に忠実に翻訳すること
ユーザーの入力を読み取り、指定された言語への最適な翻訳を生成してください。回答には、正確な翻訳のみを記載してください。`},
      { role: 'user', content: `以下の内容を${data.targetLang}に翻訳してください：
---
${data.sourceText}
---
以上はすべての内容です、${data.targetLang}で翻訳してください。` }
    ];
    content = await generateWithLLM(messages, outputId);
    isOk = content !== 'error happen';

    const [curOutput] = await queryList(KrdGenTaskOutput, { id: { [Op.eq]: outputId } });
    if (curOutput.status === 'CANCEL') return { outputId, isOk: false, content: '' };

    await put<IGenTaskOutputSer>(
      KrdGenTaskOutput,
      { id: outputId },
      {
        content,
        status: isOk ? 'FINISHED' : 'FAILED',
        update_by: 'JOB',
      },
    );

    return { outputId, isOk, content };
  };
  await execute(type, taskId, callAviary);
};

export default translateGenProcess;
