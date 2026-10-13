import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('classes/:classId/students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
    @Body() createStudentDto: CreateStudentDto,
  ) {
    return this.studentsService.create(userId, classId, createStudentDto);
  }

  @Get()
  findAll(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
    @Query() query: { search?: string; sortBy?: string; sortDesc?: string },
  ) {
    return this.studentsService.findAll(userId, classId, query);
  }
}

@Controller('students')
export class StudentController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get(':id')
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.studentsService.findOne(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateStudentDto: UpdateStudentDto,
  ) {
    return this.studentsService.update(userId, id, updateStudentDto);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.studentsService.remove(userId, id);
  }
}
