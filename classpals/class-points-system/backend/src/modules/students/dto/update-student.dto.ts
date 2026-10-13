import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  MaxLength,
  Matches,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ParentPhoneDto {
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @IsString()
  relationship: string;
}

export class UpdateStudentDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  name?: string;

  @IsEnum(['MALE', 'FEMALE'])
  @IsOptional()
  gender?: 'MALE' | 'FEMALE';

  @ValidateIf((_, value) => value !== null)
  @IsString()
  @IsOptional()
  @MaxLength(500)
  avatar?: string | null;

  @IsString()
  @IsOptional()
  studentNumber?: string;

  @IsOptional()
  groupId?: string | null;

  @IsBoolean()
  @IsOptional()
  isCadre?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  cadrePosition?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  customPosition?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ParentPhoneDto)
  parentPhones?: ParentPhoneDto[];
}
