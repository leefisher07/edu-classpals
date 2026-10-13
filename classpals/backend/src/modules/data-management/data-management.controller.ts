import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DataManagementService } from './data-management.service';

@Controller('classes/:classId/data-management')
export class ClassDataManagementController {
  constructor(private readonly dataManagementService: DataManagementService) {}

  @Get('snapshots')
  listSnapshots(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
  ) {
    return this.dataManagementService.listSnapshots(userId, classId);
  }

  @Post('clear-points')
  clearClassPoints(
    @CurrentUser('id') userId: string,
    @CurrentUser('username') username: string,
    @Param('classId') classId: string,
  ) {
    return this.dataManagementService.clearClassPoints(
      userId,
      classId,
      username || '教师',
    );
  }

  @Post('import/preview')
  @UseInterceptors(FileInterceptor('file'))
  previewImportClassData(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { mode?: 'append' | 'replace' },
  ) {
    if (!file) {
      throw new BadRequestException('请上传文件');
    }

    return this.dataManagementService.previewImportClassData(
      userId,
      classId,
      file,
      body.mode,
    );
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importClassData(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { mode?: 'append' | 'replace' },
  ) {
    if (!file) {
      throw new BadRequestException('请上传文件');
    }

    return this.dataManagementService.importClassData(
      userId,
      classId,
      file,
      body.mode,
    );
  }

  @Get('import-template')
  async downloadImportTemplate(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
    @Res() res: Response,
  ) {
    const { fileName, buffer } =
      await this.dataManagementService.generateImportTemplate(userId, classId);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    );
    res.setHeader('Content-Length', buffer.length.toString());

    res.send(buffer);
  }

  @Get('export-importable')
  async exportImportableClassData(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
    @Res() res: Response,
  ) {
    const { fileName, buffer } =
      await this.dataManagementService.exportImportableClassData(userId, classId);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    );
    res.setHeader('Content-Length', buffer.length.toString());

    res.send(buffer);
  }

  @Get('export')
  async exportClassData(
    @CurrentUser('id') userId: string,
    @Param('classId') classId: string,
    @Res() res: Response,
  ) {
    const { fileName, buffer } =
      await this.dataManagementService.exportClassData(userId, classId);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    );
    res.setHeader('Content-Length', buffer.length.toString());

    res.send(buffer);
  }
}

@Controller('data-management')
export class DataManagementController {
  constructor(private readonly dataManagementService: DataManagementService) {}

  @Post('snapshots/:snapshotId/restore')
  restoreSnapshot(
    @CurrentUser('id') userId: string,
    @CurrentUser('username') username: string,
    @Param('snapshotId') snapshotId: string,
  ) {
    return this.dataManagementService.restoreSnapshot(
      userId,
      snapshotId,
      username || '教师',
    );
  }

  @Delete('students/:studentId')
  deleteStudentWithSnapshot(
    @CurrentUser('id') userId: string,
    @CurrentUser('username') username: string,
    @Param('studentId') studentId: string,
  ) {
    return this.dataManagementService.deleteStudentWithSnapshot(
      userId,
      studentId,
      username || '教师',
    );
  }
}
