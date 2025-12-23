/* eslint-disable object-curly-newline */
import Queue from 'bull';
import chatGenProcess from './chatGenProcess';
import summaryGenProcess from './summaryGenProcess';
import translateGenProcess from './translateGenProcess'
import fileUploadProcess from './fileUploadProcess';
import { config } from '@config/index';

const chatGenQueue = new Queue('chat', {
  redis: {
    port: config.Redis.port || 6379,
    host: config.Redis.host,
    password: config.Redis.password,
    db: 6,
  },
});

const summaryGenQueue = new Queue('summary', {
  redis: {
    port: config.Redis.port || 6379,
    host: config.Redis.host,
    password: config.Redis.password,
    db: 6,
  },
});

const translateGenQueue = new Queue('translate', {
  redis: {
    port: config.Redis.port || 6379,
    host: config.Redis.host,
    password: config.Redis.password,
    db: 6,
  },
});

const fileUploadQueue = new Queue('fileUpload', {
  redis: {
    port: config.Redis.port || 6379,
    host: config.Redis.host,
    password: config.Redis.password,
    db: 6,
  },
});

const addChatGenTask = async (taskId: string) => {
  await chatGenQueue.add({ taskId });
};

const addSummaryGenTask = async (taskId: string) => {
  await summaryGenQueue.add({ taskId, type: 'SUMMARY' });
};

const addTranslateGenTask = async (taskId: string) => {
  await translateGenQueue.add({ taskId, type: 'TRANSLATE' });
};

const addFileUploadTask = async (taskId: string) => {
  await fileUploadQueue.add({ taskId, type: 'FILEUPLOAD' });
};

chatGenQueue.process(chatGenProcess);
summaryGenQueue.process(summaryGenProcess);
translateGenQueue.process(translateGenProcess);
fileUploadQueue.process(fileUploadProcess);

export { addChatGenTask, addSummaryGenTask, addTranslateGenTask, addFileUploadTask };
