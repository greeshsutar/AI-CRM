import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateMembershipDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'User UUID' })
  @IsNotEmpty()
  @IsUUID('4')
  userId!: string;

  @ApiProperty({ example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', description: 'Organization UUID' })
  @IsNotEmpty()
  @IsUUID('4')
  organizationId!: string;

  @ApiPropertyOptional({ enum: Role, default: Role.AGENT, description: 'Role assigned to member' })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
