import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController, StudentController } from './students.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StudentsController, StudentController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
