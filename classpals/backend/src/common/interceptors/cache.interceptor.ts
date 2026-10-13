import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../services/redis.service';
import { CACHE_KEY, CACHE_TTL } from '../decorators/cache.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly redisService: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const cacheKey = this.reflector.get<string>(
      CACHE_KEY,
      context.getHandler(),
    );
    const cacheTTL = this.reflector.get<number>(
      CACHE_TTL,
      context.getHandler(),
    );

    if (!cacheKey) {
      return next.handle();
    }

    // 解析缓存键中的参数占位符
    const request = context.switchToHttp().getRequest();
    const resolvedKey = this.resolveCacheKey(cacheKey, request);

    // 尝试从缓存获取
    const cachedData = await this.redisService.get(resolvedKey);
    if (cachedData !== null) {
      console.log(`✅ 缓存命中: ${resolvedKey}`);
      return of(cachedData);
    }

    console.log(`❌ 缓存未命中: ${resolvedKey}`);

    // 执行方法并缓存结果
    return next.handle().pipe(
      tap(async (data) => {
        await this.redisService.set(resolvedKey, data, cacheTTL);
        console.log(`💾 已缓存: ${resolvedKey} (TTL: ${cacheTTL}s)`);
      }),
    );
  }

  /**
   * 解析缓存键中的占位符
   * 例如: 'user:{id}' + params.id='123' => 'user:123'
   */
  private resolveCacheKey(template: string, request: any): string {
    let key = template;

    // 替换路径参数 {id}
    if (request.params) {
      Object.keys(request.params).forEach((param) => {
        key = key.replace(`{${param}}`, request.params[param]);
      });
    }

    // 替换查询参数 {query.xxx}
    if (request.query) {
      Object.keys(request.query).forEach((param) => {
        key = key.replace(`{query.${param}}`, request.query[param]);
      });
    }

    // 替换用户ID {userId}
    if (request.user?.id) {
      key = key.replace('{userId}', request.user.id);
    }

    return key;
  }
}
