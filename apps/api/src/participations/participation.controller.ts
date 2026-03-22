import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ParticipationService } from './participation.service';

@Controller('participations')
export class ParticipationController {
  constructor(private readonly participationService: ParticipationService) {}

  @Post()
  async create(
    @Body() body: { trainingId: string; fullName: string },
  ) {
    return this.participationService.create(body.trainingId, body.fullName);
  }

  @Get('training/:trainingId')
  async findByTraining(@Param('trainingId') trainingId: string) {
    return this.participationService.findByTraining(trainingId);
  }
}