import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        participation: {
          include: {
            user: true,
            training: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Платеж не найден');
    }

    return payment;
  }

  async getByParticipationId(participationId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { participation: { id: participationId } },
      include: {
        participation: {
          include: {
            user: true,
            training: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Платеж не найден');
    }

    return payment;
  }

  async confirmPayment(paymentId: string, providerPaymentId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: {
          participation: {
            include: {
              training: true,
            },
          },
        },
      });

      if (!payment) {
        throw new NotFoundException('Платеж не найден');
      }

      if (!payment.participation) {
        throw new BadRequestException('Платеж не привязан к участию');
      }

      const participation = payment.participation;

      if (participation.status === 'EXPIRED') {
        throw new BadRequestException(
          'Нельзя подтвердить платёж для истёкшего участия',
        );
      }

      const now = new Date();
      if (
        participation.holdExpiresAt &&
        participation.holdExpiresAt < now
      ) {
        throw new BadRequestException('Время брони для оплаты истекло');
      }

      if (payment.status === 'SUCCEEDED') {
        return payment;
      }

      if (payment.status !== 'PENDING') {
        throw new BadRequestException(
          'Подтвердить можно только платеж в статусе PENDING',
        );
      }

      const occupiedCount = await tx.participation.count({
        where: {
          trainingId: participation.trainingId,
          OR: [
            { status: 'CONFIRMED' },
            { status: 'PENDING_PAYMENT' },
          ],
        },
      });

      if (occupiedCount > participation.training.participantLimit) {
        throw new BadRequestException('Свободных мест нет');
      }

      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCEEDED',
          providerPaymentId,
          paidAt: new Date(),
        },
        include: {
          participation: {
            include: {
              user: true,
              training: true,
            },
          },
        },
      });

      await tx.participation.update({
        where: { id: participation.id },
        data: {
          status: 'CONFIRMED',
          joinedAt: new Date(),
          holdExpiresAt: null,
        },
      });

      return updatedPayment;
    });
  }

  async failPayment(paymentId: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: {
          participation: true,
        },
      });

      if (!payment) {
        throw new NotFoundException('Платеж не найден');
      }

      if (payment.status !== 'PENDING') {
        return payment;
      }

      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'FAILED',
        },
      });

      if (payment.participation) {
        await tx.participation.update({
          where: { id: payment.participation.id },
          data: {
            status: 'EXPIRED',
          },
        });
      }

      return updatedPayment;
    });
  }
}
