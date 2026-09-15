import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({ description: 'Organization UUID', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID('4')
  @IsNotEmpty()
  organizationId!: string;

  @ApiProperty({ description: 'Team Name', example: 'Enterprise Sales Alpha' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Team Description', example: 'Sales team handling enterprise tier accounts' })
  @IsString()
  @IsOptional()
  description?: string;
}
