// packages/shared-database/test-connection.js
const { prisma } = require('./dist/index.js');

async function testConnection() {
  try {
    console.log('🔗 正在测试数据库连接...');
    
    // 测试连接
    await prisma.$connect();
    console.log('✅ 数据库连接成功');
    
    // 测试查询
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('🔍 查询测试:', result);
    
    // 测试模型计数（如果表存在）
    try {
      const userCount = await prisma.user.count();
      console.log(`👥 当前用户数量: ${userCount}`);
    } catch (error) {
      console.log('⚠️  用户表可能还不存在，这是正常的（需要运行数据库迁移）');
    }
    
    console.log('🎉 数据库包测试完成！');
    
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.log('💡 提示: 请确保PostgreSQL数据库正在运行并检查DATABASE_URL环境变量');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
