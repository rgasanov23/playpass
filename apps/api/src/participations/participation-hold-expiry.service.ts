import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ParticipationHoldExpiryService {
  private readonly logger = new Logger(ParticipationHoldExpiryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Истечение брони: Payment -> CANCELED, Participation -> EXPIRED.
   * Ручной fail по-прежнему использует FAILED.
   */
  async expireDueHolds(now: Date): Promise<number> {
    const due = await this.prisma.participation.findMany({
      where: {
        status: 'PENDING_PAYMENT',
        holdExpiresAt: { lte: now },
      },
      include: { payment: true },
    });

    let processed = 0;

    for (const p of due) {
      if (!p.payment || p.payment.status !== 'PENDING') {
        continue;
      }

      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: p.payment.id },
          data: { status: 'CANCELED' },
        }),
        this.prisma.participation.update({
          where: { id: p.id },
          data: { status: 'EXPIRED' },
        }),
      ]);
      processed += 1;
    }

    return processed;
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleCron(): Promise<void> {
    try {
      const n = await this.expireDueHolds(new Date());
      if (n > 0) {
        this.logger.debug(`Expired ${n} participation hold(s)`);
      }
    } catch (err) {
      this.logger.error('expireDueHolds failed', err);
    }
  }
}
