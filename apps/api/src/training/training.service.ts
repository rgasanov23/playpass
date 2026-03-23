import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrainingDto } from './dto/create-training.dto';
import { UpdateTrainingDto } from './dto/update-training.dto';

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

  async create(organizerId: string, createTrainingDto: CreateTrainingDto) {
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
        city: createTrainingDto.city.trim(),
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
        visibility: createTrainingDto.visibility ?? 'PUBLIC',
        status: 'PUBLISHED',
        joinToken: Math.random().toString(36).slice(2, 12),
        organizer: {
          connect: { id: organizerId },
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

  async update(
    id: string,
    organizerId: string,
    dto: UpdateTrainingDto,
  ) {
    const t = await this.prisma.training.findUnique({ where: { id } });
    if (!t) {
      throw new NotFoundException('Тренировка не найдена');
    }
    if (t.organizerId !== organizerId) {
      throw new ForbiddenException('Нет доступа к этой тренировке');
    }

    const nextCourt =
      dto.courtPriceTotal ?? Number(t.courtPriceTotal);
    const nextLimit = dto.participantLimit ?? t.participantLimit;
    const nextFee =
      dto.serviceFeePerParticipant ?? Number(t.serviceFeePerParticipant);
    const nextAcq = dto.acquiringPercent ?? Number(t.acquiringPercent);

    const pricingTouched =
      dto.courtPriceTotal !== undefined ||
      dto.participantLimit !== undefined ||
      dto.serviceFeePerParticipant !== undefined ||
      dto.acquiringPercent !== undefined;

    const calculatedPricePerParticipant = pricingTouched
      ? this.calculatePricePerParticipant(
          nextCourt,
          nextLimit,
          nextFee,
          nextAcq,
        )
      : Number(t.calculatedPricePerParticipant);

    const data: Prisma.TrainingUpdateInput = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.sportType !== undefined) data.sportType = dto.sportType;
    if (dto.city !== undefined) data.city = dto.city.trim();
    if (dto.placeName !== undefined) data.placeName = dto.placeName;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.startsAt !== undefined) data.startsAt = new Date(dto.startsAt);
    if (dto.endsAt !== undefined) {
      data.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    }
    if (dto.participantLimit !== undefined) {
      data.participantLimit = dto.participantLimit;
    }
    if (dto.courtPriceTotal !== undefined) {
      data.courtPriceTotal = dto.courtPriceTotal;
    }
    if (dto.serviceFeePerParticipant !== undefined) {
      data.serviceFeePerParticipant = dto.serviceFeePerParticipant;
    }
    if (dto.acquiringPercent !== undefined) {
      data.acquiringPercent = dto.acquiringPercent;
    }
    if (dto.visibility !== undefined) data.visibility = dto.visibility;
    if (dto.status !== undefined) data.status = dto.status;

    if (pricingTouched) {
      data.calculatedPricePerParticipant = calculatedPricePerParticipant;
    }

    return this.prisma.training.update({
      where: { id },
      data,
    });
  }

  /** Публичный каталог: будущие тренировки в городе (для игрока). */
  async findPublicListing(city?: string) {
    const now = new Date();
    const where: Prisma.TrainingWhereInput = {
      visibility: 'PUBLIC',
      status: { in: ['PUBLISHED', 'FULL'] },
      startsAt: { gte: now },
    };
    const trimmed = city?.trim();
    if (trimmed) {
      where.city = { equals: trimmed, mode: 'insensitive' };
    }

    return this.prisma.training.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      include: {
        _count: {
          select: {
            participations: {
              where: {
                status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] },
              },
            },
          },
        },
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