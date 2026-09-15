import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  IsInt,
  Min,
} from 'class-validator';

export class OnboardOrganizationDto {
  @ApiProperty({ example: 'Acme Corp', description: 'Company / Organization name' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  companyName!: string;

  @ApiPropertyOptional({ example: 'acme-corp', description: 'Unique slug for the organization' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @ApiPropertyOptional({ example: 'acme.com', description: 'Primary company domain' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  domain?: string;

  @ApiPropertyOptional({ example: 10, description: 'Number of users / employees' })
  @IsOptional()
  @IsInt()
  @Min(1)
  numberOfUsers?: number;

  @ApiPropertyOptional({ example: '+1234567890', description: 'Phone number of organization owner' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'Jane', description: 'First name of organization owner' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Last name of organization owner' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;
}
