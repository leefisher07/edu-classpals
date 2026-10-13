import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import {
  CreateGroupDto,
  UpdateGroupDto,
  UpdateGroupSortDto,
  ManageMembersDto,
  RandomGroupDto,
  SetLeaderDto,
} from './dto/group.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('classes/:classId/groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
    @Body() dto: CreateGroupDto,
  ) {
    return this.groupsService.create(userId, classId, dto);
  }

  @Get()
  findAll(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
  ) {
    return this.groupsService.findAll(userId, classId);
  }

  @Patch('sort')
  updateSort(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
    @Body() dto: UpdateGroupSortDto,
  ) {
    return this.groupsService.updateSort(userId, classId, dto);
  }

  @Post('random')
  randomGroup(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
    @Body() dto: RandomGroupDto,
  ) {
    return this.groupsService.randomGroup(userId, classId, dto);
  }
}

@Controller('groups')
export class GroupController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get(':id')
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.groupsService.findOne(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.groupsService.remove(userId, id);
  }

  @Post(':id/members')
  addMembers(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ManageMembersDto,
  ) {
    return this.groupsService.addMembers(userId, id, dto);
  }

  @Patch(':id/leader')
  setLeader(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: SetLeaderDto,
  ) {
    return this.groupsService.setLeader(userId, id, dto);
  }

  @Delete(':id/members')
  removeMembers(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ManageMembersDto,
  ) {
    return this.groupsService.removeMembers(userId, id, dto);
  }
}
