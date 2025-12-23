/**
 * Production-grade Middleware
 * Rate limiting, request logging, validation
 */
import { Context, Next } from 'koa';
import { checkRateLimit, sanitizeObject } from '../utils/validation';
import { rateLimitError, logError, ApiError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request ID middleware - adds unique ID to each request for tracing
 */
export const requestIdMiddleware = async (ctx: Context, next: Next) => {
  const requestId = uuidv4();
  ctx.state.requestId = requestId;
  ctx.set('X-Request-ID', requestId);
  await next();
};

/**
 * Request logging middleware - logs all requests for audit
 */
export const requestLoggingMiddleware = async (ctx: Context, next: Next) => {
  const start = Date.now();
  const requestId = ctx.state.requestId || 'unknown';
  
  // Log request
  console.log(`[REQ] ${requestId} ${ctx.method} ${ctx.url} - IP: ${ctx.ip}`);
  
  try {
    await next();
  } finally {
    // Log response
    const duration = Date.now() - start;
    const status = ctx.status;
    console.log(`[RES] ${requestId} ${ctx.method} ${ctx.url} - ${status} - ${duration}ms`);
  }
};

/**
 * Rate limiting middleware
 * Protects against abuse and ensures fair usage
 */
export const rateLimitMiddleware = (
  maxRequests: number = 100,
  windowMs: number = 60000
) => async (ctx: Context, next: Next) => {
  // Use IP + user ID for rate limiting key
  const userId = ctx.state.user?.userId || 'anonymous';
  const key = `${ctx.ip}:${userId}`;
  
  const result = checkRateLimit(key, maxRequests, windowMs);
  
  // Set rate limit headers
  ctx.set('X-RateLimit-Limit', String(maxRequests));
  ctx.set('X-RateLimit-Remaining', String(result.remaining));
  ctx.set('X-RateLimit-Reset', String(Math.ceil(result.resetIn / 1000)));
  
  if (!result.allowed) {
    ctx.status = 429;
    ctx.body = rateLimitError(result.resetIn);
    return;
  }
  
  await next();
};

/**
 * Input sanitization middleware
 * Sanitizes request body and query params to prevent XSS
 */
export const sanitizationMiddleware = async (ctx: Context, next: Next) => {
  // Sanitize query params
  if (ctx.query && typeof ctx.query === 'object') {
    ctx.query = sanitizeObject(ctx.query);
  }
  
  // Sanitize request body
  if (ctx.request.body && typeof ctx.request.body === 'object') {
    ctx.request.body = sanitizeObject(ctx.request.body);
  }
  
  await next();
};

/**
 * Error handling middleware
 * Catches all errors and returns consistent error responses
 */
export const errorHandlingMiddleware = async (ctx: Context, next: Next) => {
  try {
    await next();
  } catch (err: any) {
    const error = err as Error | ApiError;
    
    // Log the error
    logError(error, {
      requestId: ctx.state.requestId,
      method: ctx.method,
      url: ctx.url,
      userId: ctx.state.user?.userId,
    });
    
    // Set response
    if (error instanceof ApiError) {
      ctx.status = error.httpCode;
      ctx.body = {
        code: error.httpCode,
        errorCode: error.errorCode,
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: ctx.state.requestId,
      };
    } else {
      // Generic error
      ctx.status = 500;
      ctx.body = {
        code: 500,
        errorCode: 'E500',
        message: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : error.message,
        timestamp: new Date().toISOString(),
        requestId: ctx.state.requestId,
      };
    }
  }
};

/**
 * Response time middleware
 * Adds response time header for monitoring
 */
export const responseTimeMiddleware = async (ctx: Context, next: Next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  ctx.set('X-Response-Time', `${duration}ms`);
};

/**
 * Security headers middleware
 * Adds security-related headers
 */
export const securityHeadersMiddleware = async (ctx: Context, next: Next) => {
  await next();
  
  // Security headers
  ctx.set('X-Content-Type-Options', 'nosniff');
  ctx.set('X-Frame-Options', 'DENY');
  ctx.set('X-XSS-Protection', '1; mode=block');
  ctx.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  ctx.set('Content-Security-Policy', "default-src 'self'");
};

/**
 * CORS middleware for production
 */
export const corsMiddleware = async (ctx: Context, next: Next) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:7001', 'http://localhost:7002'];
  const origin = ctx.get('Origin');
  
  if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
    ctx.set('Access-Control-Allow-Origin', origin);
    ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
    ctx.set('Access-Control-Allow-Credentials', 'true');
    ctx.set('Access-Control-Max-Age', '86400');
  }
  
  if (ctx.method === 'OPTIONS') {
    ctx.status = 204;
    return;
  }
  
  await next();
};
