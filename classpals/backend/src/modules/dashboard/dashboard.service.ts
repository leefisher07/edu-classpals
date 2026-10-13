import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/services/redis.service';

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  private async verifyClassOwnership(userId: string, classId: string) {
    const classItem = await this.prisma.class.findUnique({
      where: { id: classId },
    });
    if (!classItem) throw new NotFoundException('班级不存在');
    if (classItem.userId !== userId)
      throw new ForbiddenException('无权操作此班级');
    return classItem;
  }

  async invalidateClassDashboardCache(classId: string) {
    await Promise.all([
      this.redisService.del(`dashboard:overview:${classId}`),
      this.redisService.delPattern(`dashboard:ranking:${classId}:*`),
      this.redisService.delPattern(`dashboard:group-ranking:${classId}:*`),
      this.redisService.delPattern(`dashboard:trend:${classId}:*`),
      this.redisService.del(`dashboard:distribution:${classId}`),
    ]);
  }

  /**
   * 班级概览统计
   */
  async getClassOverview(userId: string, classId: string) {
    await this.verifyClassOwnership(userId, classId);

    const cacheKey = `dashboard:overview:${classId}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const [
      studentCount,
      groupCount,
      totalPointsAgg,
      todayRecords,
      weekRecords,
      activeStudents,
      recentActivitiesRaw,
    ] = await Promise.all([
      this.prisma.student.count({ where: { classId } }),
      this.prisma.group.count({ where: { classId } }),
      this.prisma.student.aggregate({
        where: { classId },
        _sum: { totalPoints: true },
      }),
      this.prisma.pointRecord.findMany({
        where: { classId, createdAt: { gte: todayStart }, isRevoked: false },
      }),
      this.prisma.pointRecord.findMany({
        where: { classId, createdAt: { gte: weekStart }, isRevoked: false },
      }),
      this.prisma.student.count({ where: { classId, totalPoints: { gt: 0 } } }),
      this.prisma.pointRecord.findMany({
        where: { classId, isRevoked: false },
        include: {
          student: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const todayAdd = todayRecords
      .filter((r) => r.points > 0)
      .reduce((s, r) => s + r.points, 0);
    const todayDeduct = todayRecords
      .filter((r) => r.points < 0)
      .reduce((s, r) => s + Math.abs(r.points), 0);
    const weekAdd = weekRecords
      .filter((r) => r.points > 0)
      .reduce((s, r) => s + r.points, 0);
    const weekDeduct = weekRecords
      .filter((r) => r.points < 0)
      .reduce((s, r) => s + Math.abs(r.points), 0);

    const recentActivities = recentActivitiesRaw.map((record) => ({
      studentName: record.student?.name || '未知学生',
      reason: record.reason,
      value: Math.abs(record.points),
      type: record.points > 0 ? 'ADD' : 'DEDUCT',
      createdAt: record.createdAt,
    }));

    const result = {
      studentCount,
      groupCount,
      totalPoints: totalPointsAgg._sum.totalPoints || 0,
      activeStudents,
      today: {
        add: todayAdd,
        deduct: todayDeduct,
        net: todayAdd - todayDeduct,
        operations: todayRecords.length,
      },
      week: {
        add: weekAdd,
        deduct: weekDeduct,
        net: weekAdd - weekDeduct,
        operations: weekRecords.length,
      },
      recentActivities,
    };

    await this.redisService.set(cacheKey, result, 300);

    return result;
  }

  /**
   * 个人排行榜
   */
  async getStudentRanking(
    userId: string,
    classId: string,
    period: 'total' | 'week' | 'month' | 'custom' = 'total',
    startDate?: string,
    endDate?: string,
  ) {
    await this.verifyClassOwnership(userId, classId);

    const cacheKey = `dashboard:ranking:${classId}:${period}:${startDate || 'none'}:${endDate || 'none'}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const students = await this.prisma.student.findMany({
      where: { classId },
      select: {
        id: true,
        name: true,
        avatar: true,
        avatarBgColor: true,
        totalPoints: true,
        availablePoints: true,
        studentNumber: true,
      },
    });

    const getNameInitial = (name: string) => {
      const normalized = (name || '').trim().toUpperCase();
      return normalized ? normalized[0] : '';
    };

    const parseStudentNumber = (studentNumber?: string | null) => {
      if (!studentNumber) return Number.POSITIVE_INFINITY;
      const numeric = Number(studentNumber);
      return Number.isNaN(numeric) ? Number.POSITIVE_INFINITY : numeric;
    };

    const compareStudents = (
      a: {
        points: number;
        studentNumber?: string | null;
        name: string;
        id: string;
      },
      b: {
        points: number;
        studentNumber?: string | null;
        name: string;
        id: string;
      },
    ) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }

      if (a.studentNumber && b.studentNumber) {
        const studentNumberDiff =
          parseStudentNumber(a.studentNumber) -
          parseStudentNumber(b.studentNumber);
        if (studentNumberDiff !== 0) {
          return studentNumberDiff;
        }

        const studentNumberTextDiff = a.studentNumber.localeCompare(
          b.studentNumber,
          'zh-CN',
        );
        if (studentNumberTextDiff !== 0) {
          return studentNumberTextDiff;
        }
      } else if (!a.studentNumber && !b.studentNumber) {
        const nameInitialDiff = getNameInitial(b.name).localeCompare(
          getNameInitial(a.name),
          'en',
          { sensitivity: 'base' },
        );
        if (nameInitialDiff !== 0) {
          return nameInitialDiff;
        }

        const nameDiff = b.name.localeCompare(a.name, 'zh-CN', {
          sensitivity: 'base',
        });
        if (nameDiff !== 0) {
          return nameDiff;
        }
      } else {
        return a.studentNumber ? -1 : 1;
      }

      const fullNameDiff = a.name.localeCompare(b.name, 'zh-CN', {
        sensitivity: 'base',
      });
      if (fullNameDiff !== 0) {
        return fullNameDiff;
      }

      return a.id.localeCompare(b.id);
    };

    const getRange = () => {
      if (period === 'total') {
        return null;
      }

      const now = new Date();
      let rangeStartDate: string;
      let rangeEndDate: string;

      if (period === 'week') {
        const weekStart = new Date(now);
        const day = weekStart.getDay();
        const diff = day === 0 ? 6 : day - 1;
        weekStart.setDate(weekStart.getDate() - diff);
        rangeStartDate = formatLocalDate(weekStart);
        rangeEndDate = formatLocalDate(now);
      } else if (period === 'month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        rangeStartDate = formatLocalDate(monthStart);
        rangeEndDate = formatLocalDate(now);
      } else {
        if (!startDate || !endDate) {
          return null;
        }

        rangeStartDate = startDate;
        rangeEndDate = endDate;
      }

      return { rangeStartDate, rangeEndDate };
    };

    const range = getRange();
    let result;

    if (!range) {
      result = students
        .map((student) => ({
          ...student,
          points: student.totalPoints,
          periodPoints: student.totalPoints,
        }))
        .sort(compareStudents)
        .map((student, index) => ({ rank: index + 1, ...student }));
    } else {
      const records = await this.prisma.pointRecord.findMany({
        where: {
          classId,
          isRevoked: false,
        },
        select: {
          studentId: true,
          points: true,
          createdAt: true,
        },
      });

      const pointsMap = new Map<string, number>();
      for (const record of records) {
        const recordDate = formatLocalDate(new Date(record.createdAt));
        if (recordDate >= range.rangeStartDate && recordDate <= range.rangeEndDate) {
          pointsMap.set(
            record.studentId,
            (pointsMap.get(record.studentId) || 0) + record.points,
          );
        }
      }

      result = students
        .map((student) => {
          const points = pointsMap.get(student.id) || 0;
          return {
            ...student,
            points,
            periodPoints: points,
            totalPoints: student.totalPoints,
          };
        })
        .sort(compareStudents)
        .map((student, index) => ({ rank: index + 1, ...student }));
    }

    await this.redisService.set(cacheKey, result, 300);

    return result;
  }

  /**
   * 小组排行榜
   */
  async getGroupRanking(
    userId: string,
    classId: string,
    period: 'total' | 'week' | 'month' | 'custom' = 'total',
    startDate?: string,
    endDate?: string,
  ) {
    await this.verifyClassOwnership(userId, classId);

    const cacheKey = `dashboard:group-ranking:${classId}:${period}:${startDate || 'none'}:${endDate || 'none'}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const groups = await this.prisma.group.findMany({
      where: { classId },
      include: {
        students: {
          select: {
            id: true,
            name: true,
            totalPoints: true,
            availablePoints: true,
            studentNumber: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const getRange = () => {
      if (period === 'total') {
        return null;
      }

      const now = new Date();
      let rangeStartDate: string;
      let rangeEndDate: string;

      if (period === 'week') {
        const weekStart = new Date(now);
        const day = weekStart.getDay();
        const diff = day === 0 ? 6 : day - 1;
        weekStart.setDate(weekStart.getDate() - diff);
        rangeStartDate = formatLocalDate(weekStart);
        rangeEndDate = formatLocalDate(now);
      } else if (period === 'month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        rangeStartDate = formatLocalDate(monthStart);
        rangeEndDate = formatLocalDate(now);
      } else {
        if (!startDate || !endDate) {
          return null;
        }

        rangeStartDate = startDate;
        rangeEndDate = endDate;
      }

      return { rangeStartDate, rangeEndDate };
    };

    const range = getRange();
    const pointsMap = new Map<string, number>();
    const studentPointsMap = new Map<string, number>();

    if (range) {
      const studentGroupMap = new Map<string, string>();
      for (const group of groups) {
        for (const student of group.students) {
          studentGroupMap.set(student.id, group.id);
        }
      }

      const records = await this.prisma.pointRecord.findMany({
        where: {
          classId,
          isRevoked: false,
        },
        select: {
          studentId: true,
          points: true,
          createdAt: true,
        },
      });

      for (const record of records) {
        const recordDate = formatLocalDate(new Date(record.createdAt));
        if (recordDate < range.rangeStartDate || recordDate > range.rangeEndDate) {
          continue;
        }

        studentPointsMap.set(
          record.studentId,
          (studentPointsMap.get(record.studentId) || 0) + record.points,
        );

        const groupId = studentGroupMap.get(record.studentId);
        if (!groupId) {
          continue;
        }

        pointsMap.set(groupId, (pointsMap.get(groupId) || 0) + record.points);
      }
    }

    const ranked = groups
      .map((group) => {
        const totalPoints = range
          ? pointsMap.get(group.id) || 0
          : group.students.reduce(
              (sum, student) => sum + student.totalPoints,
              0,
            );
        const availablePoints = group.students.reduce(
          (sum, student) => sum + student.availablePoints,
          0,
        );
        const memberCount = group.students.length;
        const avgPoints =
          memberCount > 0 ? Math.round((totalPoints / memberCount) * 10) / 10 : 0;

        const members = group.students
          .map((student) => {
            const points = range
              ? studentPointsMap.get(student.id) || 0
              : student.totalPoints;

            return {
              id: student.id,
              name: student.name,
              totalPoints: student.totalPoints,
              availablePoints: student.availablePoints,
              studentNumber: student.studentNumber,
              points,
              periodPoints: points,
            };
          })
          .sort((a, b) => {
            if (b.points !== a.points) {
              return b.points - a.points;
            }
            if (b.totalPoints !== a.totalPoints) {
              return b.totalPoints - a.totalPoints;
            }
            if (b.availablePoints !== a.availablePoints) {
              return b.availablePoints - a.availablePoints;
            }
            if (a.studentNumber && b.studentNumber) {
              return a.studentNumber.localeCompare(b.studentNumber, 'zh-CN');
            }
            return a.name.localeCompare(b.name, 'zh-CN', {
              sensitivity: 'base',
            });
          });

        return {
          id: group.id,
          name: group.name,
          color: group.color,
          memberCount,
          totalPoints,
          availablePoints,
          points: totalPoints,
          avgPoints,
          members,
        };
      })
      .sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }
        return a.name.localeCompare(b.name, 'zh-CN', { sensitivity: 'base' });
      })
      .map((group, index) => ({ rank: index + 1, ...group }));

    await this.redisService.set(cacheKey, ranked, 300);

    return ranked;
  }

  /**
   * 积分趋势图（近7天或30天）
   */
  async getPointsTrend(userId: string, classId: string, days: number = 7) {
    await this.verifyClassOwnership(userId, classId);

    // 尝试从缓存获取
    const cacheKey = `dashboard:trend:${classId}:${days}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    const records = await this.prisma.pointRecord.findMany({
      where: { classId, createdAt: { gte: startDate }, isRevoked: false },
      select: { points: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const trendMap = new Map<string, { add: number; deduct: number }>();

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const key = date.toISOString().split('T')[0];
      trendMap.set(key, { add: 0, deduct: 0 });
    }

    for (const record of records) {
      const key = record.createdAt.toISOString().split('T')[0];
      const entry = trendMap.get(key);
      if (entry) {
        if (record.points > 0) entry.add += record.points;
        else entry.deduct += Math.abs(record.points);
      }
    }

    const result = Array.from(trendMap.entries()).map(([date, data]) => ({
      date,
      add: data.add,
      deduct: data.deduct,
      net: data.add - data.deduct,
    }));

    // 缓存5分钟
    await this.redisService.set(cacheKey, result, 300);

    return result;
  }

  /**
   * 积分分布（各分段学生数量）
   */
  async getPointsDistribution(userId: string, classId: string) {
    await this.verifyClassOwnership(userId, classId);

    // 尝试从缓存获取
    const cacheKey = `dashboard:distribution:${classId}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const students = await this.prisma.student.findMany({
      where: { classId },
      select: { totalPoints: true },
    });

    const ranges = [
      { label: '0分', min: 0, max: 0 },
      { label: '1-10分', min: 1, max: 10 },
      { label: '11-30分', min: 11, max: 30 },
      { label: '31-60分', min: 31, max: 60 },
      { label: '61-100分', min: 61, max: 100 },
      { label: '100分以上', min: 101, max: Infinity },
    ];

    const result = ranges.map((range) => ({
      label: range.label,
      count: students.filter(
        (s) => s.totalPoints >= range.min && s.totalPoints <= range.max,
      ).length,
    }));

    // 缓存5分钟
    await this.redisService.set(cacheKey, result, 300);

    return result;
  }
}
