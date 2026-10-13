import { IsInt, IsOptional, IsEnum, Min } from 'class-validator';

export class UpdatePetSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  eggToBaby?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  babyToTeen?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  teenToAdult?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  adultToFinal?: number;

  @IsOptional()
  @IsEnum(['STUDENT_CHOOSE', 'TEACHER_ASSIGN'])
  assignMode?: 'STUDENT_CHOOSE' | 'TEACHER_ASSIGN';
}
