/**
 * 初始化测试数据脚本
 * 创建测试用的激活码
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化测试数据...');

  // 创建测试激活码
  const activationCode = await prisma.activationCode.upsert({
    where: { code: 'TEST-2024-001' },
    update: {},
    create: {
      code: 'TEST-2024-001',
      type: 'HALF_YEAR',
      status: 'UNUSED',
      validDays: 180,
      remark: '测试激活码'
    }
  });

  console.log('✓ 激活码创建成功:', activationCode.code);

  console.log('\n测试数据初始化完成！');
}

main()
  .catch((e) => {
    console.error('初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
