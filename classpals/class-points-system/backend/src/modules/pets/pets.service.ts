import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePetDto,
  UpdatePetDto,
  SelectPetDto,
  ChangePetPointsDto,
} from './dto/pet.dto';
import { PetStage } from '@prisma/client';

const ASSET_BASE_URL = process.env.PET_ASSET_BASE_URL?.replace(/\/$/, '') || '';

// Default growth thresholds (can be customized per class)
const DEFAULT_THRESHOLDS = {
  eggToBaby: 10,
  babyToTeen: 30,
  teenToAdult: 60,
  adultToFinal: 100,
};

interface GrowthThresholds {
  eggToBaby: number;
  babyToTeen: number;
  teenToAdult: number;
  adultToFinal: number;
}

interface StageSyncResult {
  stage: PetStage;
  level: number;
  changed: boolean;
  fromStage?: PetStage;
  toStage?: PetStage;
}

@Injectable()
export class PetsService {
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
      include: { class: true, pet: true },
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
    if (ASSET_BASE_URL && image.startsWith('/'))
      return `${ASSET_BASE_URL}${image}`;
    return image;
  }

  private mapGalleryItem(pet: any) {
    return {
      id: pet.id,
      nameZh: pet.name,
      nameEn: pet.type,
      category: pet.category ?? pet.type,
      type: pet.type,
      rarity: pet.rarity,
      description: pet.description,
      source: pet.source,
      version: pet.version,
      isEnabled: pet.isEnabled,
      image: this.resolveImageUrl(pet.babyImage),
      stages: [
        { key: 'egg', image: this.resolveImageUrl(pet.eggImage) },
        { key: 'baby', image: this.resolveImageUrl(pet.babyImage) },
        { key: 'teen', image: this.resolveImageUrl(pet.teenImage) },
        { key: 'adult', image: this.resolveImageUrl(pet.adultImage) },
        { key: 'final', image: this.resolveImageUrl(pet.finalImage) },
      ],
    };
  }

  private getStageNumber(stage: PetStage) {
    const stageToNum: Record<PetStage, number> = {
      EGG: 1,
      BABY: 2,
      TEEN: 3,
      ADULT: 4,
      FINAL: 5,
    };

    return stageToNum[stage];
  }

  private resolveStage(
    experience: number,
    thresholds: GrowthThresholds,
  ): PetStage {
    if (experience <= 0) return 'EGG';
    if (experience >= thresholds.adultToFinal) return 'FINAL';
    if (experience >= thresholds.teenToAdult) return 'ADULT';
    if (experience >= thresholds.babyToTeen) return 'TEEN';
    if (experience >= thresholds.eggToBaby) return 'BABY';
    return 'EGG';
  }

  private syncStage(
    currentStage: PetStage,
    experience: number,
    thresholds: GrowthThresholds,
  ): StageSyncResult {
    const stage = this.resolveStage(experience, thresholds);
    const level = this.getStageNumber(stage);

    if (stage === currentStage) {
      return { stage, level, changed: false };
    }

    return {
      stage,
      level,
      changed: true,
      fromStage: currentStage,
      toStage: stage,
    };
  }

  private getStageImage(pet: any, stage: PetStage) {
    const imageMap: Record<PetStage, string> = {
      EGG: pet.eggImage,
      BABY: pet.babyImage,
      TEEN: pet.teenImage,
      ADULT: pet.adultImage,
      FINAL: pet.finalImage,
    };

    return this.resolveImageUrl(imageMap[stage]);
  }

  async createPetGallery(dto: CreatePetDto) {
    const maxSort = await this.prisma.petGallery.aggregate({
      _max: { sortOrder: true },
    });

    const pet = await this.prisma.petGallery.create({
      data: {
        name: dto.name,
        type: dto.type,
        category: dto.category,
        rarity: dto.rarity || 'COMMON',
        description: dto.description,
        source: dto.source,
        version: dto.version || 1,
        isEnabled: dto.isEnabled ?? true,
        eggImage: dto.eggImage,
        babyImage: dto.babyImage,
        teenImage: dto.teenImage,
        adultImage: dto.adultImage,
        finalImage: dto.finalImage,
        sortOrder: (maxSort._max.sortOrder || 0) + 1,
      },
    });

    return pet;
  }

  async findAllPetGallery(includeDisabled = false) {
    const pets = await this.prisma.petGallery.findMany({
      where: includeDisabled ? undefined : { isEnabled: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return {
      gallery: pets.map((pet) => this.mapGalleryItem(pet)),
      total: pets.length,
    };
  }

  async findOnePetGallery(id: string) {
    const pet = await this.prisma.petGallery.findUnique({
      where: { id },
    });

    if (!pet) throw new NotFoundException('宠物不存在');

    return this.mapGalleryItem(pet);
  }

  async updatePetGallery(id: string, dto: UpdatePetDto) {
    const pet = await this.prisma.petGallery.findUnique({
      where: { id },
    });

    if (!pet) throw new NotFoundException('宠物不存在');

    const updated = await this.prisma.petGallery.update({
      where: { id },
      data: {
        ...dto,
        version: dto.version ?? pet.version + 1,
      },
    });

    return this.mapGalleryItem(updated);
  }

  async removePetGallery(id: string) {
    const pet = await this.prisma.petGallery.findUnique({
      where: { id },
    });

    if (!pet) throw new NotFoundException('宠物不存在');

    await this.prisma.petGallery.delete({ where: { id } });

    return { message: '删除成功' };
  }

  // ==================== Student Pet Management ====================

  async selectPet(userId: string, studentId: string, dto: SelectPetDto) {
    const student = await this.verifyStudentOwnership(userId, studentId);

    const petGallery = await this.prisma.petGallery.findUnique({
      where: { id: dto.petId },
    });

    if (!petGallery || !petGallery.isEnabled)
      throw new NotFoundException('宠物不存在');

    const settings = await this.prisma.petSettings.findUnique({
      where: { classId: student.classId },
    });
    const thresholds = settings ?? DEFAULT_THRESHOLDS;

    const existingExperience = student.pet?.experience ?? 0;
    const targetStage = student.pet
      ? this.resolveStage(existingExperience, thresholds)
      : 'EGG';
    const targetLevel = this.getStageNumber(targetStage);

    const existingPet = student.pet
      ? await this.prisma.studentPet.update({
          where: { id: student.pet.id },
          data: {
            petId: dto.petId,
            stage: targetStage,
            experience: existingExperience,
            level: targetLevel,
          },
          include: {
            pet: true,
          },
        })
      : await this.prisma.studentPet.create({
          data: {
            studentId,
            petId: dto.petId,
            stage: targetStage,
            experience: existingExperience,
            level: targetLevel,
          },
          include: {
            pet: true,
          },
        });

    return {
      id: existingPet.id,
      studentId,
      petId: existingPet.petId,
      petName: existingPet.pet.name,
      petType: existingPet.pet.type,
      category: existingPet.pet.category ?? existingPet.pet.type,
      stage: existingPet.stage,
      stageNum: this.getStageNumber(existingPet.stage),
      experience: existingPet.experience,
      growthValue: existingPet.experience,
      level: existingPet.level,
      currentImage: this.getStageImage(existingPet.pet, existingPet.stage),
    };
  }

  async getStudentPet(userId: string, studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: true,
        pet: {
          include: {
            pet: true,
            growthRecords: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        },
      },
    });

    if (!student) throw new NotFoundException('学生不存在');
    if (student.class.userId !== userId)
      throw new ForbiddenException('无权查看此学生');

    if (!student.pet) {
      return null;
    }

    const settings = await this.prisma.petSettings.findUnique({
      where: { classId: student.classId },
    });
    const thresholds = settings ?? DEFAULT_THRESHOLDS;

    return {
      id: student.pet.id,
      studentId: student.id,
      petId: student.pet.petId,
      petName: student.pet.pet.name,
      petType: student.pet.pet.type,
      category: student.pet.pet.category ?? student.pet.pet.type,
      rarity: student.pet.pet.rarity,
      stage: student.pet.stage,
      stageNum: this.getStageNumber(student.pet.stage),
      experience: student.pet.experience,
      growthValue: student.pet.experience,
      level: student.pet.level,
      currentImage: this.getStageImage(student.pet.pet, student.pet.stage),
      nextStageThreshold: this.getNextThreshold(
        student.pet.stage,
        student.pet.experience,
        thresholds,
      ),
      gallery: this.mapGalleryItem(student.pet.pet),
      growthRecords: student.pet.growthRecords,
    };
  }

  async resetStudentPet(userId: string, studentId: string) {
    const student = await this.verifyStudentOwnership(userId, studentId);

    if (!student.pet) {
      throw new BadRequestException('该学生未选择宠物');
    }

    await this.prisma.studentPet.update({
      where: { id: student.pet.id },
      data: {
        stage: 'EGG',
        experience: 0,
        level: this.getStageNumber('EGG'),
      },
    });

    return {
      message: '已回到蛋态',
      pet: await this.getStudentPet(userId, studentId),
    };
  }

  async changePetPoints(
    userId: string,
    studentId: string,
    dto: ChangePetPointsDto,
    operatorName: string,
  ) {
    const student = await this.verifyStudentOwnership(userId, studentId);

    if (!student.pet) {
      throw new BadRequestException('该学生尚未领养宠物');
    }

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
    const nextExperience = Math.max(0, student.pet.experience + delta);
    const settings = await this.prisma.petSettings.findUnique({
      where: { classId: student.classId },
    });
    const thresholds = settings ?? DEFAULT_THRESHOLDS;
    const stageSync = this.syncStage(
      student.pet.stage,
      nextExperience,
      thresholds,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.studentPet.update({
        where: { id: student.pet!.id },
        data: {
          experience: nextExperience,
          stage: stageSync.stage,
          level: stageSync.level,
        },
      });

      await tx.petPointRecord.create({
        data: {
          classId: student.classId,
          studentId: student.id,
          studentPetId: student.pet!.id,
          points: delta,
          reason:
            dto.reason || (dto.type === 'ADD' ? '宠物加经验' : '宠物扣经验'),
          ruleId: dto.ruleId,
          operatorId: userId,
          operatorName,
        },
      });

      if (stageSync.changed && stageSync.fromStage && stageSync.toStage) {
        await tx.petGrowthRecord.create({
          data: {
            studentPetId: student.pet!.id,
            fromStage: stageSync.fromStage,
            toStage: stageSync.toStage,
          },
        });
      }
    });

    return this.getStudentPet(userId, studentId);
  }

  async getPetPointHistory(
    userId: string,
    studentId: string,
    query: { page?: string; limit?: string },
  ) {
    const student = await this.verifyStudentOwnership(userId, studentId);

    if (!student.pet) {
      return { records: [], total: 0, page: 1, limit: 20 };
    }

    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.prisma.petPointRecord.findMany({
        where: { studentPetId: student.pet.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.petPointRecord.count({
        where: { studentPetId: student.pet.id },
      }),
    ]);

    return {
      records: records.map((record) => ({
        id: record.id,
        type: record.points > 0 ? 'ADD' : 'DEDUCT',
        value: Math.abs(record.points),
        points: record.points,
        reason: record.reason,
        operatorName: record.operatorName,
        createdAt: record.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  // ==================== Class Pets Overview ====================

  async getClassPets(userId: string, classId: string) {
    await this.verifyClassOwnership(userId, classId);

    const [students, settings] = await Promise.all([
      this.prisma.student.findMany({
        where: { classId },
        include: {
          pet: {
            include: { pet: true },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { studentNumber: 'asc' }],
      }),
      this.prisma.petSettings.findUnique({ where: { classId } }),
    ]);

    const thresholds: GrowthThresholds = settings ?? DEFAULT_THRESHOLDS;
    const byStage = { EGG: 0, BABY: 0, TEEN: 0, ADULT: 0, FINAL: 0 };

    const pets = students.flatMap((student) => {
      if (!student.pet) return [];

      byStage[student.pet.stage]++;

      return [
        {
          id: student.pet.id,
          studentId: student.id,
          studentName: student.name,
          petId: student.pet.petId,
          petName: student.pet.pet.name,
          petType: student.pet.pet.type,
          category: student.pet.pet.category ?? student.pet.pet.type,
          rarity: student.pet.pet.rarity,
          stage: student.pet.stage,
          stageNum: this.getStageNumber(student.pet.stage),
          experience: student.pet.experience,
          growthValue: student.pet.experience,
          level: student.pet.level,
          currentImage: this.getStageImage(student.pet.pet, student.pet.stage),
          nextStageThreshold: this.getNextThreshold(
            student.pet.stage,
            student.pet.experience,
            thresholds,
          ),
          gallery: this.mapGalleryItem(student.pet.pet),
        },
      ];
    });

    return {
      pets,
      settings: {
        eggToBaby: thresholds.eggToBaby,
        babyToTeen: thresholds.babyToTeen,
        teenToAdult: thresholds.teenToAdult,
        adultToFinal: thresholds.adultToFinal,
        assignMode: settings?.assignMode ?? 'TEACHER_ASSIGN',
      },
      stats: {
        totalStudents: students.length,
        withPet: pets.length,
        withoutPet: students.length - pets.length,
        byStage,
      },
    };
  }

  async getClassPetPointRecords(
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

    const where: any = { classId };

    if (query.studentName) {
      where.student = { name: { contains: query.studentName } };
    }

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

    if (query.type === 'add') {
      where.points = { gt: 0 };
    } else if (query.type === 'deduct') {
      where.points = { lt: 0 };
    }

    const [records, total] = await Promise.all([
      this.prisma.petPointRecord.findMany({
        where,
        include: {
          student: { select: { id: true, name: true, studentNumber: true } },
          rule: { select: { id: true, name: true } },
          studentPet: {
            include: {
              pet: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  category: true,
                  rarity: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.petPointRecord.count({ where }),
    ]);

    return {
      records: records.map((record) => ({
        id: record.id,
        student: record.student,
        pet: record.studentPet?.pet
          ? {
              id: record.studentPet.pet.id,
              name: record.studentPet.pet.name,
              type: record.studentPet.pet.type,
              category:
                record.studentPet.pet.category ?? record.studentPet.pet.type,
              rarity: record.studentPet.pet.rarity,
            }
          : null,
        type: record.points > 0 ? 'ADD' : 'DEDUCT',
        value: Math.abs(record.points),
        points: record.points,
        reason: record.reason,
        ruleName: record.rule?.name,
        operatorName: record.operatorName,
        createdAt: record.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==================== Pet Growth Logic ====================

  async checkAndUpgradePet(studentId: string, thresholds?: GrowthThresholds) {
    const studentPet = await this.prisma.studentPet.findUnique({
      where: { studentId },
      include: { pet: true },
    });

    if (!studentPet) return null;

    const stageSync = this.syncStage(
      studentPet.stage,
      studentPet.experience,
      thresholds ?? DEFAULT_THRESHOLDS,
    );
    if (!stageSync.changed || !stageSync.fromStage || !stageSync.toStage) {
      return null;
    }

    const fromStage = stageSync.fromStage;
    const toStage = stageSync.toStage;

    await this.prisma.$transaction(async (tx) => {
      await tx.studentPet.update({
        where: { id: studentPet.id },
        data: { stage: stageSync.stage, level: stageSync.level },
      });

      await tx.petGrowthRecord.create({
        data: {
          studentPetId: studentPet.id,
          fromStage,
          toStage,
        },
      });
    });

    return {
      upgraded: this.getStageNumber(toStage) > this.getStageNumber(fromStage),
      fromStage,
      toStage,
      petName: studentPet.pet.name,
    };
  }

  async addPetExperience(studentId: string, points: number) {
    const studentPet = await this.prisma.studentPet.findUnique({
      where: { studentId },
      include: { student: { select: { classId: true } } },
    });

    if (!studentPet) return null;

    const nextExperience = Math.max(0, studentPet.experience + points);
    await this.prisma.studentPet.update({
      where: { id: studentPet.id },
      data: { experience: nextExperience },
    });

    const settings = await this.prisma.petSettings.findUnique({
      where: { classId: studentPet.student.classId },
    });

    return this.checkAndUpgradePet(studentId, settings ?? DEFAULT_THRESHOLDS);
  }

  private getNextThreshold(
    stage: PetStage,
    currentExp: number,
    thresholds: GrowthThresholds,
  ) {
    switch (stage) {
      case 'BABY':
        return {
          stage: 'TEEN',
          threshold: thresholds.babyToTeen,
          remaining: Math.max(0, thresholds.babyToTeen - currentExp),
        };
      case 'TEEN':
        return {
          stage: 'ADULT',
          threshold: thresholds.teenToAdult,
          remaining: Math.max(0, thresholds.teenToAdult - currentExp),
        };
      case 'ADULT':
        return {
          stage: 'FINAL',
          threshold: thresholds.adultToFinal,
          remaining: Math.max(0, thresholds.adultToFinal - currentExp),
        };
      case 'FINAL':
        return null;
      case 'EGG':
      default:
        return {
          stage: 'BABY',
          threshold: thresholds.eggToBaby,
          remaining: Math.max(0, thresholds.eggToBaby - currentExp),
        };
    }
  }
}
