import {
  IsString,
  IsBoolean,
  IsOptional,
  IsDateString,
  Matches,
} from 'class-validator';

const PHONE_PATTERN = /^1[3-9]\d{9}$/;

export class CreateShareLinkDto {
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  allowViewRanking?: boolean;

  @IsOptional()
  @IsBoolean()
  hidePointRecords?: boolean;

  @IsOptional()
  @IsBoolean()
  hideDeductions?: boolean;
}

export class UpdateShareLinkDto {
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  allowViewRanking?: boolean;

  @IsOptional()
  @IsBoolean()
  hidePointRecords?: boolean;

  @IsOptional()
  @IsBoolean()
  hideDeductions?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class VerifyParentDto {
  @IsString()
  @Matches(PHONE_PATTERN, { message: '手机号格式不正确' })
  phone: string;
}
