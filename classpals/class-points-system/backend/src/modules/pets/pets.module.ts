import { Module } from '@nestjs/common';
import { PetsService } from './pets.service';
import {
  ClassPetsController,
  PetGalleryController,
  StudentPetController,
} from './pets.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    ClassPetsController,
    PetGalleryController,
    StudentPetController,
  ],
  providers: [PetsService],
  exports: [PetsService],
})
export class PetsModule {}
