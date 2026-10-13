import { Module } from '@nestjs/common';
import { PointsService } from './points.service';
import {
  StudentPointsController,
  ClassPointsController,
  PointRecordsController,
} from './points.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PetsModule } from '../pets/pets.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { CacheEvictInterceptor } from '../../common/interceptors/cache-evict.interceptor';

@Module({
  imports: [PrismaModule, PetsModule, DashboardModule],
  controllers: [
    StudentPointsController,
    ClassPointsController,
    PointRecordsController,
  ],
  providers: [PointsService, CacheEvictInterceptor],
  exports: [PointsService],
})
export class PointsModule {}
