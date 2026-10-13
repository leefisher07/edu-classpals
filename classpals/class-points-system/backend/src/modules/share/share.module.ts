import { Module } from '@nestjs/common';
import { ShareService } from './share.service';
import {
  ShareController,
  ShareLinkController,
  ParentController,
} from './share.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ShareController, ShareLinkController, ParentController],
  providers: [ShareService],
  exports: [ShareService],
})
export class ShareModule {}
