import {
  IsString,
  IsInt,
  IsEnum,
  IsBoolean,
  IsOptional,
  Min,
} from 'class-validator';
import { PointType } from '@prisma/client';

export class CreateRuleDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  points: number;

  @IsEnum(PointType)
  type: PointType;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  icon?: string;
}

export class UpdateRuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;

  @IsOptional()
  @IsEnum(PointType)
  type?: PointType;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class UpdateRuleSortDto {
  @IsString({ each: true })
  ruleIds: string[];
}
