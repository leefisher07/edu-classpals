import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ShareService } from './share.service';
import {
  CreateShareLinkDto,
  UpdateShareLinkDto,
  VerifyParentDto,
} from './dto/share.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('students/:studentId/share')
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @Post()
  createLink(
    @CurrentUser('id') userId: string,
    @Param('studentId') studentId: string,
    @Body() dto: CreateShareLinkDto,
  ) {
    return this.shareService.createShareLink(userId, studentId, dto);
  }

  @Get()
  getLinks(
    @CurrentUser('id') userId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.shareService.getStudentShareLinks(userId, studentId);
  }
}

@Controller('share')
export class ShareLinkController {
  constructor(private readonly shareService: ShareService) {}

  @Patch(':id')
  updateLink(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateShareLinkDto,
  ) {
    return this.shareService.updateShareLink(userId, id, dto);
  }

  @Delete(':id')
  deleteLink(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.shareService.deleteShareLink(userId, id);
  }
}

@Controller('parent')
export class ParentController {
  constructor(private readonly shareService: ShareService) {}

  @Post(':token/verify')
  @Public()
  verifyParent(@Param('token') token: string, @Body() dto: VerifyParentDto) {
    return this.shareService.verifyParent(token, dto);
  }

  @Get(':token')
  @Public()
  getParentView(@Param('token') token: string, @Query('phone') phone: string) {
    return this.shareService.getParentView(token, phone);
  }
}
