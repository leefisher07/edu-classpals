import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('开始创建测试数据...\n');

  // 1. 创建激活码
  const activationCode = await prisma.activationCode.upsert({
    where: { code: 'TEST-2024-001' },
    update: {},
    create: {
      code: 'TEST-2024-001',
      type: 'TIME_LIMITED',
      days: 180,
      planName: '半年版',
      status: 'UNUSED',
      note: '测试激活码'
    }
  });
  console.log('✓ 激活码创建成功:', activationCode.code);

  // 2. 创建测试用户
  const hashedPassword = await bcrypt.hash('Test123456', 10);
  const accountExpiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);

  const user = await prisma.user.upsert({
    where: { phone: '13800138000' },
    update: {
      password: hashedPassword,
      accountExpiresAt
    },
    create: {
      phone: '13800138000',
      username: '测试教师',
      password: hashedPassword,
      role: 'TEACHER',
      status: 'ACTIVE',
      accountExpiresAt
    }
  });
  console.log('✓ 测试用户创建成功');
  console.log('  手机号: 13800138000');
  console.log('  密码: Test123456');
  console.log('  用户ID:', user.id);

  // 3. 绑定激活码到用户
  const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);

  const existing = await prisma.userActivationCode.findFirst({
    where: {
      userId: user.id,
      activationCodeId: activationCode.id
    }
  });

  if (!existing) {
    await prisma.userActivationCode.create({
      data: {
        userId: user.id,
        activationCodeId: activationCode.id,
        expiresAt
      }
    });
    console.log('✓ 激活码绑定成功');
  } else {
    console.log('✓ 激活码已绑定');
  }

  // 4. 更新激活码状态
  await prisma.activationCode.update({
    where: { id: activationCode.id },
    data: {
      status: 'ACTIVATED',
      firstActivatedAt: new Date()
    }
  });
  console.log('✓ 激活码状态更新成功');

  console.log('\n测试数据创建完成！');
}

main()
  .catch((e) => {
    console.error('创建测试数据失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
