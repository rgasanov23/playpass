import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TrainingController],
  providers: [TrainingService],
})
export class TrainingModule {}