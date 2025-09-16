import { Module, Global } from '@nestjs/common';
import { PrismaModule } from './database/prisma.module';
import { RedisModule } from './redis/redis.module';
import { EmailModule } from './email/email.module';

@Global()
@Module({
  imports: [
    PrismaModule,
    RedisModule,
    EmailModule,
  ],
  exports: [
    PrismaModule,
    RedisModule,
    EmailModule,
  ],
})
export class CommonModule {}
