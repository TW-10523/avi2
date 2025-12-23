/**
 * Health Check Service - Monitor system health and dependencies
 */
import { solrService } from './solrService';
import { llmService } from './llmService';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: ServiceHealth;
    solr: ServiceHealth;
    llm: ServiceHealth;
    redis: ServiceHealth;
  };
  metrics: {
    memoryUsage: number;
    cpuUsage?: number;
    activeConnections?: number;
  };
}

export interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  lastCheck: string;
  error?: string;
}

const startTime = Date.now();

class HealthCheckService {
  private lastCheck: HealthStatus | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  /**
   * Get current health status
   */
  async getHealth(): Promise<HealthStatus> {
    const [database, solr, llm, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkSolr(),
      this.checkLLM(),
      this.checkRedis(),
    ]);

    const services = { database, solr, llm, redis };
    const allUp = Object.values(services).every(s => s.status === 'up');
    const anyDown = Object.values(services).some(s => s.status === 'down');

    const status: HealthStatus = {
      status: allUp ? 'healthy' : anyDown ? 'unhealthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      version: process.env.APP_VERSION || '1.0.0',
      services,
      metrics: {
        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    };

    this.lastCheck = status;
    return status;
  }

  /**
   * Quick health check (uses cached result if recent)
   */
  async getQuickHealth(): Promise<{ status: string; uptime: number }> {
    if (this.lastCheck && Date.now() - new Date(this.lastCheck.timestamp).getTime() < 30000) {
      return { status: this.lastCheck.status, uptime: this.lastCheck.uptime };
    }
    const health = await this.getHealth();
    return { status: health.status, uptime: health.uptime };
  }

  private async checkDatabase(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const sequelize = (await import('@/mysql/index')).default;
      await sequelize.authenticate();
      return {
        status: 'up',
        latency: Date.now() - start,
        lastCheck: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        status: 'down',
        lastCheck: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  private async checkSolr(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const isUp = await solrService.ping();
      return {
        status: isUp ? 'up' : 'down',
        latency: Date.now() - start,
        lastCheck: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        status: 'down',
        lastCheck: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  private async checkLLM(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const isUp = await llmService.ping();
      return {
        status: isUp ? 'up' : 'down',
        latency: Date.now() - start,
        lastCheck: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        status: 'down',
        lastCheck: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  private async checkRedis(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const Redis = (await import('ioredis')).default;
      const redis = new Redis({ maxRetriesPerRequest: 1 });
      await redis.ping();
      await redis.quit();
      return {
        status: 'up',
        latency: Date.now() - start,
        lastCheck: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        status: 'down',
        lastCheck: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * Start periodic health checks
   */
  startPeriodicChecks(intervalMs: number = 60000) {
    if (this.checkInterval) clearInterval(this.checkInterval);
    this.checkInterval = setInterval(() => this.getHealth(), intervalMs);
    console.log(`[HealthCheck] Started periodic checks every ${intervalMs / 1000}s`);
  }

  /**
   * Stop periodic health checks
   */
  stopPeriodicChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

export const healthCheckService = new HealthCheckService();
export default HealthCheckService;
