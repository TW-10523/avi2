import { PrepareOutput } from '@/service/genTaskService';
import Joi from 'joi';

interface IChatTaskFormData {
  prompt: string;
  fieldSort: number;
  taskId?: string;
  fileId: number[];
  allFileSearch: boolean;
  useMcp: boolean;
  processingPath?: string;
  detectedLanguage?: string;
  ragTriggered?: boolean;
  dualLanguageEnabled?: boolean;
  originalQuery?: string;
  queryForRAG?: string;
  usedFileIds?: number[];
}

const chatTask = async (formData: IChatTaskFormData) => {
  const judge =
    formData.fieldSort >= 1
      ? Joi.object({
          prompt: Joi.string().required(),
          fieldSort: Joi.number().required(),
          taskId: Joi.string().required(),
          fileId: Joi.array().items(Joi.number()).required(),
          allFileSearch: Joi.boolean().required(),
          useMcp: Joi.boolean().required(),
          processingPath: Joi.string().optional(),
          detectedLanguage: Joi.string().optional(),
          ragTriggered: Joi.boolean().optional(),
          dualLanguageEnabled: Joi.boolean().optional(),
          originalQuery: Joi.string().optional(),
          queryForRAG: Joi.string().optional(),
          usedFileIds: Joi.array().items(Joi.number()).optional(),
        }).unknown(true)
      : Joi.object({
          prompt: Joi.string().allow('').required(),
          fieldSort: Joi.number().required(),
          taskId: Joi.string().required(),
          fileId: Joi.array().items(Joi.number()).required(),
          allFileSearch: Joi.boolean().required(),
          useMcp: Joi.boolean().required(),
          processingPath: Joi.string().optional(),
          detectedLanguage: Joi.string().optional(),
          ragTriggered: Joi.boolean().optional(),
          dualLanguageEnabled: Joi.boolean().optional(),
          originalQuery: Joi.string().optional(),
          queryForRAG: Joi.string().optional(),
          usedFileIds: Joi.array().items(Joi.number()).optional(),
        }).unknown(true);
  await judge.validateAsync(formData);
  const data = JSON.stringify({
    prompt: formData.prompt,
    fileId: formData.fileId,
    allFileSearch: formData.allFileSearch,
    useMcp: formData.useMcp,
  });
  return [{ metadata: data, sort: formData.fieldSort } as PrepareOutput];
};

export { chatTask, IChatTaskFormData };
