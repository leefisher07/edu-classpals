import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

// 头像颜色映射（根据姓名首字符生成）
const AVATAR_COLORS = [
  'bg-red-100 text-red-600',
  'bg-orange-100 text-orange-600',
  'bg-amber-100 text-amber-600',
  'bg-yellow-100 text-yellow-600',
  'bg-lime-100 text-lime-600',
  'bg-green-100 text-green-600',
  'bg-emerald-100 text-emerald-600',
  'bg-teal-100 text-teal-600',
  'bg-cyan-100 text-cyan-600',
  'bg-sky-100 text-sky-600',
  'bg-blue-100 text-blue-600',
  'bg-indigo-100 text-indigo-600',
  'bg-violet-100 text-violet-600',
  'bg-purple-100 text-purple-600',
  'bg-pink-100 text-pink-600',
  'bg-rose-100 text-rose-600',
];

function getAvatarColor(name: string): string {
  const index = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  // 验证班级归属
  private async verifyClassOwnership(userId: string, classId: string) {
    const classItem = await this.prisma.class.findUnique({
      where: { id: classId },
    });
    if (!classItem) throw new NotFoundException('班级不存在');
    if (classItem.userId !== userId)
      throw new ForbiddenException('无权操作此班级');
    return classItem;
  }

  private async verifyGroupOwnership(classId: string, groupId?: string) {
    if (!groupId) {
      return;
    }

    const group = await this.prisma.group.findFirst({
      where: { id: groupId, classId },
    });

    if (!group) {
      throw new BadRequestException('所选小组不属于当前班级');
    }
  }

  // 验证学生归属
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

  /**
   * 添加学生（支持批量）
   */
  async create(userId: string, classId: string, dto: CreateStudentDto) {
    await this.verifyClassOwnership(userId, classId);
    await this.verifyGroupOwnership(classId, dto.groupId);

    const normalizedNames = dto.names
      .map((name) => name?.trim())
      .filter((name): name is string => !!name);

    if (normalizedNames.length === 0) {
      throw new BadRequestException('学生姓名不能为空');
    }

    // 检查班级学生数量上限（100人）
    const count = await this.prisma.student.count({ where: { classId } });
    if (count + normalizedNames.length > 100) {
      throw new BadRequestException(
        `每个班级最多100名学生，当前已有 ${count} 名`,
      );
    }

    const created = await Promise.all(
      normalizedNames.map(async (name, index) => {
        const student = await this.prisma.student.create({
          data: {
            classId,
            name,
            gender: dto.gender,
            avatar: normalizedNames.length === 1 ? dto.avatar : undefined,
            studentNumber:
              normalizedNames.length === 1 ? dto.studentNumber : undefined,
            groupId: dto.groupId,
            isCadre: dto.isCadre ?? false,
            cadrePosition: dto.cadrePosition,
            customPosition: dto.customPosition,
            avatarBgColor: getAvatarColor(name),
            sortOrder: count + index,
          },
        });

        // 添加家长手机号
        if (dto.parentPhones?.length) {
          await this.prisma.parentPhone.createMany({
            data: dto.parentPhones.map((p) => ({
              studentId: student.id,
              phone: p.phone,
              relationship: p.relationship,
            })),
          });
        }

        return {
          ...student,
          avatarColor: getAvatarColor(name),
          parentPhones: dto.parentPhones ?? [],
        };
      }),
    );

    return { created, count: created.length };
  }

  /**
   * 获取班级学生列表
   */
  async findAll(
    userId: string,
    classId: string,
    query: { search?: string; sortBy?: string; sortDesc?: string },
  ) {
    await this.verifyClassOwnership(userId, classId);

    const { search, sortBy = 'totalPoints', sortDesc = 'true' } = query;
    const desc = sortDesc === 'true';

    const orderBy: any = {};
    if (sortBy === 'name') orderBy.name = desc ? 'desc' : 'asc';
    else if (sortBy === 'studentNumber')
      orderBy.studentNumber = desc ? 'desc' : 'asc';
    else if (sortBy === 'availablePoints')
      orderBy.availablePoints = desc ? 'desc' : 'asc';
    else orderBy.totalPoints = desc ? 'desc' : 'asc';

    const students = await this.prisma.student.findMany({
      where: {
        classId,
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { studentNumber: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        parents: true,
        pet: { select: { level: true, experience: true, stage: true } },
      },
      orderBy,
    });

    return {
      students: students.map((s) => ({
        ...s,
        avatarColor: getAvatarColor(s.name),
      })),
      total: students.length,
    };
  }

  /**
   * 获取学生详情
   */
  async findOne(userId: string, studentId: string) {
    const student = await this.verifyStudentOwnership(userId, studentId);

    return {
      ...student,
      avatarColor: getAvatarColor(student.name),
    };
  }

  /**
   * 更新学生信息
   */
  async update(userId: string, studentId: string, dto: UpdateStudentDto) {
    const existingStudent = await this.verifyStudentOwnership(
      userId,
      studentId,
    );

    const nextGroupId = dto.groupId === null ? undefined : dto.groupId;
    await this.verifyGroupOwnership(existingStudent.classId, nextGroupId);

    const { parentPhones, ...rest } = dto;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (existingStudent.groupId && existingStudent.groupId !== nextGroupId) {
        await tx.group.updateMany({
          where: {
            id: existingStudent.groupId,
            leaderId: studentId,
          },
          data: {
            leaderId: null,
          },
        });
      }

      const student = await tx.student.update({
        where: { id: studentId },
        data: {
          ...rest,
          groupId: nextGroupId ?? null,
        },
      });

      // 更新家长手机号（全量替换）
      if (parentPhones !== undefined) {
        await tx.parentPhone.deleteMany({ where: { studentId } });
        if (parentPhones.length > 0) {
          await tx.parentPhone.createMany({
            data: parentPhones.map((p) => ({
              studentId,
              phone: p.phone,
              relationship: p.relationship,
            })),
          });
        }
      }

      return student;
    });

    return { ...updated, avatarColor: getAvatarColor(updated.name) };
  }

  /**
   * 删除学生
   */
  async remove(userId: string, studentId: string) {
    await this.verifyStudentOwnership(userId, studentId);
    await this.prisma.student.delete({ where: { id: studentId } });
    return { message: '学生已删除' };
  }
}
