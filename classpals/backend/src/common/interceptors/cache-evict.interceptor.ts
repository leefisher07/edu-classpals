import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../services/redis.service';

@Injectable()
export class CacheEvictInterceptor implements NestInterceptor {
  constructor(
    private readonly redisService: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const patterns = this.reflector.get<string[]>(
      'cache_evict',
      context.getHandler(),
    );

    if (!patterns || patterns.length === 0) {
      return next.handle();
    }

    // 解析缓存键模式中的参数占位符
    const request = context.switchToHttp().getRequest();
    const resolvedPatterns = patterns.map((pattern) =>
      this.resolveCachePattern(pattern, request),
    );

    // 执行方法后清除缓存
    return next.handle().pipe(
      tap(async () => {
        for (const pattern of resolvedPatterns) {
          const deletedCount = await this.redisService.delPattern(pattern);
          console.log(`🗑️  已清除缓存: ${pattern} (${deletedCount} keys)`);
        }
      }),
    );
  }

  /**
   * 解析缓存键模式中的占位符
   */
  private resolveCachePattern(template: string, request: any): string {
    let pattern = template;

    // 替换路径参数 {id}
    if (request.params) {
      Object.keys(request.params).forEach((param) => {
        pattern = pattern.replace(`{${param}}`, request.params[param]);
      });
    }

    // 替换查询参数 {query.xxx}
    if (request.query) {
      Object.keys(request.query).forEach((param) => {
        pattern = pattern.replace(`{query.${param}}`, request.query[param]);
      });
    }

    // 替换用户ID {userId}
    if (request.user?.id) {
      pattern = pattern.replace('{userId}', request.user.id);
    }

    return pattern;
  }
}
