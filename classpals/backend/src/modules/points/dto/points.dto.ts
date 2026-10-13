import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  IsArray,
} from 'class-validator';

export class AddPointsDto {
  @IsEnum(['ADD', 'DEDUCT'])
  type: 'ADD' | 'DEDUCT';

  @IsInt()
  @Min(1, { message: '分值至少为1' })
  value: number;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  ruleId?: string;
}

export class BatchPointsDto {
  @IsArray()
  studentIds: string[];

  @IsEnum(['ADD', 'DEDUCT'])
  type: 'ADD' | 'DEDUCT';

  @IsInt()
  @Min(1)
  value: number;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  ruleId?: string;
}
