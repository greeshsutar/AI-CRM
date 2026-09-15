import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateInvitationDto {
  @ApiProperty({ description: 'Target Organization UUID' })
  @IsUUID('4')
  @IsNotEmpty()
  organizationId!: string;

  @ApiProperty({ description: 'Invited employee work email' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional({ description: 'Employee first name' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Employee last name' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ enum: Role, default: Role.AGENT, description: 'Assigned employee role (must be AGENT or MANAGER)' })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
