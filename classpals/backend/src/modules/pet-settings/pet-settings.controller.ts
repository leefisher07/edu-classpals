import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { PetSettingsService } from './pet-settings.service';
import { UpdatePetSettingsDto } from './dto/pet-settings.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('classes/:classId/pet-settings')
export class PetSettingsController {
  constructor(private readonly petSettingsService: PetSettingsService) {}

  @Get()
  getSettings(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
  ) {
    return this.petSettingsService.getSettings(userId, classId);
  }

  @Patch()
  upsertSettings(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
    @Body() dto: UpdatePetSettingsDto,
  ) {
    return this.petSettingsService.upsertSettings(userId, classId, dto);
  }
}
