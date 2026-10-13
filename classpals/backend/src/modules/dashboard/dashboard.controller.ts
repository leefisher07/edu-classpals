import { Controller, Get, Param, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('classes/:classId/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  getOverview(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
  ) {
    return this.dashboardService.getClassOverview(userId, classId);
  }

  @Get('ranking/students')
  getStudentRanking(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
    @Query('period') period?: 'total' | 'week' | 'month' | 'custom',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getStudentRanking(
      userId,
      classId,
      period,
      startDate,
      endDate,
    );
  }

  @Get('ranking/groups')
  getGroupRanking(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
    @Query('period') period?: 'total' | 'week' | 'month' | 'custom',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getGroupRanking(
      userId,
      classId,
      period,
      startDate,
      endDate,
    );
  }

  @Get('trend')
  getPointsTrend(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
    @Query('days') days?: string,
  ) {
    const daysNum = days === '30' ? 30 : 7;
    return this.dashboardService.getPointsTrend(userId, classId, daysNum);
  }

  @Get('distribution')
  getDistribution(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
  ) {
    return this.dashboardService.getPointsDistribution(userId, classId);
  }
}
