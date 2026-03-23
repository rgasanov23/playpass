import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export enum SportTypeDto {
  VOLLEYBALL = 'VOLLEYBALL',
  FOOTBALL = 'FOOTBALL',
  BASKETBALL = 'BASKETBALL',
  TENNIS = 'TENNIS',
  PADEL = 'PADEL',
  OTHER = 'OTHER',
}

export class CreateTrainingDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(SportTypeDto)
  sportType: SportTypeDto;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  placeName: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsDateString()
  startsAt: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsInt()
  @Min(2)
  participantLimit: number;

  @IsNumber()
  @Min(0)
  courtPriceTotal: number;

  @IsNumber()
  @Min(0)
  serviceFeePerParticipant: number;

  @IsNumber()
  @Min(0)
  acquiringPercent: number;

  @IsOptional()
  @IsIn(['PUBLIC', 'PRIVATE'])
  visibility?: 'PUBLIC' | 'PRIVATE';
}