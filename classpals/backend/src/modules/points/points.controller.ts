import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { PointsService } from './points.service';
import { AddPointsDto, BatchPointsDto } from './dto/points.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CacheEvict } from '../../common/decorators/cache.decorator';
import { CacheEvictInterceptor } from '../../common/interceptors/cache-evict.interceptor';

@Controller('students/:studentId/points')
@UseInterceptors(CacheEvictInterceptor)
export class StudentPointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Post()
  @CacheEvict('dashboard:*')
  addPoints(
    @CurrentUser('id') userId: string,
    @CurrentUser('username') username: string,
    @Param('studentId') studentId: string,
    @Body() dto: AddPointsDto,
  ) {
    return this.pointsService.addPoints(
      userId,
      studentId,
      dto,
      username || '教师',
    );
  }

  @Post('quick')
  @CacheEvict('dashboard:*')
  quickAddPoint(
    @CurrentUser('id') userId: string,
    @CurrentUser('username') username: string,
    @Param('studentId') studentId: string,
  ) {
    return this.pointsService.quickAddPoint(
      userId,
      studentId,
      username || '教师',
    );
  }

  @Get('history')
  getHistory(
    @CurrentUser('id') userId: string,
    @Param('studentId') studentId: string,
    @Query() query: { page?: string; limit?: string },
  ) {
    return this.pointsService.getHistory(userId, studentId, query);
  }
}

@Controller('classes/:classId/points')
@UseInterceptors(CacheEvictInterceptor)
export class ClassPointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Post('batch')
  @CacheEvict('dashboard:*')
  batchPoints(
    @CurrentUser('id') userId: string,
    @CurrentUser('username') username: string,
    @Param('classId') classId: string,
    @Body() dto: BatchPointsDto,
  ) {
    return this.pointsService.batchPoints(
      userId,
      classId,
      dto,
      username || '教师',
    );
  }

  @Get('records')
  getClassRecords(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
    @Query()
    query: {
      studentName?: string;
      startDate?: string;
      endDate?: string;
      type?: 'all' | 'add' | 'deduct';
      page?: string;
      limit?: string;
    },
  ) {
    return this.pointsService.getClassRecords(userId, classId, query);
  }
}

@Controller('points/records')
@UseInterceptors(CacheEvictInterceptor)
export class PointRecordsController {
  constructor(private readonly pointsService: PointsService) {}

  @Delete(':id')
  @CacheEvict('dashboard:*')
  revokeRecord(
    @CurrentUser('id') userId: string,
    @CurrentUser('username') username: string,
    @Param('id') id: string,
  ) {
    return this.pointsService.revokeRecord(userId, id, username || '教师');
  }
}
