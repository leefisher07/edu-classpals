import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { RulesService } from './rules.service';
import {
  CreateRuleDto,
  UpdateRuleDto,
  UpdateRuleSortDto,
} from './dto/rule.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('classes/:classId/rules')
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
    @Body() dto: CreateRuleDto,
  ) {
    return this.rulesService.create(userId, classId, dto);
  }

  @Get()
  findAll(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
  ) {
    return this.rulesService.findAll(userId, classId);
  }

  @Patch('sort')
  updateSort(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
    @Body() dto: UpdateRuleSortDto,
  ) {
    return this.rulesService.updateSort(userId, classId, dto);
  }
}

@Controller('rules')
export class RuleController {
  constructor(private readonly rulesService: RulesService) {}

  @Get(':id')
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.rulesService.findOne(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRuleDto,
  ) {
    return this.rulesService.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.rulesService.remove(userId, id);
  }

  @Post(':id/toggle')
  toggleEnabled(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.rulesService.toggleEnabled(userId, id);
  }
}
