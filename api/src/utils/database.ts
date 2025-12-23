/**
 * Production-grade Database Utilities
 * Transaction handling, consistency, and CAP theorem considerations
 */
import { Sequelize, Transaction, Op } from 'sequelize';
import { databaseError, logError } from './errors';

// Get sequelize instance from the app
let sequelizeInstance: Sequelize | null = null;

export function setSequelizeInstance(instance: Sequelize) {
  sequelizeInstance = instance;
}

export function getSequelizeInstance(): Sequelize {
  if (!sequelizeInstance) {
    throw new Error('Sequelize instance not initialized');
  }
  return sequelizeInstance;
}

/**
 * Execute operation within a transaction
 * Ensures ACID properties for database operations
 * 
 * CAP Theorem Consideration:
 * - We prioritize Consistency over Availability
 * - Transactions ensure data consistency
 * - If transaction fails, we rollback to maintain consistency
 */
export async function withTransaction<T>(
  operation: (t: Transaction) => Promise<T>,
  options?: { isolationLevel?: Transaction.ISOLATION_LEVELS }
): Promise<T> {
  const sequelize = getSequelizeInstance();
  const transaction = await sequelize.transaction({
    isolationLevel: options?.isolationLevel || Transaction.ISOLATION_LEVELS.READ_COMMITTED,
  });

  try {
    const result = await operation(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    logError(error as Error, { operation: 'transaction' });
    throw error;
  }
}

/**
 * Retry operation with exponential backoff
 * Handles transient failures (network issues, locks)
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 100
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is retryable
      const isRetryable = isRetryableError(error);
      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 100;
      console.log(`[DB] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  // Deadlock errors
  if (error?.parent?.code === 'ER_LOCK_DEADLOCK') return true;
  // Lock wait timeout
  if (error?.parent?.code === 'ER_LOCK_WAIT_TIMEOUT') return true;
  // Connection errors
  if (error?.name === 'SequelizeConnectionError') return true;
  // Timeout errors
  if (error?.name === 'SequelizeTimeoutError') return true;
  return false;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Optimistic locking update
 * Prevents lost updates in concurrent scenarios
 */
export async function optimisticUpdate<T extends { version?: number }>(
  model: any,
  id: string | number,
  updates: Partial<T>,
  expectedVersion: number
): Promise<{ success: boolean; data?: T; conflict?: boolean }> {
  const [affectedCount, affectedRows] = await model.update(
    { ...updates, version: expectedVersion + 1 },
    {
      where: {
        id,
        version: expectedVersion,
      },
      returning: true,
    }
  );

  if (affectedCount === 0) {
    // Check if record exists
    const existing = await model.findByPk(id);
    if (!existing) {
      return { success: false, conflict: false }; // Not found
    }
    return { success: false, conflict: true }; // Version conflict
  }

  return { success: true, data: affectedRows[0] };
}

/**
 * Idempotent operation wrapper
 * Ensures same operation produces same result
 */
const idempotencyStore = new Map<string, { result: any; timestamp: number }>();
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function withIdempotency<T>(
  key: string,
  operation: () => Promise<T>
): Promise<T> {
  // Check if we've seen this key before
  const cached = idempotencyStore.get(key);
  if (cached && Date.now() - cached.timestamp < IDEMPOTENCY_TTL) {
    console.log(`[Idempotency] Returning cached result for key: ${key}`);
    return cached.result;
  }

  // Execute operation
  const result = await operation();

  // Store result
  idempotencyStore.set(key, { result, timestamp: Date.now() });

  return result;
}

// Clean up old idempotency entries
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of idempotencyStore.entries()) {
    if (now - value.timestamp > IDEMPOTENCY_TTL) {
      idempotencyStore.delete(key);
    }
  }
}, 60 * 60 * 1000); // Every hour

/**
 * Batch operations for efficiency
 */
export async function batchInsert<T>(
  model: any,
  records: T[],
  batchSize: number = 100
): Promise<number> {
  let inserted = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const result = await model.bulkCreate(batch, {
      ignoreDuplicates: true,
    });
    inserted += result.length;
  }

  return inserted;
}

/**
 * Safe query with timeout
 */
export async function safeQuery<T>(
  queryFn: () => Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return Promise.race([
    queryFn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
    ),
  ]);
}

/**
 * Health check for database
 */
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
  const start = Date.now();
  try {
    const sequelize = getSequelizeInstance();
    await sequelize.authenticate();
    return { healthy: true, latency: Date.now() - start };
  } catch (error) {
    return { healthy: false, error: (error as Error).message };
  }
}
