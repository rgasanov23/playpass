import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const HOLD_MS = 2 * 60 * 1000;

const participationWithRelations = {
  user: true,
  training: true,
  payment: true,
} as const;

@Injectable()
export class ParticipationService {
  constructor(private prisma: PrismaService) {}

  private buildHoldExpiresAt(): Date {
    return new Date(Date.now() + HOLD_MS);
  }

  async create(trainingId: string, userId: string) {
    const holdExpiresAt = this.buildHoldExpiresAt();

    return this.prisma.$transaction(
      async (tx) => {
        const training = await tx.training.findUnique({
          where: { id: trainingId },
        });

        if (!training) {
          throw new NotFoundException('Тренировка не найдена');
        }

        const occupiedCount = await tx.participation.count({
          where: {
            trainingId,
            status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] },
          },
        });

        const existing = await tx.participation.findUnique({
          where: {
            trainingId_userId: { trainingId, userId },
          },
          include: { payment: true },
        });

        if (existing) {
          if (
            existing.status === 'PENDING_PAYMENT' ||
            existing.status === 'CONFIRMED'
          ) {
            throw new ConflictException(
              'Вы уже записаны на эту тренировку',
            );
          }

          if (occupiedCount >= training.participantLimit) {
            throw new BadRequestException('Свободных мест нет');
          }

          if (
            existing.paymentId &&
            existing.payment?.status === 'PENDING'
          ) {
            await tx.payment.update({
              where: { id: existing.paymentId },
              data: { status: 'CANCELED' },
            });
          }

          const payment = await tx.payment.create({
            data: {
              trainingId: training.id,
              userId,
              amount: training.calculatedPricePerParticipant,
              currency: 'RUB',
              provider: 'YOOKASSA',
              status: 'PENDING',
            },
          });

          return tx.participation.update({
            where: { id: existing.id },
            data: {
              paymentId: payment.id,
              status: 'PENDING_PAYMENT',
              joinedAt: null,
              cancelledAt: null,
              cancelReason: null,
              holdExpiresAt,
            },
            include: participationWithRelations,
          });
        }

        if (occupiedCount >= training.participantLimit) {
          throw new BadRequestException('Свободных мест нет');
        }

        const payment = await tx.payment.create({
          data: {
            trainingId: training.id,
            userId,
            amount: training.calculatedPricePerParticipant,
            currency: 'RUB',
            provider: 'YOOKASSA',
            status: 'PENDING',
          },
        });

        return tx.participation.create({
          data: {
            trainingId: training.id,
            userId,
            status: 'PENDING_PAYMENT',
            source: 'LINK',
            paymentId: payment.id,
            holdExpiresAt,
          },
          include: participationWithRelations,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async cancel(participationId: string, currentUserId: string) {
    const participation = await this.prisma.participation.findUnique({
      where: { id: participationId },
      include: {
        training: true,
        payment: true,
      },
    });

    if (!participation) {
      throw new NotFoundException('Участие не найдено');
    }

    const isParticipant = participation.userId === currentUserId;
    const isOrganizer =
      participation.training.organizerId === currentUserId;

    if (!isParticipant && !isOrganizer) {
      throw new ForbiddenException();
    }

    if (
      participation.status === 'CANCELLED' ||
      participation.status === 'EXPIRED'
    ) {
      return this.prisma.participation.findUnique({
        where: { id: participationId },
        include: participationWithRelations,
      });
    }

    if (participation.status === 'CONFIRMED') {
      throw new BadRequestException(
        'Отмена подтверждённого участия через систему пока не поддерживается',
      );
    }

    if (participation.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException('Участие нельзя отменить в текущем статусе');
    }

    return this.prisma.$transaction(async (tx) => {
      if (
        participation.paymentId &&
        participation.payment?.status === 'PENDING'
      ) {
        await tx.payment.update({
          where: { id: participation.paymentId },
          data: { status: 'CANCELED' },
        });
      }

      await tx.participation.update({
        where: { id: participationId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      return tx.participation.findUnique({
        where: { id: participationId },
        include: participationWithRelations,
      });
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
