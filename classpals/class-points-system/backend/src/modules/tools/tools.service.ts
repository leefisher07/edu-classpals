import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RandomPickDto } from './dto/tools.dto';

type PickedStudentSummary = {
  id: string;
  name: string;
};

@Injectable()
export class ToolsService {
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

  private parsePickedStudents(record: {
    studentIds: string;
    studentNames: string;
  }): PickedStudentSummary[] {
    const studentIds = JSON.parse(record.studentIds) as string[];
    const studentNames = JSON.parse(record.studentNames) as string[];

    return studentNames.map((name, index) => ({
      id: studentIds[index] ?? `${index}`,
      name,
    }));
  }

  /**
   * 随机点名
   */
  async randomPick(userId: string, classId: string, dto: RandomPickDto) {
    await this.verifyClassOwnership(userId, classId);

    const count = dto.count || 1;
    const excludeIds = dto.excludeIds || [];

    const students = await this.prisma.student.findMany({
      where: {
        classId,
        id: { notIn: excludeIds },
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        avatarBgColor: true,
        studentNumber: true,
      },
    });

    if (students.length === 0) {
      throw new BadRequestException('没有可点名的学生');
    }

    if (count > students.length) {
      throw new BadRequestException(
        `点名数量不能超过可用学生数量（${students.length}）`,
      );
    }

    // Shuffle and pick
    const shuffled = [...students].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, count);

    // 获取操作人信息
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    // 保存点名历史
    await this.prisma.pickHistory.create({
      data: {
        classId,
        operatorId: userId,
        operatorName: user?.username || '教师',
        studentIds: JSON.stringify(picked.map((s) => s.id)),
        studentNames: JSON.stringify(picked.map((s) => s.name)),
        count,
      },
    });

    return {
      picked,
      remaining: students.length - count,
      total: students.length,
    };
  }

  /**
   * 获取点名历史
   */
  async getPickHistory(userId: string, classId: string) {
    await this.verifyClassOwnership(userId, classId);

    const history = await this.prisma.pickHistory.findMany({
      where: { classId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return history.map((record) => ({
      id: record.id,
      operatorName: record.operatorName,
      students: this.parsePickedStudents(record),
      count: record.count,
      createdAt: record.createdAt,
    }));
  }
}
