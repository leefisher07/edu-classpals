import { Injectable, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { extname } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

@Injectable()
export class UploadService {
  private readonly uploadDir = join(process.cwd(), 'uploads');
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly allowedImageTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  private readonly allowedExtensions = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
  ];

  constructor() {
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    if (!existsSync(this.uploadDir)) {
      await mkdir(this.uploadDir, { recursive: true });
    }
    // Create subdirectories
    const subdirs = ['avatars', 'pets', 'shop'];
    for (const subdir of subdirs) {
      const path = join(this.uploadDir, subdir);
      if (!existsSync(path)) {
        await mkdir(path, { recursive: true });
      }
    }
  }

  private validateFile(file: Express.Multer.File) {
    // 1. Check file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `文件大小不能超过 ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    // 2. Check MIME type
    if (!this.allowedImageTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        '只允许上传图片文件（JPG、PNG、GIF、WebP）',
      );
    }

    // 3. Check file extension
    const ext = extname(file.originalname).toLowerCase();
    if (!this.allowedExtensions.includes(ext)) {
      throw new BadRequestException('不支持的文件扩展名');
    }

    // 4. Check file buffer (basic magic number check)
    if (!this.isValidImageBuffer(file.buffer)) {
      throw new BadRequestException('文件内容不是有效的图片');
    }

    return true;
  }

  private isValidImageBuffer(buffer: Buffer): boolean {
    // Check magic numbers for common image formats
    const magicNumbers = {
      jpg: [0xff, 0xd8, 0xff],
      png: [0x89, 0x50, 0x4e, 0x47],
      gif: [0x47, 0x49, 0x46],
      webp: [0x52, 0x49, 0x46, 0x46], // RIFF
    };

    // Check if buffer starts with any valid magic number
    for (const [format, magic] of Object.entries(magicNumbers)) {
      let isMatch = true;
      for (let i = 0; i < magic.length; i++) {
        if (buffer[i] !== magic[i]) {
          isMatch = false;
          break;
        }
      }
      if (isMatch) return true;
    }

    return false;
  }

  private generateFileName(originalName: string): string {
    const ext = extname(originalName);
    const randomName = randomBytes(16).toString('hex');
    const timestamp = Date.now();
    return `${timestamp}-${randomName}${ext}`;
  }

  private async saveFile(
    file: Express.Multer.File,
    subdir: string,
  ): Promise<string> {
    this.validateFile(file);

    const fileName = this.generateFileName(file.originalname);
    const filePath = join(this.uploadDir, subdir, fileName);

    await writeFile(filePath, file.buffer);

    // Return relative URL
    return `/uploads/${subdir}/${fileName}`;
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const url = await this.saveFile(file, 'avatars');

    return {
      url,
      fileName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  async uploadPetImage(userId: string, file: Express.Multer.File) {
    const url = await this.saveFile(file, 'pets');

    return {
      url,
      fileName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  async uploadShopImage(userId: string, file: Express.Multer.File) {
    const url = await this.saveFile(file, 'shop');

    return {
      url,
      fileName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  }
}
