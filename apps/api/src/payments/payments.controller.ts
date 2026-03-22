import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.paymentsService.getById(id);
  }

  @Patch(':id/confirm')
  async confirm(
    @Param('id') id: string,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.paymentsService.confirmPayment(id, dto.providerPaymentId);
  }

  @Patch(':id/fail')
  async fail(@Param('id') id: string) {
    return this.paymentsService.failPayment(id);
  }
}