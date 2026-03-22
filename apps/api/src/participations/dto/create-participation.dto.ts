import { IsNotEmpty, IsString } from 'class-validator';

export class CreateParticipationDto {
  @IsString()
  @IsNotEmpty()
  trainingId: string;
}
