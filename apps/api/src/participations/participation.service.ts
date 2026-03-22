import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ParticipationService {
  constructor(private prisma: PrismaService) {}

  async create(trainingId: string, fullName: string) {
    return this.prisma.$transaction(async (tx) => {
      const training = await tx.training.findUnique({
        where: { id: trainingId },
        include: {
          participations: true,
        },
      });

      if (!training) {
        throw new NotFoundException('Тренировка не найдена');
      }

      const occupiedCount = training.participations.filter(
        (p) => p.status === 'CONFIRMED' || p.status === 'PENDING_PAYMENT',
      ).length;

      if (occupiedCount >= training.participantLimit) {
        throw new BadRequestException('Свободных мест нет');
      }

      const user = await tx.user.create({
        data: {
          fullName,
          role: 'PLAYER',
        },
      });

      const payment = await tx.payment.create({
        data: {
          trainingId: training.id,
          userId: user.id,
          amount: training.calculatedPricePerParticipant,
          currency: 'RUB',
          provider: 'YOOKASSA',
          status: 'PENDING',
        },
      });

      const participation = await tx.participation.create({
        data: {
          trainingId: training.id,
          userId: user.id,
          status: 'PENDING_PAYMENT',
          source: 'LINK',
          paymentId: payment.id,
        },
        include: {
          user: true,
          training: true,
          payment: true,
        },
      });

      return participation;
    });
  }

  async findByTraining(trainingId: string) {
    return this.prisma.participation.findMany({
      where: { trainingId },
      include: {
        user: true,
        payment: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}