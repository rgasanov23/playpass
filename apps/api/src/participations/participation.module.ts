import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ParticipationHoldExpiryService } from './participation-hold-expiry.service';
import { ParticipationController } from './participation.controller';
import { ParticipationService } from './participation.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ParticipationController],
  providers: [ParticipationService, ParticipationHoldExpiryService],
  exports: [ParticipationService],
})
export class ParticipationModule {}