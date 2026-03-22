import { UserRole } from '@prisma/client';
import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';

const REGISTER_ROLES = [UserRole.ORGANIZER, UserRole.PLAYER] as const;

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(1)
  fullName: string;

  @IsIn(REGISTER_ROLES)
  role: (typeof REGISTER_ROLES)[number];
}
