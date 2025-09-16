import { PrismaClient } from '@prisma/client';

// 单例模式的Prisma客户端
class DatabaseService {
  private static instance: PrismaClient;

  static getInstance(): PrismaClient {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
      });
    }
    return DatabaseService.instance;
  }

  static async disconnect(): Promise<void> {
    if (DatabaseService.instance) {
      await DatabaseService.instance.$disconnect();
    }
  }
}

export const prisma = DatabaseService.getInstance();
export { PrismaClient } from '@prisma/client';
export * from '@prisma/client';
