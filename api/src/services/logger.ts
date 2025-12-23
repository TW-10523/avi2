/**
 * Structured Logger - Enterprise logging with context and levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  requestId?: string;
  userId?: string;
  service?: string;
  action?: string;
  duration?: number;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private level: LogLevel = 'info';
  private context: LogContext = {};

  private readonly levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Set default context for all logs
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Create child logger with additional context
   */
  child(context: LogContext): Logger {
    const child = new Logger();
    child.level = this.level;
    child.context = { ...this.context, ...context };
    return child;
  }

  /**
   * Log methods
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log('error', message, context, error);
  }

  /**
   * Log with timing
   */
  time(label: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.info(`${label} completed`, { duration, label });
    };
  }

  /**
   * Log API request
   */
  request(method: string, path: string, context?: LogContext): void {
    this.info(`${method} ${path}`, { ...context, type: 'request' });
  }

  /**
   * Log API response
   */
  response(method: string, path: string, status: number, duration: number, context?: LogContext): void {
    const level: LogLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    this.log(level, `${method} ${path} ${status}`, { ...context, status, duration, type: 'response' });
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (this.levelPriority[level] < this.levelPriority[this.level]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...context },
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    // Format output
    const output = this.format(entry);

    // Output to console with colors
    switch (level) {
      case 'debug':
        console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        break;
    }
  }

  private format(entry: LogEntry): string {
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
      reset: '\x1b[0m',
    };

    const levelStr = `[${entry.level.toUpperCase()}]`.padEnd(7);
    const contextStr = entry.context && Object.keys(entry.context).length > 0
      ? ` ${JSON.stringify(entry.context)}`
      : '';
    const errorStr = entry.error
      ? `\n  Error: ${entry.error.message}`
      : '';

    return `${colors[entry.level]}${entry.timestamp} ${levelStr}${colors.reset} ${entry.message}${contextStr}${errorStr}`;
  }
}

// Export singleton
export const logger = new Logger();

// Set level from environment
if (process.env.LOG_LEVEL) {
  logger.setLevel(process.env.LOG_LEVEL as LogLevel);
}

export default Logger;
