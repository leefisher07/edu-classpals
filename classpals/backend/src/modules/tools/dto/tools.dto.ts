import { IsInt, IsOptional, IsArray, IsString, Min } from 'class-validator';

export class RandomPickDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  count?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeIds?: string[];
}
