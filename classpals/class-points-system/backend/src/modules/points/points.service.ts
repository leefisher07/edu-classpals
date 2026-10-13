import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddPointsDto, BatchPointsDto } from './dto/points.dto';
import { DashboardService } from '../dashboard/dashboard.service';

@Injectable()
export class PointsService {
  constructor(
    private prisma: PrismaService,
    private dashboardService: DashboardService,
  ) {}

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

  private async verifyClassOwnership(userId: string, classId: string) {
    const classItem = await this.prisma.class.findUnique({
      where: { id: classId },
    });
    if (!classItem) throw new NotFoundException('班级不存在');
    if (classItem.userId !== userId)
      throw new ForbiddenException('无权操作此班级');
    return classItem;
  }

  /**
   * 单个学生加减分
   */
  async addPoints(
    userId: string,
    studentId: string,
    dto: AddPointsDto,
    operatorName: string,
  ) {
    const student = await this.verifyStudentOwnership(userId, studentId);

    // 验证规则是否属于该班级
    if (dto.ruleId) {
      const rule = await this.prisma.pointRule.findUnique({
        where: { id: dto.ruleId },
        select: { classId: true },
      });
      if (!rule || rule.classId !== student.classId) {
        throw new BadRequestException('规则不属于该班级');
      }
    }

    const delta = dto.type === 'ADD' ? dto.value : -dto.value;
    const undoExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟后

    const result = await this.prisma.$transaction(async (tx) => {
      // 更新积分
      const updated = await tx.student.update({
        where: { id: studentId },
        data: {
          totalPoints: { increment: delta },
          availablePoints: { increment: delta },
        },
      });

      // 创建积分记录
      const record = await tx.pointRecord.create({
        data: {
          classId: student.classId,
          studentId,
          points: delta,
          reason: dto.reason || (dto.type === 'ADD' ? '加分' : '扣分'),
          ruleId: dto.ruleId,
          operatorId: userId,
          operatorName,
          canUndo: true,
          undoExpiresAt,
        },
      });

      return { updated, record };
    });

    await this.dashboardService.invalidateClassDashboardCache(student.classId);

    return {
      id: studentId,
      totalPoints: result.updated.totalPoints,
      availablePoints: result.updated.availablePoints,
      record: {
        id: result.record.id,
        type: dto.type,
        value: dto.value,
        points: delta,
        reason: result.record.reason,
        createdAt: result.record.createdAt,
        canRevoke: true,
      },
    };
  }

  /**
   * 快速加1分
   */
  async quickAddPoint(userId: string, studentId: string, operatorName: string) {
    return this.addPoints(
      userId,
      studentId,
      { type: 'ADD', value: 1, reason: '快速加分' },
      operatorName,
    );
  }

  /**
   * 批量加减分
   */
  async batchPoints(
    userId: string,
    classId: string,
    dto: BatchPointsDto,
    operatorName: string,
  ) {
    await this.verifyClassOwnership(userId, classId);

    // 验证所有studentIds都属于该班级
    const students = await this.prisma.student.findMany({
      where: { id: { in: dto.studentIds }, classId },
      select: { id: true },
    });

    if (students.length !== dto.studentIds.length) {
      throw new BadRequestException('部分学生不属于该班级');
    }

    // 验证规则是否属于该班级
    if (dto.ruleId) {
      const rule = await this.prisma.pointRule.findUnique({
        where: { id: dto.ruleId },
        select: { classId: true },
      });
      if (!rule || rule.classId !== classId) {
        throw new BadRequestException('规则不属于该班级');
      }
    }

    const delta = dto.type === 'ADD' ? dto.value : -dto.value;
    const undoExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const results = await this.prisma.$transaction(async (tx) => {
      const updates = await Promise.all(
        dto.studentIds.map(async (studentId) => {
          const updated = await tx.student.update({
            where: { id: studentId },
            data: {
              totalPoints: { increment: delta },
              availablePoints: { increment: delta },
            },
          });

          await tx.pointRecord.create({
            data: {
              classId,
              studentId,
              points: delta,
              reason:
                dto.reason || (dto.type === 'ADD' ? '批量加分' : '批量扣分'),
              ruleId: dto.ruleId,
              operatorId: userId,
              operatorName,
              canUndo: true,
              undoExpiresAt,
            },
          });

          return {
            studentId,
            totalPoints: updated.totalPoints,
            availablePoints: updated.availablePoints,
          };
        }),
      );
      return updates;
    });

    await this.dashboardService.invalidateClassDashboardCache(classId);

    return { updated: results.length, records: results };
  }

  /**
   * 查看学生积分明细
   */
  async getHistory(
    userId: string,
    studentId: string,
    query: { page?: string; limit?: string },
  ) {
    await this.verifyStudentOwnership(userId, studentId);

    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');
    const skip = (page - 1) * limit;
    const now = new Date();

    const [records, total] = await Promise.all([
      this.prisma.pointRecord.findMany({
        where: { studentId, isRevoked: false },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.pointRecord.count({ where: { studentId, isRevoked: false } }),
    ]);

    return {
      records: records.map((r) => ({
        id: r.id,
        type: r.points > 0 ? 'ADD' : 'DEDUCT',
        value: Math.abs(r.points),
        points: r.points,
        reason: r.reason,
        createdAt: r.createdAt,
        canRevoke: r.canUndo && r.undoExpiresAt ? r.undoExpiresAt > now : false,
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * 撤销积分记录（5分钟内）
   */
  async revokeRecord(userId: string, recordId: string, operatorName: string) {
    const record = await this.prisma.pointRecord.findUnique({
      where: { id: recordId },
      include: { student: { include: { class: true } } },
    });

    if (!record) throw new NotFoundException('积分记录不存在');
    if (record.student.class.userId !== userId)
      throw new ForbiddenException('无权撤销此记录');
    if (record.isRevoked) throw new BadRequestException('该记录已被撤销');
    if (
      !record.canUndo ||
      !record.undoExpiresAt ||
      record.undoExpiresAt < new Date()
    ) {
      throw new BadRequestException('已超过5分钟撤销时限');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 标记记录为已撤销
      await tx.pointRecord.update({
        where: { id: recordId },
        data: { isRevoked: true, revokedAt: new Date(), revokedBy: userId },
      });

      // 回退积分
      const updated = await tx.student.update({
        where: { id: record.studentId },
        data: {
          totalPoints: { increment: -record.points },
          availablePoints: { increment: -record.points },
        },
      });

      return updated;
    });

    await this.dashboardService.invalidateClassDashboardCache(record.student.classId);

    return {
      message: '已撤销',
      student: {
        id: record.studentId,
        totalPoints: result.totalPoints,
        availablePoints: result.availablePoints,
      },
    };
  }

  /**
   * 获取班级积分记录列表（带筛选）
   */
  async getClassRecords(
    userId: string,
    classId: string,
    query: {
      studentName?: string;
      startDate?: string;
      endDate?: string;
      type?: 'all' | 'add' | 'deduct';
      page?: string;
      limit?: string;
    },
  ) {
    await this.verifyClassOwnership(userId, classId);

    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '50');
    const skip = (page - 1) * limit;
    const now = new Date();

    // Build where clause
    const where: any = { classId, isRevoked: false };

    // Filter by student name
    if (query.studentName) {
      where.student = { name: { contains: query.studentName } };
    }

    // Filter by date range
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const endDate = new Date(query.endDate);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    // Filter by type
    if (query.type === 'add') {
      where.points = { gt: 0 };
    } else if (query.type === 'deduct') {
      where.points = { lt: 0 };
    }

    const [records, total] = await Promise.all([
      this.prisma.pointRecord.findMany({
        where,
        include: {
          student: { select: { id: true, name: true, studentNumber: true } },
          rule: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.pointRecord.count({ where }),
    ]);

    return {
      records: records.map((r) => ({
        id: r.id,
        student: r.student,
        type: r.points > 0 ? 'ADD' : 'DEDUCT',
        value: Math.abs(r.points),
        points: r.points,
        reason: r.reason,
        ruleName: r.rule?.name,
        operatorName: r.operatorName,
        createdAt: r.createdAt,
        canRevoke: r.canUndo && r.undoExpiresAt ? r.undoExpiresAt > now : false,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
