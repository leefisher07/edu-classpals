import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY = 'cache_key';
export const CACHE_TTL = 'cache_ttl';

/**
 * 缓存装饰器
 * @param key 缓存键（支持参数占位符，如 'user:{id}'）
 * @param ttl 过期时间（秒）
 */
export const Cacheable = (key: string, ttl: number = 300) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY, key)(target, propertyKey, descriptor);
    SetMetadata(CACHE_TTL, ttl)(target, propertyKey, descriptor);
    return descriptor;
  };
};

/**
 * 缓存失效装饰器
 * @param patterns 要删除的缓存键模式数组
 */
export const CacheEvict = (...patterns: string[]) => {
  return SetMetadata('cache_evict', patterns);
};
