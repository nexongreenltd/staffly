import { IsString, IsInt, IsOptional, IsBoolean, Min, Max, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateShiftDto {
  @ApiProperty({ example: 'Morning Shift' })
  @IsString()
  name: string;

  @ApiProperty({ example: '09:00:00', description: 'HH:mm:ss' })
  @IsString()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
  shiftStartTime: string;

  @ApiProperty({ example: '18:00:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
  shiftEndTime: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(120)
  graceMinutes?: number;

  @ApiPropertyOptional({ description: 'True if shift crosses midnight' })
  @IsOptional()
  @IsBoolean()
  overnight?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
