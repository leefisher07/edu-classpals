import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join, resolve } from 'path';
import { existsSync } from 'fs';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config({ path: join(process.cwd(), '.env') });

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');
  const uploadsRoot = join(process.cwd(), 'uploads');
  const petImagesDir = process.env.PET_IMAGES_DIR
    ? resolve(process.env.PET_IMAGES_DIR)
    : join(uploadsRoot, 'pets');

  // 启用 CORS
  app.enableCors({
    origin: ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
  });

  // 设置全局前缀
  app.setGlobalPrefix('api');

  // 配置静态文件服务
  app.use('/uploads/pets', express.static(petImagesDir));
  app.use('/uploads/avatars', express.static(join(uploadsRoot, 'avatars')));
  app.use('/uploads/shop', express.static(join(uploadsRoot, 'shop')));

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}/api`);
  logger.log(`📁 Upload root: ${uploadsRoot}`);
  logger.log(
    `🐾 Pet images served from: ${petImagesDir} (${existsSync(petImagesDir) ? 'exists' : 'missing'})`,
  );
}
bootstrap();
