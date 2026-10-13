import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateShareLinkDto,
  UpdateShareLinkDto,
  VerifyParentDto,
} from './dto/share.dto';
import { randomBytes } from 'crypto';

const API_ORIGIN = (
  process.env.PET_ASSET_BASE_URL ||
  process.env.APP_URL ||
  ''
).replace(/\/$/, '');

const STAGE_IMAGE_FIELD_MAP = {
  EGG: 'eggImage',
  BABY: 'babyImage',
  TEEN: 'teenImage',
  ADULT: 'adultImage',
  FINAL: 'finalImage',
} as const;

@Injectable()
export class ShareService {
  constructor(private readonly prisma: PrismaService) {}

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

  private resolveImageUrl(image?: string | null) {
    if (!image) return '';
    if (/^https?:\/\//.test(image)) return image;
    if (image.startsWith('/uploads/')) return image;
    if (API_ORIGIN && image.startsWith('/')) return `${API_ORIGIN}${image}`;
    return image;
  }

  private getPetImageByStage(
    pet: any,
    stage: keyof typeof STAGE_IMAGE_FIELD_MAP,
  ) {
    return this.resolveImageUrl(pet?.[STAGE_IMAGE_FIELD_MAP[stage]]);
  }

  private serializeLink(link: {
    id: string;
    token: string;
    expiresAt: Date;
    allowViewRanking: boolean;
    hidePointRecords: boolean;
    hideDeductions: boolean;
    isActive: boolean;
    createdAt: Date;
  }) {
    return {
      id: link.id,
      token: link.token,
      shareUrl: `/parent/${link.token}`,
      expiresAt: link.expiresAt,
      allowViewRanking: link.allowViewRanking,
      hidePointRecords: link.hidePointRecords,
      hideDeductions: link.hideDeductions,
      isActive: link.isActive,
      createdAt: link.createdAt,
    };
  }

  // ==================== 教师端：管理分享链接 ====================

  async createShareLink(
    userId: string,
    studentId: string,
    dto: CreateShareLinkDto,
  ) {
    await this.verifyStudentOwnership(userId, studentId);

    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const latestLink = await this.prisma.shareLink.findFirst({
      where: { studentId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    if (!latestLink) {
      const token = randomBytes(32).toString('hex');
      const link = await this.prisma.shareLink.create({
        data: {
          studentId,
          token,
          expiresAt,
          allowViewRanking: dto.allowViewRanking ?? true,
          hidePointRecords: dto.hidePointRecords ?? false,
          hideDeductions: dto.hidePointRecords
            ? false
            : (dto.hideDeductions ?? false),
          isActive: true,
        },
      });

      return this.serializeLink(link);
    }

    const updated = await this.prisma.shareLink.update({
      where: { id: latestLink.id },
      data: {
        expiresAt,
        allowViewRanking: dto.allowViewRanking ?? latestLink.allowViewRanking,
        hidePointRecords: dto.hidePointRecords ?? latestLink.hidePointRecords,
        hideDeductions:
          dto.hidePointRecords === true
            ? false
            : (dto.hideDeductions ?? latestLink.hideDeductions),
      },
    });

    return this.serializeLink(updated);
  }

  async getStudentShareLinks(userId: string, studentId: string) {
    await this.verifyStudentOwnership(userId, studentId);

    const links = await this.prisma.shareLink.findMany({
      where: { studentId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    const [currentLink, ...historyLinks] = links;

    return {
      currentLink: currentLink ? this.serializeLink(currentLink) : null,
      historyLinks: historyLinks.map((link) => this.serializeLink(link)),
      historyCount: historyLinks.length,
      totalCount: links.length,
    };
  }

  async updateShareLink(
    userId: string,
    linkId: string,
    dto: UpdateShareLinkDto,
  ) {
    const link = await this.prisma.shareLink.findUnique({
      where: { id: linkId },
      include: { student: { include: { class: true } } },
    });

    if (!link) throw new NotFoundException('分享链接不存在');
    if (link.student.class.userId !== userId)
      throw new ForbiddenException('无权操作此链接');

    const nextHidePointRecords = dto.hidePointRecords ?? link.hidePointRecords;
    const nextHideDeductions = nextHidePointRecords
      ? false
      : (dto.hideDeductions ?? link.hideDeductions);

    const updated = await this.prisma.shareLink.update({
      where: { id: linkId },
      data: {
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        allowViewRanking: dto.allowViewRanking,
        hidePointRecords: dto.hidePointRecords,
        hideDeductions: nextHideDeductions,
        isActive: dto.isActive,
      },
    });

    return this.serializeLink({
      ...updated,
      hidePointRecords: nextHidePointRecords,
      hideDeductions: nextHideDeductions,
    });
  }

  async deleteShareLink(userId: string, linkId: string) {
    const link = await this.prisma.shareLink.findUnique({
      where: { id: linkId },
      include: { student: { include: { class: true } } },
    });

    if (!link) throw new NotFoundException('分享链接不存在');
    if (link.student.class.userId !== userId)
      throw new ForbiddenException('无权操作此链接');

    await this.prisma.shareLink.delete({ where: { id: linkId } });

    return { message: '删除成功' };
  }

  // ==================== 家长端：验证和查看数据 ====================

  private async validateToken(token: string) {
    const link = await this.prisma.shareLink.findUnique({
      where: { token },
      include: {
        student: {
          include: {
            class: true,
            parents: true,
          },
        },
      },
    });

    if (!link) throw new NotFoundException('链接不存在');
    if (!link.isActive) throw new BadRequestException('链接已停用');
    if (link.expiresAt < new Date())
      throw new BadRequestException('链接已过期');

    return link;
  }

  async verifyParent(token: string, dto: VerifyParentDto) {
    const link = await this.validateToken(token);
    const phone = dto.phone.trim();

    let parentPhone = link.student.parents.find((p) => p.phone === phone);

    if (!parentPhone) {
      if (link.student.parents.length >= 2) {
        throw new UnauthorizedException('手机号不匹配，请使用绑定的家长手机号');
      }

      parentPhone = await this.prisma.parentPhone.create({
        data: {
          studentId: link.student.id,
          phone,
          relationship: link.student.parents.length === 0 ? '家长1' : '家长2',
        },
      });
    }

    return {
      verified: true,
      studentName: link.student.name,
      relationship: parentPhone.relationship,
    };
  }

  async getParentView(token: string, parentPhone: string) {
    const link = await this.validateToken(token);
    const normalizedPhone = parentPhone.trim();

    // Verify parent phone
    const matchedParent = link.student.parents.find(
      (p) => p.phone === normalizedPhone,
    );
    if (!matchedParent) throw new UnauthorizedException('未授权访问');

    const student = link.student;

    // Get point records if not hidden
    let pointRecords: any[] | null = null;
    if (!link.hidePointRecords) {
      pointRecords = await this.prisma.pointRecord.findMany({
        where: {
          studentId: student.id,
          isRevoked: false,
          ...(link.hideDeductions ? { points: { gt: 0 } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          points: true,
          reason: true,
          operatorName: true,
          createdAt: true,
        },
      });
    }

    // Get ranking if allowed
    let ranking: { rank: number; total: number } | null = null;
    if (link.allowViewRanking) {
      const students = await this.prisma.student.findMany({
        where: { classId: student.classId },
        orderBy: { totalPoints: 'desc' },
        select: { id: true, totalPoints: true },
      });
      const rank = students.findIndex((s) => s.id === student.id) + 1;
      ranking = { rank, total: students.length };
    }

    // Get pet info
    const pet = await this.prisma.studentPet.findUnique({
      where: { studentId: student.id },
      include: { pet: true },
    });

    return {
      student: {
        id: student.id,
        name: student.name,
        avatarBgColor: student.avatarBgColor,
        totalPoints: student.totalPoints,
        availablePoints: student.availablePoints,
        className: student.class.name,
      },
      link: {
        expiresAt: link.expiresAt,
        allowViewRanking: link.allowViewRanking,
        hidePointRecords: link.hidePointRecords,
        hideDeductions: link.hideDeductions,
        isActive: link.isActive,
      },
      parent: {
        relationship: matchedParent.relationship,
        phone: matchedParent.phone,
      },
      ranking,
      pointRecords: pointRecords?.map((r) => ({
        type: r.points > 0 ? 'ADD' : 'DEDUCT',
        value: Math.abs(r.points),
        reason: r.reason,
        operatorName: r.operatorName,
        createdAt: r.createdAt,
      })),
      pet: pet
        ? {
            name: pet.pet.name,
            stage: pet.stage,
            experience: pet.experience,
            category: pet.pet.category ?? pet.pet.type,
            rarity: pet.pet.rarity,
            currentImage: this.getPetImageByStage(pet.pet, pet.stage),
          }
        : null,
    };
  }
}
