import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建班级
   */
  async create(userId: string, createClassDto: CreateClassDto) {
    const { name, teacherName } = createClassDto;

    const newClass = await this.prisma.class.create({
      data: {
        name,
        teacherName,
        userId,
      },
    });

    // 检查用户是否有其他班级，如果这是第一个班级，自动设置为当前班级
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentClassId: true },
    });

    if (!user?.currentClassId) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { currentClassId: newClass.id },
      });
    }

    // 统计学生数和总积分
    const studentCount = await this.prisma.student.count({
      where: { classId: newClass.id },
    });

    const totalPointsResult = await this.prisma.student.aggregate({
      where: { classId: newClass.id },
      _sum: { totalPoints: true },
    });

    return {
      ...newClass,
      studentCount,
      totalPoints: totalPointsResult._sum.totalPoints || 0,
      isActive: !user?.currentClassId, // 如果是第一个班级，标记为激活
    };
  }

  /**
   * 获取我的班级列表
   */
  async findAll(userId: string) {
    const classes = await this.prisma.class.findMany({
      where: {
        userId,
        isArchived: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 获取当前用户的 currentClassId
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentClassId: true },
    });

    // 为每个班级添加统计信息
    const classesWithStats = await Promise.all(
      classes.map(async (classItem) => {
        const studentCount = await this.prisma.student.count({
          where: { classId: classItem.id },
        });

        const totalPointsResult = await this.prisma.student.aggregate({
          where: { classId: classItem.id },
          _sum: { totalPoints: true },
        });

        return {
          ...classItem,
          studentCount,
          totalPoints: totalPointsResult._sum.totalPoints || 0,
          isActive: classItem.id === user?.currentClassId,
        };
      }),
    );

    return classesWithStats;
  }

  /**
   * 获取班级详情
   */
  async findOne(userId: string, classId: string) {
    const classItem = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: {
          select: {
            id: true,
            name: true,
            studentNumber: true,
            gender: true,
            totalPoints: true,
            availablePoints: true,
            avatarBgColor: true,
          },
          orderBy: {
            totalPoints: 'desc',
          },
        },
      },
    });

    if (!classItem) {
      throw new NotFoundException('班级不存在');
    }

    // 检查权限
    if (classItem.userId !== userId) {
      throw new ForbiddenException('无权访问此班级');
    }

    const studentCount = classItem.students.length;
    const totalPoints = classItem.students.reduce(
      (sum, student) => sum + student.totalPoints,
      0,
    );

    return {
      ...classItem,
      studentCount,
      totalPoints,
    };
  }

  /**
   * 更新班级
   */
  async update(
    userId: string,
    classId: string,
    updateClassDto: UpdateClassDto,
  ) {
    // 检查班级是否存在且属于当前用户
    const classItem = await this.prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classItem) {
      throw new NotFoundException('班级不存在');
    }

    if (classItem.userId !== userId) {
      throw new ForbiddenException('无权修改此班级');
    }

    const updatedClass = await this.prisma.class.update({
      where: { id: classId },
      data: updateClassDto,
    });

    return updatedClass;
  }

  /**
   * 删除班级（归档）
   */
  async remove(userId: string, classId: string) {
    // 检查班级是否存在且属于当前用户
    const classItem = await this.prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classItem) {
      throw new NotFoundException('班级不存在');
    }

    if (classItem.userId !== userId) {
      throw new ForbiddenException('无权删除此班级');
    }

    // 归档班级（软删除）
    await this.prisma.class.update({
      where: { id: classId },
      data: { isArchived: true },
    });

    // 如果删除的是当前班级，清除 currentClassId
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentClassId: true },
    });

    if (user?.currentClassId === classId) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { currentClassId: null },
      });
    }

    return { message: '班级已归档' };
  }

  /**
   * 切换当前班级
   */
  async activate(userId: string, classId: string) {
    // 检查班级是否存在且属于当前用户
    const classItem = await this.prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classItem) {
      throw new NotFoundException('班级不存在');
    }

    if (classItem.userId !== userId) {
      throw new ForbiddenException('无权切换到此班级');
    }

    // 更新用户的 currentClassId
    await this.prisma.user.update({
      where: { id: userId },
      data: { currentClassId: classId },
    });

    return {
      id: classId,
      isActive: true,
    };
  }
}
