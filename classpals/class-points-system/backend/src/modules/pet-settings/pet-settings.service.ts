import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdatePetSettingsDto } from './dto/pet-settings.dto';

@Injectable()
export class PetSettingsService {
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

  async getSettings(userId: string, classId: string) {
    await this.verifyClassOwnership(userId, classId);

    const settings = await this.prisma.petSettings.findUnique({
      where: { classId },
    });

    if (!settings) {
      // Return defaults if not configured yet
      return {
        classId,
        eggToBaby: 10,
        babyToTeen: 30,
        teenToAdult: 60,
        adultToFinal: 100,
        assignMode: 'TEACHER_ASSIGN',
      };
    }

    return settings;
  }

  async upsertSettings(
    userId: string,
    classId: string,
    dto: UpdatePetSettingsDto,
  ) {
    await this.verifyClassOwnership(userId, classId);

    const settings = await this.prisma.petSettings.upsert({
      where: { classId },
      create: {
        classId,
        eggToBaby: dto.eggToBaby ?? 10,
        babyToTeen: dto.babyToTeen ?? 30,
        teenToAdult: dto.teenToAdult ?? 60,
        adultToFinal: dto.adultToFinal ?? 100,
        assignMode: dto.assignMode ?? 'TEACHER_ASSIGN',
      },
      update: {
        ...(dto.eggToBaby !== undefined && { eggToBaby: dto.eggToBaby }),
        ...(dto.babyToTeen !== undefined && { babyToTeen: dto.babyToTeen }),
        ...(dto.teenToAdult !== undefined && { teenToAdult: dto.teenToAdult }),
        ...(dto.adultToFinal !== undefined && {
          adultToFinal: dto.adultToFinal,
        }),
        ...(dto.assignMode !== undefined && { assignMode: dto.assignMode }),
      },
    });

    return settings;
  }
}
