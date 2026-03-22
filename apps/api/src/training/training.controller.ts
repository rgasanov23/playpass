import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { TrainingService } from './training.service';
import { CreateTrainingDto } from './dto/create-training.dto';

@Controller('trainings')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Post()
  async create(@Body() createTrainingDto: CreateTrainingDto) {
    return this.trainingService.create(createTrainingDto);
  }

  @Get()
  async findAll() {
    return this.trainingService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.trainingService.findOne(id);
  }
}