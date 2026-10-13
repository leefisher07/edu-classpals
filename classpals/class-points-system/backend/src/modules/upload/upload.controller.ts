import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UploadService } from './upload.service';
import { UploadRateLimitInterceptor } from '../../common/interceptors/upload-rate-limit.interceptor';

@Controller('upload')
@UseGuards(JwtAuthGuard)
@UseInterceptors(UploadRateLimitInterceptor)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('请上传文件');
    }

    return this.uploadService.uploadAvatar(userId, file);
  }

  @Post('pet-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPetImage(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('请上传文件');
    }

    return this.uploadService.uploadPetImage(userId, file);
  }

  @Post('shop-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadShopImage(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('请上传文件');
    }

    return this.uploadService.uploadShopImage(userId, file);
  }
}
