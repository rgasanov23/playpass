import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateParticipationDto } from './dto/create-participation.dto';
import { ParticipationService } from './participation.service';

@Controller('participations')
export class ParticipationController {
  constructor(private readonly participationService: ParticipationService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateParticipationDto,
  ) {
    return this.participationService.create(dto.trainingId, user.id);
  }

  @Get('training/:trainingId')
  async findByTraining(@Param('trainingId') trainingId: string) {
    return this.participationService.findByTraining(trainingId);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.participationService.cancel(id, user.id);
  }
}
