import { Module } from '@nestjs/common';
import { ShopService } from './shop.service';
import {
  ShopController,
  ShopItemController,
  StudentExchangeController,
} from './shop.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ShopController, ShopItemController, StudentExchangeController],
  providers: [ShopService],
  exports: [ShopService],
})
export class ShopModule {}
