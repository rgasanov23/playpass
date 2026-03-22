import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrainingDto } from './dto/create-training.dto';

@Injectable()
export class TrainingService {
  constructor(private prisma: PrismaService) {}

  private calculatePricePerParticipant(
    courtPriceTotal: number,
    participantLimit: number,
    serviceFeePerParticipant: number,
    acquiringPercent: number,
  ): number {
    const baseTotal =
      courtPriceTotal + serviceFeePerParticipant * participantLimit;

    const totalWithAcquiring = baseTotal * (1 + acquiringPercent / 100);
    return Math.ceil(totalWithAcquiring / participantLimit);
  }

  async create(createTrainingDto: CreateTrainingDto) {
    const calculatedPricePerParticipant = this.calculatePricePerParticipant(
      createTrainingDto.courtPriceTotal,
      createTrainingDto.participantLimit,
      createTrainingDto.serviceFeePerParticipant,
      createTrainingDto.acquiringPercent,
    );

    return this.prisma.training.create({
      data: {
        title: createTrainingDto.title,
        description: createTrainingDto.description,
        sportType: createTrainingDto.sportType,
        placeName: createTrainingDto.placeName,
        address: createTrainingDto.address,
        startsAt: new Date(createTrainingDto.startsAt),
        endsAt: createTrainingDto.endsAt
          ? new Date(createTrainingDto.endsAt)
          : null,
        participantLimit: createTrainingDto.participantLimit,
        courtPriceTotal: createTrainingDto.courtPriceTotal,
        serviceFeePerParticipant: createTrainingDto.serviceFeePerParticipant,
        acquiringPercent: createTrainingDto.acquiringPercent,
        calculatedPricePerParticipant,
        joinToken: Math.random().toString(36).slice(2, 12),
        organizer: {
          create: {
            fullName: createTrainingDto.organizerName,
            role: 'ORGANIZER',
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.training.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const training = await this.prisma.training.findUnique({
      where: { id },
    });

    if (!training) {
      throw new NotFoundException('Тренировка не найдена');
    }

    return training;
  }

  async findByJoinToken(joinToken: string) {
    const training = await this.prisma.training.findUnique({
      where: { joinToken },
    });

    if (!training) {
      throw new NotFoundException('Тренировка не найдена');
    }

    return training;
  }
}