import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DataManagementService } from './data-management.service';
import {
  ClassDataManagementController,
  DataManagementController,
} from './data-management.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ClassDataManagementController, DataManagementController],
  providers: [DataManagementService],
  exports: [DataManagementService],
})
export class DataManagementModule {}
