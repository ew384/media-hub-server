const { PrismaClient } = require('@prisma/client');
process.env.DATABASE_URL = "postgresql://postgres:password@localhost:5432/media_hub_dev";
const prisma = new PrismaClient();

async function setupAdmin() {
  try {
    console.log('🔐 Creating admin account...');
    
    const existing = await prisma.user.findUnique({
      where: { email: 'admin@example.com' }
    });

    if (existing) {
      console.log('✅ Admin already exists!');
      return;
    }

    const passwordHash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
    
    await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@example.com',
        passwordHash,
        status: 1
      }
    });

    console.log('✅ Admin created: admin@example.com / password');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupAdmin();
