import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateTrainingDto } from './dto/create-training.dto';
import { UpdateTrainingDto } from './dto/update-training.dto';
import { TrainingService } from './training.service';

@Controller('trainings')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  async create(
    @CurrentUser() user: { id: string },
    @Body() createTrainingDto: CreateTrainingDto,
  ) {
    return this.trainingService.create(user.id, createTrainingDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateTrainingDto,
  ) {
    return this.trainingService.update(id, user.id, dto);
  }

  @Get()
  async findAll() {
    return this.trainingService.findAll();
  }

  @Get('public')
  async findPublic(@Query('city') city?: string) {
    return this.trainingService.findPublicListing(city);
  }

  @Get('join/:joinToken')
  async findByJoinToken(@Param('joinToken') joinToken: string) {
    return this.trainingService.findByJoinToken(joinToken);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.trainingService.findOne(id);
  }
}
