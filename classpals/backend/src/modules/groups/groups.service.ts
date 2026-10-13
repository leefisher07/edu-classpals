import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateGroupDto,
  UpdateGroupDto,
  UpdateGroupSortDto,
  ManageMembersDto,
  RandomGroupDto,
  SetLeaderDto,
} from './dto/group.dto';

const GROUP_COLORS = [
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
  '#06B6D4',
  '#6366F1',
];

@Injectable()
export class GroupsService {
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

  async create(userId: string, classId: string, dto: CreateGroupDto) {
    await this.verifyClassOwnership(userId, classId);

    const maxSort = await this.prisma.group.aggregate({
      where: { classId },
      _max: { sortOrder: true },
    });

    const group = await this.prisma.group.create({
      data: {
        classId,
        name: dto.name,
        color:
          dto.color ||
          GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)],
        sortOrder: (maxSort._max.sortOrder || 0) + 1,
      },
    });

    const memberCount = await this.prisma.student.count({
      where: { groupId: group.id },
    });

    return { ...group, memberCount };
  }

  async findAll(userId: string, classId: string) {
    await this.verifyClassOwnership(userId, classId);

    const groups = await this.prisma.group.findMany({
      where: { classId },
      orderBy: { sortOrder: 'asc' },
      include: {
        students: {
          select: { id: true, name: true, avatar: true, avatarBgColor: true },
        },
      },
    });

    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      color: g.color,
      leaderId: g.leaderId,
      sortOrder: g.sortOrder,
      memberCount: g.students.length,
      members: g.students,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    }));
  }

  async findOne(userId: string, id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        class: true,
        students: {
          select: {
            id: true,
            name: true,
            avatar: true,
            avatarBgColor: true,
            totalPoints: true,
          },
        },
      },
    });

    if (!group) throw new NotFoundException('小组不存在');
    if (group.class.userId !== userId)
      throw new ForbiddenException('无权查看此小组');

    return {
      id: group.id,
      name: group.name,
      color: group.color,
      leaderId: group.leaderId,
      sortOrder: group.sortOrder,
      memberCount: group.students.length,
      members: group.students,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  }

  async update(userId: string, id: string, dto: UpdateGroupDto) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: { class: true },
    });

    if (!group) throw new NotFoundException('小组不存在');
    if (group.class.userId !== userId)
      throw new ForbiddenException('无权修改此小组');

    const updated = await this.prisma.group.update({
      where: { id },
      data: dto,
    });

    return updated;
  }

  async remove(userId: string, id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: { class: true },
    });

    if (!group) throw new NotFoundException('小组不存在');
    if (group.class.userId !== userId)
      throw new ForbiddenException('无权删除此小组');

    // Remove students from group
    await this.prisma.student.updateMany({
      where: { groupId: id },
      data: { groupId: null },
    });

    await this.prisma.group.delete({ where: { id } });

    return { message: '删除成功' };
  }

  async updateSort(userId: string, classId: string, dto: UpdateGroupSortDto) {
    await this.verifyClassOwnership(userId, classId);

    // 验证所有groupIds都属于该班级
    const groups = await this.prisma.group.findMany({
      where: { id: { in: dto.groupIds }, classId },
      select: { id: true },
    });

    if (groups.length !== dto.groupIds.length) {
      throw new BadRequestException('部分小组不属于该班级');
    }

    await this.prisma.$transaction(
      dto.groupIds.map((groupId, index) =>
        this.prisma.group.update({
          where: { id: groupId },
          data: { sortOrder: index + 1 },
        }),
      ),
    );

    return { message: '排序更新成功' };
  }

  async addMembers(userId: string, groupId: string, dto: ManageMembersDto) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { class: true },
    });

    if (!group) throw new NotFoundException('小组不存在');
    if (group.class.userId !== userId)
      throw new ForbiddenException('无权操作此小组');

    // 验证所有studentIds都属于该班级
    const students = await this.prisma.student.findMany({
      where: { id: { in: dto.studentIds }, classId: group.classId },
      select: { id: true },
    });

    if (students.length !== dto.studentIds.length) {
      throw new BadRequestException('部分学生不属于该班级');
    }

    await this.prisma.student.updateMany({
      where: { id: { in: dto.studentIds }, classId: group.classId },
      data: { groupId },
    });

    return { message: '添加成员成功' };
  }

  async setLeader(userId: string, groupId: string, dto: SetLeaderDto) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { class: true },
    });

    if (!group) throw new NotFoundException('小组不存在');
    if (group.class.userId !== userId)
      throw new ForbiddenException('无权操作此小组');

    // Verify leader is a member of this group and belongs to the same class
    if (dto.leaderId) {
      const student = await this.prisma.student.findUnique({
        where: { id: dto.leaderId },
      });
      if (!student || student.groupId !== groupId) {
        throw new BadRequestException('组长必须是该小组的成员');
      }
      if (student.classId !== group.classId) {
        throw new BadRequestException('组长必须属于该班级');
      }
    }

    const updated = await this.prisma.group.update({
      where: { id: groupId },
      data: { leaderId: dto.leaderId ?? null },
    });

    return { ...updated };
  }

  async removeMembers(userId: string, groupId: string, dto: ManageMembersDto) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { class: true },
    });

    if (!group) throw new NotFoundException('小组不存在');
    if (group.class.userId !== userId)
      throw new ForbiddenException('无权操作此小组');

    // 验证所有studentIds都属于该小组
    const students = await this.prisma.student.findMany({
      where: { id: { in: dto.studentIds }, groupId },
      select: { id: true },
    });

    if (students.length !== dto.studentIds.length) {
      throw new BadRequestException('部分学生不属于该小组');
    }

    await this.prisma.student.updateMany({
      where: { id: { in: dto.studentIds }, groupId },
      data: { groupId: null },
    });

    return { message: '移除成员成功' };
  }

  async randomGroup(userId: string, classId: string, dto: RandomGroupDto) {
    await this.verifyClassOwnership(userId, classId);

    if (!dto.groupCount && !dto.studentsPerGroup) {
      throw new BadRequestException('请指定分组数量或每组人数');
    }

    // Get all students without group
    const students = await this.prisma.student.findMany({
      where: { classId, groupId: null },
    });

    if (students.length === 0) {
      throw new BadRequestException('没有可分配的学生');
    }

    // Calculate group count
    let groupCount = dto.groupCount || 0;
    if (dto.studentsPerGroup) {
      groupCount = Math.ceil(students.length / dto.studentsPerGroup);
    }

    if (groupCount > students.length) {
      throw new BadRequestException('分组数量不能超过学生数量');
    }

    // Shuffle students
    const shuffled = [...students].sort(() => Math.random() - 0.5);

    // Delete existing groups
    await this.prisma.group.deleteMany({ where: { classId } });

    // Create groups and assign students
    const groups: Array<{
      id: string;
      name: string;
      color: string;
      sortOrder: number;
    }> = [];
    for (let i = 0; i < groupCount; i++) {
      const group = await this.prisma.group.create({
        data: {
          classId,
          name: `第${i + 1}组`,
          color: GROUP_COLORS[i % GROUP_COLORS.length],
          sortOrder: i + 1,
        },
      });
      groups.push(group);
    }

    // Assign students to groups
    for (let i = 0; i < shuffled.length; i++) {
      const groupIndex = i % groupCount;
      await this.prisma.student.update({
        where: { id: shuffled[i].id },
        data: { groupId: groups[groupIndex].id },
      });
    }

    return {
      message: '随机分组成功',
      groupCount,
      studentCount: students.length,
    };
  }
}
