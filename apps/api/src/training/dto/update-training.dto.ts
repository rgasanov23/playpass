import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { SportTypeDto } from './create-training.dto';

export class UpdateTrainingDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(SportTypeDto)
  sportType?: SportTypeDto;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  placeName?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsInt()
  @Min(2)
  participantLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  courtPriceTotal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  serviceFeePerParticipant?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  acquiringPercent?: number;

  @IsOptional()
  @IsIn(['PUBLIC', 'PRIVATE'])
  visibility?: 'PUBLIC' | 'PRIVATE';

  /** Только отмена тренировки организатором */
  @IsOptional()
  @IsIn(['CANCELLED'])
  status?: 'CANCELLED';
}
