import { Module } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { GroupsController, GroupController } from './groups.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GroupsController, GroupController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
