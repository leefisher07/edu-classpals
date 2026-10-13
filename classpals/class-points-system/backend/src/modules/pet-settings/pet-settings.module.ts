import { Module } from '@nestjs/common';
import { PetSettingsController } from './pet-settings.controller';
import { PetSettingsService } from './pet-settings.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PetSettingsController],
  providers: [PetSettingsService],
  exports: [PetSettingsService],
})
export class PetSettingsModule {}
