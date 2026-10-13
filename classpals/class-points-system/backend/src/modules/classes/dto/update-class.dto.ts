import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateClassDto {
  @IsString()
  @IsOptional()
  @MaxLength(50, { message: '班级名称最多50个字符' })
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50, { message: '班主任名称最多50个字符' })
  teacherName?: string;
}
