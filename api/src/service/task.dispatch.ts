import KrdGenTask from '@/mysql/model/gen_task.model';
import KrdGenTaskOutput from '@/mysql/model/gen_task_output.model';
import { IGenTaskSer } from '@/types/genTask';
import { IGenTaskOutputSer } from '@/types/genTaskOutput';
import { put, queryById, queryList } from '@/utils/mapper';
import dayjs from 'dayjs';
import { Op } from 'sequelize';

type AviaryCallbackFunctionRes = {
  outputId: number;
  isOk: boolean;
  content?: string;
  error?: string;
};

type AviaryCallbackFunction = (outputId: number, metadata: string) => AviaryCallbackFunctionRes;

const execute = async (
  type: string,
  taskId: string,
  callback: (outputId: number, metadata: string) => Promise<AviaryCallbackFunctionRes>,
) => {
  console.log(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] job start, type: ${type}, taskId: ${taskId}`);

  let task = await queryById<IGenTaskSer>(KrdGenTask, { id: taskId });
  if (!task) {
    console.log(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] error happen, task [${taskId}] not exist!`);
  }
  if (task.status === 'CANCEL') {
    console.log(
      `[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] job end, type: ${type}, taskId: ${taskId}, task status is CANCEL1`,
    );
    return;
  }
  if (task.status !== 'WAIT') {
    console.log(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] stop! task [${taskId}] status is [${task.status}]`);
  }

  await put<IGenTaskSer>(KrdGenTask, { id: taskId }, { status: 'IN_PROCESS', update_by: 'JOB' });

  let outputs = await queryList(KrdGenTaskOutput, { task_id: taskId, status: 'WAIT' });

  if (type === 'QUESTION_GEN') {
    let flag = true;
    for (const output of outputs) {
      if (task.status === 'CANCEL') {
        console.log(
          `[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] job end, type: ${type}, taskId: ${taskId}, task status is CANCEL2`,
        );
        return;
      }

      // eslint-disable-next-line no-await-in-loop
      const curOutputs = await queryList(KrdGenTaskOutput, { id: { [Op.eq]: output.id } });
      const curOutput = curOutputs[0];

      if (curOutput.status === 'CANCEL') {
        console.log(
          `[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] type: ${type}, taskId: ${taskId}, outputId: ${output.id}, output status is CANCEL2`,
        );
      } else {
        // eslint-disable-next-line no-await-in-loop
        await put<IGenTaskOutputSer>(KrdGenTaskOutput, { id: output.id }, { status: 'IN_PROCESS', update_by: 'JOB' });
        // eslint-disable-next-line no-await-in-loop
        const result = await callback(output.id, output.metadata);
        if (!result.isOk) {
          flag = false;
        }
      }
    }

    task = await queryById<IGenTaskSer>(KrdGenTask, { id: taskId });

    if (task.status === 'CANCEL') {
      console.log(
        `[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] job end, type: ${type}, taskId: ${taskId}, task status is CANCEL2`,
      );
      return;
    }

    if (flag) {
      await put<IGenTaskSer>(KrdGenTask, { id: taskId }, { status: 'FINISHED', update_by: 'JOB' });
    } else {
      await put<IGenTaskSer>(KrdGenTask, { id: taskId }, { status: 'FAILED', update_by: 'JOB' });
    }
  } else {
    await Promise.all(
      outputs.map((output) =>
        put<IGenTaskOutputSer>(KrdGenTaskOutput, { id: output.id }, { status: 'IN_PROCESS', update_by: 'JOB' }),
      ),
    );

    outputs = await queryList(KrdGenTaskOutput, { task_id: taskId, status: 'IN_PROCESS' });

    await Promise.all(outputs.map((output) => callback(output.id, output.metadata))).then(async (values) => {
      let flag = true;

      for (const r of values) {
        if (!r.isOk) {
          flag = false;
          break;
        }
      }

      task = await queryById<IGenTaskSer>(KrdGenTask, { id: taskId });
      if (task.status === 'CANCEL') {
        console.log(
          `[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] job end, type: ${type}, taskId: ${taskId}, task status is CANCEL2`,
        );
        return;
      }
      if (flag) {
        await put<IGenTaskSer>(KrdGenTask, { id: taskId }, { status: 'FINISHED', update_by: 'JOB' });
      } else {
        await put<IGenTaskSer>(KrdGenTask, { id: taskId }, { status: 'FAILED', update_by: 'JOB' });
      }
    });
  }
  console.log(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] job end, type: ${type}, taskId: ${taskId}`);
};

export { AviaryCallbackFunction, AviaryCallbackFunctionRes, execute };
