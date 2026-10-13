import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType | null = null;
  private isConnected = false;
  private readonly isDisabled =
    process.env.DISABLE_REDIS === 'true' ||
    process.env.NODE_ENV === 'development';

  async onModuleInit() {
    if (this.isDisabled) {
      console.log('ℹ️ Redis 已在当前环境禁用');
      return;
    }

    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('Redis连接失败，已达最大重试次数');
              return new Error('Redis连接失败');
            }
            return retries * 100;
          },
        },
      });

      this.client.on('error', (err) => {
        console.error('Redis错误:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('✅ Redis已连接');
        this.isConnected = true;
      });

      await this.client.connect();
    } catch (error) {
      console.error('Redis初始化失败:', error);
      this.isConnected = false;
      this.client = null;
    }
  }

  async onModuleDestroy() {
    if (this.client && this.isConnected) {
      await this.client.quit();
    }
  }

  /**
   * 获取缓存
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.isConnected) return null;

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Redis GET错误 [${key}]:`, error);
      return null;
    }
  }

  /**
   * 设置缓存
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;

    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setEx(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.error(`Redis SET错误 [${key}]:`, error);
      return false;
    }
  }

  /**
   * 删除缓存
   */
  async del(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`Redis DEL错误 [${key}]:`, error);
      return false;
    }
  }

  /**
   * 批量删除（通过模式匹配）
   */
  async delPattern(pattern: string): Promise<number> {
    if (!this.client || !this.isConnected) return 0;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;

      await this.client.del(keys);
      return keys.length;
    } catch (error) {
      console.error(`Redis DEL PATTERN错误 [${pattern}]:`, error);
      return 0;
    }
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXISTS错误 [${key}]:`, error);
      return false;
    }
  }

  /**
   * 设置过期时间
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;

    try {
      await this.client.expire(key, seconds);
      return true;
    } catch (error) {
      console.error(`Redis EXPIRE错误 [${key}]:`, error);
      return false;
    }
  }

  /**
   * 获取剩余过期时间
   */
  async ttl(key: string): Promise<number> {
    if (!this.client || !this.isConnected) return -1;

    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error(`Redis TTL错误 [${key}]:`, error);
      return -1;
    }
  }

  /**
   * 增加计数器
   */
  async incr(key: string): Promise<number> {
    if (!this.client || !this.isConnected) return 0;

    try {
      return await this.client.incr(key);
    } catch (error) {
      console.error(`Redis INCR错误 [${key}]:`, error);
      return 0;
    }
  }

  /**
   * 减少计数器
   */
  async decr(key: string): Promise<number> {
    if (!this.client || !this.isConnected) return 0;

    try {
      return await this.client.decr(key);
    } catch (error) {
      console.error(`Redis DECR错误 [${key}]:`, error);
      return 0;
    }
  }
}
