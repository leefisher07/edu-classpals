import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ToolsService } from './tools.service';
import { RandomPickDto } from './dto/tools.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('classes/:classId/tools')
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Post('random-pick')
  randomPick(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
    @Body() dto: RandomPickDto,
  ) {
    return this.toolsService.randomPick(userId, classId, dto);
  }

  @Get('pick-history')
  getPickHistory(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
  ) {
    return this.toolsService.getPickHistory(userId, classId);
  }
}
