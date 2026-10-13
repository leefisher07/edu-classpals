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
import { ShopService } from './shop.service';
import {
  CreateItemDto,
  UpdateItemDto,
  UpdateItemSortDto,
  ExchangeItemDto,
  UpdateExchangeStatusDto,
} from './dto/shop.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('classes/:classId/shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Post('items')
  createItem(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
    @Body() dto: CreateItemDto,
  ) {
    return this.shopService.createItem(userId, classId, dto);
  }

  @Get('items')
  findAllItems(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
  ) {
    return this.shopService.findAllItems(userId, classId);
  }

  @Patch('items/sort')
  updateItemSort(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
    @Body() dto: UpdateItemSortDto,
  ) {
    return this.shopService.updateItemSort(userId, classId, dto);
  }

  @Get('exchanges')
  getExchanges(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
    @Query() query: { status?: string; page?: string; limit?: string },
  ) {
    return this.shopService.getExchanges(userId, classId, query);
  }
}

@Controller('shop')
export class ShopItemController {
  constructor(private readonly shopService: ShopService) {}

  @Get('items/:id')
  findOneItem(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.shopService.findOneItem(userId, id);
  }

  @Patch('items/:id')
  updateItem(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.shopService.updateItem(userId, id, dto);
  }

  @Delete('items/:id')
  removeItem(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.shopService.removeItem(userId, id);
  }

  @Patch('exchanges/:id/status')
  updateExchangeStatus(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateExchangeStatusDto,
  ) {
    return this.shopService.updateExchangeStatus(userId, id, dto);
  }
}

@Controller('students/:studentId/exchanges')
export class StudentExchangeController {
  constructor(private readonly shopService: ShopService) {}

  @Post()
  exchangeItem(
    @CurrentUser('id') userId: string,
    @Param('studentId') studentId: string,
    @Body() dto: ExchangeItemDto,
  ) {
    return this.shopService.exchangeItem(userId, studentId, dto);
  }

  @Get()
  getStudentExchanges(
    @CurrentUser('id') userId: string,
    @Param('studentId') studentId: string,
    @Query() query: { page?: string; limit?: string },
  ) {
    return this.shopService.getStudentExchanges(userId, studentId, query);
  }
}
