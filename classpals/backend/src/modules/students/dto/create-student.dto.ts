import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ParentPhoneDto {
  @IsString()
  @IsNotEmpty({ message: '手机号不能为空' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: '关系不能为空' })
  relationship: string; // 爸爸/妈妈/家长1/家长2/其他
}

export class CreateStudentDto {
  @IsArray()
  @IsNotEmpty({ message: '学生姓名不能为空' })
  names: string[];

  @IsEnum(['MALE', 'FEMALE'], { message: '性别只能是 MALE 或 FEMALE' })
  gender: 'MALE' | 'FEMALE';

  @IsString()
  @IsOptional()
  @MaxLength(500)
  avatar?: string;

  @IsString()
  @IsOptional()
  studentNumber?: string;

  @IsString()
  @IsOptional()
  groupId?: string;

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
