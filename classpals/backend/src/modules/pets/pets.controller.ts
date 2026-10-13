import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { PetsService } from './pets.service';
import {
  CreatePetDto,
  UpdatePetDto,
  SelectPetDto,
  ChangePetPointsDto,
} from './dto/pet.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('classes/:classId/pets')
export class ClassPetsController {
  constructor(private readonly petsService: PetsService) {}

  @Get()
  getClassPets(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
  ) {
    return this.petsService.getClassPets(userId, classId);
  }

  @Get('records')
  getClassPetPointRecords(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
    @Query()
    query: {
      studentName?: string;
      startDate?: string;
      endDate?: string;
      type?: 'all' | 'add' | 'deduct';
      page?: string;
      limit?: string;
    },
  ) {
    return this.petsService.getClassPetPointRecords(userId, classId, query);
  }
}

@Controller('pets/gallery')
@UseGuards(RolesGuard)
export class PetGalleryController {
  constructor(private readonly petsService: PetsService) {}

  @Post()
  @Roles('ADMIN')
  createPet(@Body() dto: CreatePetDto) {
    return this.petsService.createPetGallery(dto);
  }

  @Get()
  @Public()
  findAll(@Query('includeDisabled') includeDisabled?: string) {
    return this.petsService.findAllPetGallery(includeDisabled === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.petsService.findOnePetGallery(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdatePetDto) {
    return this.petsService.updatePetGallery(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.petsService.removePetGallery(id);
  }
}

@Controller('students/:studentId/pet')
export class StudentPetController {
  constructor(private readonly petsService: PetsService) {}

  @Post('select')
  selectPet(
    @CurrentUser('id') userId: string,
    @Param('studentId') studentId: string,
    @Body() dto: SelectPetDto,
  ) {
    return this.petsService.selectPet(userId, studentId, dto);
  }

  @Get()
  getPet(
    @CurrentUser('id') userId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.petsService.getStudentPet(userId, studentId);
  }

  @Post('points')
  changePetPoints(
    @CurrentUser('id') userId: string,
    @CurrentUser('username') operatorName: string,
    @Param('studentId') studentId: string,
    @Body() dto: ChangePetPointsDto,
  ) {
    return this.petsService.changePetPoints(
      userId,
      studentId,
      dto,
      operatorName || '老师',
    );
  }

  @Get('points/history')
  getPetPointHistory(
    @CurrentUser('id') userId: string,
    @Param('studentId') studentId: string,
    @Query() query: { page?: string; limit?: string },
  ) {
    return this.petsService.getPetPointHistory(userId, studentId, query);
  }

  @Delete()
  resetPet(
    @CurrentUser('id') userId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.petsService.resetStudentPet(userId, studentId);
  }
}
