import IndexCon from '@/controller';
import { usePermission } from '@/controller/auth';
import { formatHandle } from '@/controller/common';
import {
  deleteTaskOutputMid,
  getAddMid,
  getChatTitleMid,
  getListMid,
  getOutputListMid,
  reNameTaskOutputMid,
  stopTaskOutputMid,
  updateTaskOutputMid,
  sendFeedbackToCache,
} from '@/controller/genTask';
import { addEditSchema } from '@/schemas';
import PERMISSIONS from '@/utils/permissions';
import Joi from 'joi';
import Router from 'koa-router';

const router = new Router({ prefix: '/api' });

router.post(
  '/gen-task',
  addEditSchema(
    Joi.object({
      type: Joi.string().valid('CHAT', 'SUMMARY', 'TRANSLATE', 'FILEUPLOAD').required(),
      formData: Joi.object().required(),
    }),
  ),
  getAddMid,
  IndexCon(),
);

router.get('/gen-task/list', getListMid, formatHandle, IndexCon());

router.get('/gen-task-output/list', getOutputListMid, formatHandle, IndexCon());

router.put('/gen-task-output/:taskOutputId', updateTaskOutputMid, IndexCon());

router.put('/gen-task-output/rename/:taskId', reNameTaskOutputMid, IndexCon());

router.delete('/gen-task-output/del/:taskId', deleteTaskOutputMid, IndexCon());

router.put('/gen-task-output/stop/:fieldSort', stopTaskOutputMid, IndexCon());

router.get('/gen-task/getChatTitle', getChatTitleMid, IndexCon());

router.post(
  '/gen-task/feedback',
  addEditSchema(
    Joi.object({
      taskOutputId: Joi.number().required(),
      cache_signal: Joi.number().valid(0, 1).required(),
      query: Joi.string().required(),
      answer: Joi.string().required(),
    }),
  ),
  sendFeedbackToCache,
  formatHandle,
  IndexCon(),
);

export default router;
