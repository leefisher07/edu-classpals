/**
 * 班级积分管理系统 - 自动化测试脚本
 * 模拟用户完整操作流程
 */

const API_BASE = 'http://localhost:3001/api';

// 测试数据
const testData = {
  user: {
    phone: '13800138000',
    password: 'Test123456',
    activationCode: 'TEST-2024-001',
    name: '测试教师'
  },
  classes: [
    { name: '一年级1班', teacher: '张老师' },
    { name: '一年级2班', teacher: '李老师' }
  ],
  students: [
    { name: '张三', gender: 'MALE', studentNumber: '001' },
    { name: '李四', gender: 'MALE', studentNumber: '002' },
    { name: '王五', gender: 'FEMALE', studentNumber: '003' },
    { name: '赵六', gender: 'MALE', studentNumber: '004' },
    { name: '钱七', gender: 'FEMALE', studentNumber: '005' }
  ]
};

// 存储测试过程中的数据
const testContext = {
  token: null,
  userId: null,
  classIds: [],
  studentIds: []
};

// 工具函数
async function request(method, endpoint, data = null, useAuth = true) {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (useAuth && testContext.token) {
    headers['Authorization'] = `Bearer ${testContext.token}`;
  }

  const options = {
    method,
    headers
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const result = await response.json();

    return {
      success: response.ok,
      status: response.status,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m'
  };
  const reset = '\x1b[0m';
  console.log(`${colors[type]}${message}${reset}`);
}

function logTest(testName, passed, details = '') {
  const icon = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${icon} ${testName}${'\x1b[0m'}`);
  if (details) {
    console.log(`  ${details}`);
  }
}

// 测试用例
async function test1_Register() {
  log('\n=== 测试1: 用户注册 ===', 'info');

  const result = await request('POST', '/auth/register', {
    phone: testData.user.phone,
    password: testData.user.password,
    activationCode: testData.user.activationCode
  }, false);

  if (result.success && result.data.data) {
    testContext.token = result.data.data.token;
    testContext.userId = result.data.data.user.id;
    logTest('注册成功', true, `用户ID: ${testContext.userId}`);
    return true;
  } else {
    // 如果用户已存在，尝试登录
    if (result.data?.message?.includes('已存在') || result.data?.message?.includes('已注册')) {
      logTest('用户已存在，跳过注册', true, '将尝试登录');
      return true;
    }
    logTest('注册失败', false, result.data?.message || result.error);
    return false;
  }
}

async function test2_Login() {
  log('\n=== 测试2: 用户登录 ===', 'info');

  const result = await request('POST', '/auth/login', {
    phone: testData.user.phone,
    password: testData.user.password
  }, false);

  if (result.success && result.data.data) {
    testContext.token = result.data.data.token;
    logTest('登录成功', true, `Token: ${testContext.token.substring(0, 20)}...`);
    return true;
  } else {
    logTest('登录失败', false, result.data?.message || result.error);
    return false;
  }
}

async function test3_CreateClasses() {
  log('\n=== 测试3: 创建班级 ===', 'info');

  let allSuccess = true;

  for (const classData of testData.classes) {
    const result = await request('POST', '/classes', classData);

    if (result.success && result.data.data) {
      testContext.classIds.push(result.data.data.id);
      logTest(`创建班级: ${classData.name}`, true, `班级ID: ${result.data.data.id}`);
    } else {
      logTest(`创建班级: ${classData.name}`, false, result.data?.message || result.error);
      allSuccess = false;
    }
  }

  return allSuccess;
}

async function test4_CreateStudents() {
  log('\n=== 测试4: 创建学生 ===', 'info');

  let allSuccess = true;

  for (const classId of testContext.classIds) {
    log(`\n为班级 ${classId} 添加学生:`, 'info');

    for (const studentData of testData.students) {
      const result = await request('POST', `/classes/${classId}/students`, studentData);

      if (result.success && result.data.data) {
        testContext.studentIds.push(result.data.data.id);
        logTest(`  添加学生: ${studentData.name}`, true, `学号: ${studentData.studentNumber}`);
      } else {
        logTest(`  添加学生: ${studentData.name}`, false, result.data?.message || result.error);
        allSuccess = false;
      }
    }
  }

  return allSuccess;
}

async function test5_GetClasses() {
  log('\n=== 测试5: 获取班级列表 ===', 'info');

  const result = await request('GET', '/classes');

  if (result.success && result.data.data) {
    logTest('获取班级列表', true, `共 ${result.data.data.classes.length} 个班级`);
    return true;
  } else {
    logTest('获取班级列表', false, result.data?.message || result.error);
    return false;
  }
}

async function test6_GetStudents() {
  log('\n=== 测试6: 获取学生列表 ===', 'info');

  const classId = testContext.classIds[0];
  const result = await request('GET', `/classes/${classId}/students`);

  if (result.success && result.data.data) {
    logTest('获取学生列表', true, `共 ${result.data.data.students.length} 个学生`);
    return true;
  } else {
    logTest('获取学生列表', false, result.data?.message || result.error);
    return false;
  }
}

async function test7_AddPoints() {
  log('\n=== 测试7: 学生加分 ===', 'info');

  const studentId = testContext.studentIds[0];
  const result = await request('POST', `/students/${studentId}/points`, {
    value: 5,
    type: 'ADD',
    reason: '课堂表现优秀'
  });

  if (result.success) {
    logTest('学生加分', true, '加5分成功');
    return true;
  } else {
    logTest('学生加分', false, result.data?.message || result.error);
    return false;
  }
}

async function test8_DeductPoints() {
  log('\n=== 测试8: 学生扣分 ===', 'info');

  const studentId = testContext.studentIds[1];
  const result = await request('POST', `/students/${studentId}/points`, {
    value: 2,
    type: 'DEDUCT',
    reason: '作业未完成'
  });

  if (result.success) {
    logTest('学生扣分', true, '扣2分成功');
    return true;
  } else {
    logTest('学生扣分', false, result.data?.message || result.error);
    return false;
  }
}

async function test9_GetDashboard() {
  log('\n=== 测试9: 获取数据看板 ===', 'info');

  const classId = testContext.classIds[0];
  const result = await request('GET', `/dashboard/${classId}/overview`);

  if (result.success && result.data.data) {
    const data = result.data.data;
    logTest('获取数据看板', true,
      `总积分: ${data.totalPoints}, 学生数: ${data.studentCount}`);
    return true;
  } else {
    logTest('获取数据看板', false, result.data?.message || result.error);
    return false;
  }
}

async function test10_GetRanking() {
  log('\n=== 测试10: 获取排行榜 ===', 'info');

  const classId = testContext.classIds[0];
  const result = await request('GET', `/dashboard/${classId}/ranking?limit=5`);

  if (result.success && result.data.data) {
    logTest('获取排行榜', true, `前5名学生数据获取成功`);
    return true;
  } else {
    logTest('获取排行榜', false, result.data?.message || result.error);
    return false;
  }
}

// 主测试流程
async function runTests() {
  log('╔════════════════════════════════════════════════════════╗', 'info');
  log('║     班级积分管理系统 - 自动化测试                      ║', 'info');
  log('╚════════════════════════════════════════════════════════╝', 'info');

  const tests = [
    { name: '用户注册', fn: test1_Register },
    { name: '用户登录', fn: test2_Login },
    { name: '创建班级', fn: test3_CreateClasses },
    { name: '创建学生', fn: test4_CreateStudents },
    { name: '获取班级列表', fn: test5_GetClasses },
    { name: '获取学生列表', fn: test6_GetStudents },
    { name: '学生加分', fn: test7_AddPoints },
    { name: '学生扣分', fn: test8_DeductPoints },
    { name: '获取数据看板', fn: test9_GetDashboard },
    { name: '获取排行榜', fn: test10_GetRanking }
  ];

  const results = {
    total: tests.length,
    passed: 0,
    failed: 0
  };

  for (const test of tests) {
    try {
      const passed = await test.fn();
      if (passed) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      log(`测试异常: ${test.name}`, 'error');
      console.error(error);
      results.failed++;
    }

    // 等待一下，避免请求过快
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 输出测试总结
  log('\n╔════════════════════════════════════════════════════════╗', 'info');
  log('║                    测试总结                            ║', 'info');
  log('╚════════════════════════════════════════════════════════╝', 'info');
  log(`总测试数: ${results.total}`, 'info');
  log(`通过: ${results.passed}`, 'success');
  log(`失败: ${results.failed}`, results.failed > 0 ? 'error' : 'success');
  log(`通过率: ${((results.passed / results.total) * 100).toFixed(2)}%`,
    results.failed === 0 ? 'success' : 'warning');

  log('\n测试完成！', 'success');
}

// 运行测试
runTests().catch(error => {
  log('测试执行失败', 'error');
  console.error(error);
  process.exit(1);
});
