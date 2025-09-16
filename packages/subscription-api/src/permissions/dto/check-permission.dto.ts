// src/permissions/dto/check-permission.dto.ts
import { IsString, IsOptional, IsArray } from 'class-validator';

export class CheckPermissionDto {
  @IsString()
  feature: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalData?: string[];
}

export class BatchCheckPermissionDto {
  @IsArray()
  @IsString({ each: true })
  features: string[];
}