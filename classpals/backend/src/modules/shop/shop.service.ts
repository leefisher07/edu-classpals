import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateItemDto,
  UpdateItemDto,
  UpdateItemSortDto,
  ExchangeItemDto,
  UpdateExchangeStatusDto,
} from './dto/shop.dto';

@Injectable()
export class ShopService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyClassOwnership(userId: string, classId: string) {
    const classItem = await this.prisma.class.findUnique({
      where: { id: classId },
    });
    if (!classItem) throw new NotFoundException('班级不存在');
    if (classItem.userId !== userId)
      throw new ForbiddenException('无权操作此班级');
    return classItem;
  }

  private async verifyStudentOwnership(userId: string, studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true },
    });
    if (!student) throw new NotFoundException('学生不存在');
    if (student.class.userId !== userId)
      throw new ForbiddenException('无权操作此学生');
    return student;
  }

  // ==================== 商品管理 ====================

  async createItem(userId: string, classId: string, dto: CreateItemDto) {
    await this.verifyClassOwnership(userId, classId);

    const maxSort = await this.prisma.shopItem.aggregate({
      where: { classId },
      _max: { sortOrder: true },
    });

    const item = await this.prisma.shopItem.create({
      data: {
        classId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        stock: dto.stock,
        image: dto.image,
        category: dto.category,
        sortOrder: (maxSort._max.sortOrder || 0) + 1,
      },
    });

    return item;
  }

  async findAllItems(userId: string, classId: string) {
    await this.verifyClassOwnership(userId, classId);

    const items = await this.prisma.shopItem.findMany({
      where: { classId },
      orderBy: { sortOrder: 'asc' },
    });

    return items;
  }

  async findOneItem(userId: string, id: string) {
    const item = await this.prisma.shopItem.findUnique({
      where: { id },
      include: { class: true },
    });

    if (!item) throw new NotFoundException('商品不存在');
    if (item.class.userId !== userId)
      throw new ForbiddenException('无权查看此商品');

    return item;
  }

  async updateItem(userId: string, id: string, dto: UpdateItemDto) {
    const item = await this.prisma.shopItem.findUnique({
      where: { id },
      include: { class: true },
    });

    if (!item) throw new NotFoundException('商品不存在');
    if (item.class.userId !== userId)
      throw new ForbiddenException('无权修改此商品');

    const updated = await this.prisma.shopItem.update({
      where: { id },
      data: dto,
    });

    return updated;
  }

  async removeItem(userId: string, id: string) {
    const item = await this.prisma.shopItem.findUnique({
      where: { id },
      include: { class: true },
    });

    if (!item) throw new NotFoundException('商品不存在');
    if (item.class.userId !== userId)
      throw new ForbiddenException('无权删除此商品');

    await this.prisma.shopItem.delete({ where: { id } });

    return { message: '删除成功' };
  }

  async updateItemSort(
    userId: string,
    classId: string,
    dto: UpdateItemSortDto,
  ) {
    await this.verifyClassOwnership(userId, classId);

    // 验证所有itemIds都属于该班级
    const items = await this.prisma.shopItem.findMany({
      where: { id: { in: dto.itemIds }, classId },
      select: { id: true },
    });

    if (items.length !== dto.itemIds.length) {
      throw new BadRequestException('部分商品不属于该班级');
    }

    await this.prisma.$transaction(
      dto.itemIds.map((itemId, index) =>
        this.prisma.shopItem.update({
          where: { id: itemId },
          data: { sortOrder: index + 1 },
        }),
      ),
    );

    return { message: '排序更新成功' };
  }

  // ==================== 兑换功能 ====================

  async exchangeItem(
    userId: string,
    studentId: string,
    dto: ExchangeItemDto,
    operatorName?: string,
  ) {
    const student = await this.verifyStudentOwnership(userId, studentId);
    const quantity = dto.quantity || 1;

    const item = await this.prisma.shopItem.findUnique({
      where: { id: dto.itemId },
    });

    if (!item) throw new NotFoundException('商品不存在');
    if (!item.isAvailable) throw new BadRequestException('商品已下架');
    if (item.classId !== student.classId)
      throw new BadRequestException('商品不属于该班级');

    const totalPrice = item.price * quantity;

    if (student.availablePoints < totalPrice) {
      throw new BadRequestException(
        `积分不足，需要 ${totalPrice} 积分，当前可用 ${student.availablePoints} 积分`,
      );
    }

    if (item.stock !== null && item.stock < quantity) {
      throw new BadRequestException(`库存不足，剩余 ${item.stock} 件`);
    }

    const undoExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedStudent = await tx.student.update({
        where: { id: studentId },
        data: { availablePoints: { decrement: totalPrice } },
      });

      if (item.stock !== null) {
        await tx.shopItem.update({
          where: { id: dto.itemId },
          data: { stock: { decrement: quantity } },
        });
      }

      const exchange = await tx.exchange.create({
        data: {
          studentId,
          itemId: dto.itemId,
          quantity,
          totalPrice,
          status: 'SUCCESS',
          operatorId: userId,
          operatorName: operatorName ?? '教师',
          canUndo: true,
          undoExpiresAt,
        },
        include: {
          item: true,
          student: { select: { id: true, name: true } },
        },
      });

      return { exchange, updatedStudent };
    });

    return {
      exchange: {
        id: result.exchange.id,
        itemName: result.exchange.item.name,
        quantity: result.exchange.quantity,
        totalPrice: result.exchange.totalPrice,
        status: result.exchange.status,
        exchangedAt: result.exchange.exchangedAt,
        canRevoke:
          result.exchange.canUndo && result.exchange.undoExpiresAt
            ? result.exchange.undoExpiresAt > new Date()
            : false,
      },
      student: {
        id: result.updatedStudent.id,
        availablePoints: result.updatedStudent.availablePoints,
      },
    };
  }

  async getExchanges(
    userId: string,
    classId: string,
    query: { status?: string; page?: string; limit?: string },
  ) {
    await this.verifyClassOwnership(userId, classId);

    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');
    const skip = (page - 1) * limit;
    const now = new Date();

    const where: any = {
      student: { classId },
      isRevoked: false,
    };

    if (query.status) {
      where.status = query.status;
    }

    const [exchanges, total] = await Promise.all([
      this.prisma.exchange.findMany({
        where,
        orderBy: { exchangedAt: 'desc' },
        skip,
        take: limit,
        include: {
          item: { select: { name: true, image: true, category: true } },
          student: { select: { id: true, name: true } },
        },
      }),
      this.prisma.exchange.count({ where }),
    ]);

    return {
      exchanges: exchanges.map((e) => ({
        id: e.id,
        student: e.student,
        item: e.item,
        quantity: e.quantity,
        totalPrice: e.totalPrice,
        status: e.status,
        exchangedAt: e.exchangedAt,
        canRevoke: e.canUndo && e.undoExpiresAt ? e.undoExpiresAt > now : false,
      })),
      total,
      page,
      limit,
    };
  }

  async getStudentExchanges(
    userId: string,
    studentId: string,
    query: { page?: string; limit?: string },
  ) {
    await this.verifyStudentOwnership(userId, studentId);

    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');
    const skip = (page - 1) * limit;
    const now = new Date();

    const [exchanges, total] = await Promise.all([
      this.prisma.exchange.findMany({
        where: { studentId, isRevoked: false },
        orderBy: { exchangedAt: 'desc' },
        skip,
        take: limit,
        include: {
          item: { select: { name: true, image: true, category: true } },
        },
      }),
      this.prisma.exchange.count({ where: { studentId, isRevoked: false } }),
    ]);

    return {
      exchanges: exchanges.map((e) => ({
        id: e.id,
        item: e.item,
        quantity: e.quantity,
        totalPrice: e.totalPrice,
        status: e.status,
        exchangedAt: e.exchangedAt,
        canRevoke: e.canUndo && e.undoExpiresAt ? e.undoExpiresAt > now : false,
      })),
      total,
      page,
      limit,
    };
  }

  async updateExchangeStatus(
    userId: string,
    exchangeId: string,
    dto: UpdateExchangeStatusDto,
  ) {
    const exchange = await this.prisma.exchange.findUnique({
      where: { id: exchangeId },
      include: {
        student: { include: { class: true } },
        item: true,
      },
    });

    if (!exchange) throw new NotFoundException('兑换记录不存在');
    if (exchange.student.class.userId !== userId)
      throw new ForbiddenException('无权操作此兑换记录');
    if (exchange.isRevoked) throw new BadRequestException('该兑换记录已被撤回');
    if (
      !exchange.canUndo ||
      !exchange.undoExpiresAt ||
      exchange.undoExpiresAt < new Date()
    ) {
      throw new BadRequestException('已超过5分钟撤回时限');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id: exchange.studentId },
        data: { availablePoints: { increment: exchange.totalPrice } },
      });

      if (exchange.item.stock !== null) {
        await tx.shopItem.update({
          where: { id: exchange.itemId },
          data: { stock: { increment: exchange.quantity } },
        });
      }

      await tx.exchange.update({
        where: { id: exchangeId },
        data: {
          status: dto.status,
          canUndo: false,
          undoExpiresAt: new Date(),
          isRevoked: true,
          revokedAt: new Date(),
          revokedBy: userId,
        },
      });
    });

    return { message: '兑换记录已撤回' };
  }
}
