import redis from '@/clients/redis';
import { config } from '@/config';
import { RouteType } from '@/types';
import { formatHumpLineTransfer } from '@/utils';
import dayjs from 'dayjs';

export const redisType = {
  set: 'set',
  sadd: 'sadd',
  expire: 'expire',
  smembers: 'smembers',
  srem: 'srem',
  del: 'del',
  get: 'get',
  mget: 'mget',
  info: 'info',
  keys: 'keys',
  type: 'type',
  exists: 'exists',
};

export const saveMenuMes = async (menus: RouteType[]) => {
  const res = formatHumpLineTransfer(menus);
  redis.set('menu_message', JSON.stringify(res));
  recordNum(redisType.set);
};

/* eslint-disable no-await-in-loop */
export const initializeZSet = async () => {
  // Normalize URLs (trim and remove trailing slashes)
  const urls = (config.Ollama.url || []).map(u => u.trim().replace(/\/+$/, ''));

  // Reset ZSET to avoid stale endpoints like http://localhost:11435 lingering
  try {
    await redis.del('ollama_api_weight_set');
    console.info(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] ♻️  既存の Ollama API ZSET をリセットしました (ollama_api_weight_set)`);
  } catch (e) {
    console.warn(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] ⚠️  ZSET リセットに失敗しましたが続行します:`, e);
  }

  for (const api of urls) {
    await redis.zadd('ollama_api_weight_set', 0, api);
    console.info(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] 🚀 Ollama API エンドポイントを初期化しました: ${api}`);
  }
};
/* eslint-disable no-await-in-loop */

export const getNextApiUrl = async (modelName: string) => {
  let key;
  if (modelName === 'ollama') {
    key = 'ollama_api_weight_set';
  }
  const result = await redis.zrange(key, 0, 0);
  if (result.length === 0) {
    throw new Error('No available API endpoint');
  }

  const api = result[0];

  await redis.zincrby(key, 1, api);

  return api;
};

export const updateUserInfo = async (key: string, ids: number[]) => {
  await redis.sadd(key, ids);
};

export const recordNum = async (type: string) => {
  redis.incr(type);
};

export const getSetsValue = async (key: string) => {
  recordNum(redisType.smembers);
  return (await redis.smembers(key)) as string[];
};

export const removeSetKeys = async (setName: string, keys: string[]) => {
  await redis.srem(setName, keys);
  recordNum(redisType.srem);
};

export const setKeyValue = async (key: string, value: string, expireIn: number) => {
  await redis.set(key, value);
  if (expireIn) {
    await redis.expire(key, expireIn);
  }
  recordNum(redisType.set);
};

export const getKeyValue = async (key: string) => {
  recordNum(redisType.get);
  return await redis.get(key);
};
