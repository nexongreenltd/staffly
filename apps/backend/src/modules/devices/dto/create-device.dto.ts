import {
  IsString, IsIP, IsInt, IsOptional, Min, Max, IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateDeviceDto {
  @ApiProperty({ example: 'Main Gate' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '192.168.1.100' })
  @IsString()
  @IsNotEmpty()
  ipAddress: string;

  @ApiPropertyOptional({ example: 4370 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'ZKTeco K40' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: 5, description: 'Sync interval in minutes' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  syncInterval?: number;
}

export class UpdateDeviceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  port?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  syncInterval?: number;

  @ApiPropertyOptional()
  @IsOptional()
  isEnabled?: boolean;
}
