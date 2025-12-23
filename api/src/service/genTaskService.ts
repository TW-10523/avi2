import { addChatGenTask, addSummaryGenTask, addTranslateGenTask, addFileUploadTask } from '@/queue/queue';
import { add, put } from '@/utils/mapper';
import { formatHumpLineTransfer } from '@/utils';
import KrdGenTask from '@/mysql/model/gen_task.model';
import KrdGenTaskOutput from '@/mysql/model/gen_task_output.model';
import { IGenTask, IGenTaskSer } from '@/types/genTask';
import { IGenTaskOutputSer } from '@/types/genTaskOutput';
import { nanoid } from 'nanoid';
import { ITranslateTaskFormData, translateTask } from '@/service/translateTask';
import { chatTask, IChatTaskFormData } from '../service/chatTask';
import { ISummaryTaskFormData, summaryTask } from '../service/summaryTask';
import { fileUploadTask, IFileUploadTaskFormData } from '../service/fileUploadTask';

export type PrepareOutput = {
  sort?: number;
  metadata?: string;
  errorMsg?: string;
};

type GenTaskResponse = {
  taskId: string;
  task?: {
    status: string;
    createdAt: string;
    id: string;
    createBy: string;
  };
};

const enqueue = async (type: string, taskId: string) => {
  switch (type) {
    case 'CHAT':
      await addChatGenTask(taskId);
      break;
    case 'SUMMARY':
      await addSummaryGenTask(taskId);
      break;
    case 'TRANSLATE':
      await addTranslateGenTask(taskId);
      break;
    case 'FILEUPLOAD':
      await addFileUploadTask(taskId);
      break;
    default:
  }
};

export const handleAddGenTask = async (
  addContent: IGenTask,
  userName: string,
): Promise<GenTaskResponse> => {
  let taskId = nanoid();
  const addTaskContent = {
    ...addContent,
    id: taskId,
    createBy: userName,
    updateBy: userName,
    status: 'WAIT',
  };

  let outputs: PrepareOutput[] = [];
  let needUpdate = false;
  let isExplainTask = false;
  // Changed to prevent resetting the form_data in the chat.
  let isLongTextGenTask = true;
  let refTaskId: string | undefined;

  switch (addContent.type) {
    case 'CHAT':
      if (Object.keys(addContent.formData).length !== 0) {
        outputs = await chatTask(addContent.formData as IChatTaskFormData);
        refTaskId = (addContent.formData as IChatTaskFormData).taskId;
        if (refTaskId) {
          taskId = refTaskId;
          needUpdate = true;
        }
      }
      break;
    case 'SUMMARY':
      if (Object.keys(addContent.formData).length !== 0) {
        outputs = await summaryTask(addContent.formData as ISummaryTaskFormData);
      }
      break;
    case 'TRANSLATE':
      if (Object.keys(addContent.formData).length !== 0) {
        outputs = await translateTask(addContent.formData as ITranslateTaskFormData);
      }
      break;
    case 'FILEUPLOAD':
      if (Object.keys(addContent.formData).length !== 0) {
        outputs = await fileUploadTask(addContent.formData as IFileUploadTaskFormData);
      }
      break;
    default:
  }

  let task: IGenTaskSer | undefined;

  if (needUpdate && !isLongTextGenTask) {
    await put<IGenTaskSer>(KrdGenTask, { id: taskId }, { status: 'WAIT', form_data: '新しい会話' });
  } else if (isExplainTask || (isLongTextGenTask && needUpdate)) {
    await put<IGenTaskSer>(KrdGenTask, { id: taskId }, { status: 'WAIT' });
  } else {
    let newAddTaskContent: IGenTaskSer;

    try {
      if (addTaskContent.formData) {
        newAddTaskContent = {
          ...(formatHumpLineTransfer(addTaskContent, 'line') as IGenTaskSer),
          form_data:
            addContent.type === 'CHAT'
              ? '新しい会話'
              : JSON.stringify(addTaskContent.formData),
        };
      }

      if (addContent.type === 'CHAT' && Object.keys(addContent.formData).length === 0) {
        newAddTaskContent = {
          ...(formatHumpLineTransfer(addTaskContent, 'line') as IGenTaskSer),
          form_data: 'NEW CHAT',
          status: 'EMPTY',
        } as IGenTaskSer;
      }
    } catch (e) {
      newAddTaskContent = {
        ...addTaskContent,
        create_by: userName,
        update_by: userName,
        form_data:
          addContent.type === 'CHAT'
            ? '新しい会話'
            : JSON.stringify(addTaskContent.formData),
      } as unknown as IGenTaskSer;
    }

    task = await add<IGenTaskSer>(KrdGenTask, newAddTaskContent);

    if (addContent.type === 'CHAT' && Object.keys(addContent.formData).length === 0) {
      return {
        taskId,
        task: task
          ? {
            status: task.status,
            createdAt: (task.created_at as unknown as Date).toLocaleString('ja', { timeZone: 'Asia/Tokyo' }),
            id: taskId,
            createBy: task.create_by,
          }
          : undefined,
      };
    }
  }

  const results: Promise<IGenTaskOutputSer>[] = [];
  for (const output of outputs) {
    const addTaskOutputContent = {
      taskId,
      metadata: output.metadata,
      status: 'WAIT',
      sort: output.sort,
      createBy: userName,
      updateBy: userName,
    };
    const newAddTaskOutputContent =
      formatHumpLineTransfer(addTaskOutputContent, 'line') as IGenTaskOutputSer;
    results.push(add<IGenTaskOutputSer>(KrdGenTaskOutput, newAddTaskOutputContent));
  }
  await Promise.all(results);

  enqueue(addContent.type, taskId);

  return {
    taskId,
    task: task
      ? {
        status: task.status,
        createdAt: (task.created_at as unknown as Date).toLocaleString('ja', { timeZone: 'Asia/Tokyo' }),
        id: taskId,
        createBy: task.create_by,
      }
      : undefined,
  };
};