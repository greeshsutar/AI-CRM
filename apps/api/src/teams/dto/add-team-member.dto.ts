import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddTeamMemberDto {
  @ApiProperty({ description: 'User UUID to add to team', example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33' })
  @IsUUID('4')
  @IsNotEmpty()
  userId!: string;
}
