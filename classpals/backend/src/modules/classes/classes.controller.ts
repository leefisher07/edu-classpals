import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() createClassDto: CreateClassDto,
  ) {
    return this.classesService.create(userId, createClassDto);
  }

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.classesService.findAll(userId);
  }

  @Get(':id')
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.classesService.findOne(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateClassDto: UpdateClassDto,
  ) {
    return this.classesService.update(userId, id, updateClassDto);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.classesService.remove(userId, id);
  }

  @Post(':id/activate')
  activate(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.classesService.activate(userId, id);
  }
}
