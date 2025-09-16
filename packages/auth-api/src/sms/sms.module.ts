import { Module } from '@nestjs/common';
import { SmsController } from './sms.controller';
import { SmsService } from './sms.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SmsController],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
