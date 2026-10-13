import { IsString, IsOptional, IsArray, IsInt, Min } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  leaderId?: string | null;
}

export class SetLeaderDto {
  @IsOptional()
  @IsString()
  leaderId?: string | null;
}

export class UpdateGroupSortDto {
  @IsString({ each: true })
  groupIds: string[];
}

export class ManageMembersDto {
  @IsString({ each: true })
  studentIds: string[];
}

export class RandomGroupDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  groupCount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  studentsPerGroup?: number;
}
