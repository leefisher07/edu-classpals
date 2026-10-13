const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const db = new sqlite3.Database('./dev.db', (err) => {
  if (err) {
    console.error('数据库连接失败:', err);
    process.exit(1);
  }
  console.log('✓ 数据库连接成功');
});

async function createTestData() {
  console.log('\n开始创建测试数据...\n');

  // 1. 创建激活码
  const activationCodeId = uuidv4();
  const activationCode = 'TEST-2024-001';

  await new Promise((resolve, reject) => {
    db.run(`
      INSERT OR IGNORE INTO activation_codes (id, code, type, days, status, note, createdAt, firstActivatedAt)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), NULL)
    `, [activationCodeId, activationCode, 'SIX_MONTHS', 180, 'UNUSED', '测试激活码'], (err) => {
      if (err) reject(err);
      else {
        console.log('✓ 激活码创建成功:', activationCode);
        resolve();
      }
    });
  });

  // 2. 创建测试用户
  const userId = uuidv4();
  const phone = '13800138000';
  const password = await bcrypt.hash('Test123456', 10);
  const accountExpiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

  await new Promise((resolve, reject) => {
    db.run(`
      INSERT OR REPLACE INTO users (id, phone, username, password, role, status, accountExpiresAt, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [userId, phone, '测试教师', password, 'TEACHER', 'ACTIVE', accountExpiresAt], (err) => {
      if (err) reject(err);
      else {
        console.log('✓ 测试用户创建成功');
        console.log('  手机号:', phone);
        console.log('  密码: Test123456');
        console.log('  用户ID:', userId);
        resolve();
      }
    });
  });

  // 3. 绑定激活码到用户
  const userActivationCodeId = uuidv4();
  const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

  await new Promise((resolve, reject) => {
    db.run(`
      INSERT OR IGNORE INTO user_activation_codes (id, userId, activationCodeId, activatedAt, expiresAt)
      VALUES (?, ?, ?, datetime('now'), ?)
    `, [userActivationCodeId, userId, activationCodeId, expiresAt], (err) => {
      if (err) reject(err);
      else {
        console.log('✓ 激活码绑定成功');
        resolve();
      }
    });
  });

  // 4. 更新激活码状态
  await new Promise((resolve, reject) => {
    db.run(`
      UPDATE activation_codes SET status = 'ACTIVE', firstActivatedAt = datetime('now') WHERE id = ?
    `, [activationCodeId], (err) => {
      if (err) reject(err);
      else {
        console.log('✓ 激活码状态更新成功');
        resolve();
      }
    });
  });

  console.log('\n测试数据创建完成！\n');
}

createTestData()
  .then(() => {
    db.close();
    console.log('✓ 数据库连接已关闭');
    process.exit(0);
  })
  .catch((err) => {
    console.error('✗ 创建测试数据失败:', err);
    db.close();
    process.exit(1);
  });
