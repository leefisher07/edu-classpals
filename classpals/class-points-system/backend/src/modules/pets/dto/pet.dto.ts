import {
  IsString,
  IsInt,
  IsEnum,
  IsOptional,
  Min,
  IsBoolean,
} from 'class-validator';
import { PetRarity, PointType } from '@prisma/client';

export class CreatePetDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(PetRarity)
  rarity?: PetRarity;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsString()
  eggImage: string;

  @IsString()
  babyImage: string;

  @IsString()
  teenImage: string;

  @IsString()
  adultImage: string;

  @IsString()
  finalImage: string;
}

export class UpdatePetDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(PetRarity)
  rarity?: PetRarity;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsString()
  eggImage?: string;

  @IsOptional()
  @IsString()
  babyImage?: string;

  @IsOptional()
  @IsString()
  teenImage?: string;

  @IsOptional()
  @IsString()
  adultImage?: string;

  @IsOptional()
  @IsString()
  finalImage?: string;
}

export class SelectPetDto {
  @IsString()
  petId: string;
}

export class UpdateGrowthThresholdDto {
  @IsInt()
  @Min(1)
  babyThreshold: number; // EGG -> BABY

  @IsInt()
  @Min(1)
  teenThreshold: number; // BABY -> TEEN

  @IsInt()
  @Min(1)
  adultThreshold: number; // TEEN -> ADULT

  @IsInt()
  @Min(1)
  finalThreshold: number; // ADULT -> FINAL
}

export class ChangePetPointsDto {
  @IsEnum(PointType)
  type: PointType;

  @IsInt()
  @Min(1)
  value: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  ruleId?: string;
}
