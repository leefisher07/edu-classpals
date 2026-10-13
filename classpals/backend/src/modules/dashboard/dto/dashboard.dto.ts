import { IsEnum, IsOptional } from 'class-validator';

export class GetRankingDto {
  @IsOptional()
  @IsEnum(['total', 'week', 'month'])
  period?: 'total' | 'week' | 'month';
}

export class GetTrendDto {
  @IsOptional()
  @IsEnum(['7', '30'])
  days?: '7' | '30';
}
