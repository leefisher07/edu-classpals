import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

@Injectable()
export class UploadRateLimitInterceptor implements NestInterceptor {
  private store: RateLimitStore = {};
  private readonly maxUploads = 20; // 每小时最多20次
  private readonly windowMs = 60 * 60 * 1000; // 1小时

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
    }

    const now = Date.now();
    const userKey = `upload:${userId}`;

    // 初始化或重置计数器
    if (!this.store[userKey] || now > this.store[userKey].resetTime) {
      this.store[userKey] = {
        count: 0,
        resetTime: now + this.windowMs,
      };
    }

    // 检查是否超过限制
    if (this.store[userKey].count >= this.maxUploads) {
      const resetIn = Math.ceil(
        (this.store[userKey].resetTime - now) / 1000 / 60,
      );
      throw new HttpException(
        `上传次数已达上限，请在 ${resetIn} 分钟后重试`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 增加计数
    this.store[userKey].count++;

    return next.handle();
  }

  // 清理过期数据（可选，防止内存泄漏）
  private cleanupExpiredEntries() {
    const now = Date.now();
    Object.keys(this.store).forEach((key) => {
      if (now > this.store[key].resetTime) {
        delete this.store[key];
      }
    });
  }
}
