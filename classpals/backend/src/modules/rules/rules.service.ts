import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateRuleDto,
  UpdateRuleDto,
  UpdateRuleSortDto,
} from './dto/rule.dto';

@Injectable()
export class RulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, classId: string, dto: CreateRuleDto) {
    // Verify class ownership
    const classItem = await this.prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classItem) {
      throw new NotFoundException('班级不存在');
    }

    if (classItem.userId !== userId) {
      throw new ForbiddenException('无权操作此班级');
    }

    // Get max sortOrder
    const maxSort = await this.prisma.pointRule.aggregate({
      where: { classId },
      _max: { sortOrder: true },
    });

    const rule = await this.prisma.pointRule.create({
      data: {
        classId,
        name: dto.name,
        points: dto.points,
        type: dto.type,
        category: dto.category,
        icon: dto.icon,
        sortOrder: (maxSort._max.sortOrder || 0) + 1,
      },
    });

    return rule;
  }

  async findAll(userId: string, classId: string) {
    // Verify class ownership
    const classItem = await this.prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classItem) {
      throw new NotFoundException('班级不存在');
    }

    if (classItem.userId !== userId) {
      throw new ForbiddenException('无权操作此班级');
    }

    const rules = await this.prisma.pointRule.findMany({
      where: { classId },
      orderBy: { sortOrder: 'asc' },
    });

    return rules;
  }

  async findOne(userId: string, id: string) {
    const rule = await this.prisma.pointRule.findUnique({
      where: { id },
      include: { class: true },
    });

    if (!rule) {
      throw new NotFoundException('规则不存在');
    }

    if (rule.class.userId !== userId) {
      throw new ForbiddenException('无权查看此规则');
    }

    return rule;
  }

  async update(userId: string, id: string, dto: UpdateRuleDto) {
    const rule = await this.prisma.pointRule.findUnique({
      where: { id },
      include: { class: true },
    });

    if (!rule) {
      throw new NotFoundException('规则不存在');
    }

    if (rule.class.userId !== userId) {
      throw new ForbiddenException('无权修改此规则');
    }

    const updated = await this.prisma.pointRule.update({
      where: { id },
      data: dto,
    });

    return updated;
  }

  async remove(userId: string, id: string) {
    const rule = await this.prisma.pointRule.findUnique({
      where: { id },
      include: { class: true },
    });

    if (!rule) {
      throw new NotFoundException('规则不存在');
    }

    if (rule.class.userId !== userId) {
      throw new ForbiddenException('无权删除此规则');
    }

    await this.prisma.pointRule.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }

  async updateSort(userId: string, classId: string, dto: UpdateRuleSortDto) {
    // Verify class ownership
    const classItem = await this.prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classItem) {
      throw new NotFoundException('班级不存在');
    }

    if (classItem.userId !== userId) {
      throw new ForbiddenException('无权操作此班级');
    }

    // 验证所有ruleIds都属于该班级
    const rules = await this.prisma.pointRule.findMany({
      where: { id: { in: dto.ruleIds }, classId },
      select: { id: true },
    });

    if (rules.length !== dto.ruleIds.length) {
      throw new BadRequestException('部分规则不属于该班级');
    }

    // Update sortOrder for each rule
    await this.prisma.$transaction(
      dto.ruleIds.map((ruleId, index) =>
        this.prisma.pointRule.update({
          where: { id: ruleId },
          data: { sortOrder: index + 1 },
        }),
      ),
    );

    return { message: '排序更新成功' };
  }

  async toggleEnabled(userId: string, id: string) {
    const rule = await this.prisma.pointRule.findUnique({
      where: { id },
      include: { class: true },
    });

    if (!rule) {
      throw new NotFoundException('规则不存在');
    }

    if (rule.class.userId !== userId) {
      throw new ForbiddenException('无权修改此规则');
    }

    const updated = await this.prisma.pointRule.update({
      where: { id },
      data: { isEnabled: !rule.isEnabled },
    });

    return updated;
  }
}
