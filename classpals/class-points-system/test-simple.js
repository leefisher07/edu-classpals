/**
 * 班级积分管理系统 - 简化测试脚本
 * 直接使用已有用户进行测试
 */

const API_BASE = 'http://localhost:3001/api';

// 测试数据
const testData = {
  user: {
    phone: '13800138000',
    password: 'Test123456'
  },
  classes: [
    { name: '测试班级1', headTeacher: '张老师' },
    { name: '测试班级2', headTeacher: '李老师' }
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
  studentIds: [],
  groupIds: [],
  ruleIds: [],
  itemIds: []
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
async function test1_Login() {
  log('\n=== 测试1: 用户登录 ===', 'info');

  const result = await request('POST', '/auth/login', {
    phone: testData.user.phone,
    password: testData.user.password
  }, false);

  if (result.success && result.data.data) {
    testContext.token = result.data.data.token;
    testContext.userId = result.data.data.user.id;
    logTest('登录成功', true, `Token获取成功`);
    return true;
  } else {
    logTest('登录失败', false, result.data?.message || result.error);
    log('提示：请确保数据库中存在测试用户（手机号: 13800138000, 密码: Test123456）', 'warning');
    return false;
  }
}

async function test2_CreateClasses() {
  log('\n=== 测试2: 创建班级 ===', 'info');

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

async function test3_CreateStudents() {
  log('\n=== 测试3: 创建学生 ===', 'info');

  if (testContext.classIds.length === 0) {
    logTest('跳过学生创建', false, '没有可用的班级');
    return false;
  }

  let allSuccess = true;
  const classId = testContext.classIds[0];

  log(`为班级 ${classId} 添加学生:`, 'info');

  for (const studentData of testData.students) {
    const result = await request('POST', `/students`, {
      ...studentData,
      classId
    });

    if (result.success && result.data.data) {
      testContext.studentIds.push(result.data.data.id);
      logTest(`  添加学生: ${studentData.name}`, true, `学号: ${studentData.studentNumber}`);
    } else {
      logTest(`  添加学生: ${studentData.name}`, false, result.data?.message || result.error);
      allSuccess = false;
    }
  }

  return allSuccess;
}

async function test4_GetClasses() {
  log('\n=== 测试4: 获取班级列表 ===', 'info');

  const result = await request('GET', '/classes');

  if (result.success && result.data.data) {
    logTest('获取班级列表', true, `共 ${result.data.data.classes.length} 个班级`);
    return true;
  } else {
    logTest('获取班级列表', false, result.data?.message || result.error);
    return false;
  }
}

async function test5_GetStudents() {
  log('\n=== 测试5: 获取学生列表 ===', 'info');

  if (testContext.classIds.length === 0) {
    logTest('跳过获取学生', false, '没有可用的班级');
    return false;
  }

  const classId = testContext.classIds[0];
  const result = await request('GET', `/students?classId=${classId}`);

  if (result.success && result.data.data) {
    logTest('获取学生列表', true, `共 ${result.data.data.students.length} 个学生`);
    return true;
  } else {
    logTest('获取学生列表', false, result.data?.message || result.error);
    return false;
  }
}

async function test6_AddPoints() {
  log('\n=== 测试6: 学生加分 ===', 'info');

  if (testContext.studentIds.length === 0) {
    logTest('跳过加分测试', false, '没有可用的学生');
    return false;
  }

  const studentId = testContext.studentIds[0];
  const result = await request('POST', `/points/add`, {
    studentId,
    value: 5,
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

async function test7_DeductPoints() {
  log('\n=== 测试7: 学生扣分 ===', 'info');

  if (testContext.studentIds.length < 2) {
    logTest('跳过扣分测试', false, '学生数量不足');
    return false;
  }

  const studentId = testContext.studentIds[1];
  const result = await request('POST', `/points/deduct`, {
    studentId,
    value: 2,
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

async function test8_GetDashboard() {
  log('\n=== 测试8: 获取数据看板 ===', 'info');

  if (testContext.classIds.length === 0) {
    logTest('跳过数据看板', false, '没有可用的班级');
    return false;
  }

  const classId = testContext.classIds[0];
  const result = await request('GET', `/dashboard/${classId}/overview`);

  if (result.success && result.data.data) {
    const data = result.data.data;
    logTest('获取数据看板', true,
      `总积分: ${data.totalPoints || 0}, 学生数: ${data.studentCount || 0}`);
    return true;
  } else {
    logTest('获取数据看板', false, result.data?.message || result.error);
    return false;
  }
}

async function test9_CreateGroup() {
  log('\n=== 测试9: 创建小组 ===', 'info');

  if (testContext.classIds.length === 0) {
    logTest('跳过小组创建', false, '没有可用的班级');
    return false;
  }

  const classId = testContext.classIds[0];
  const result = await request('POST', `/groups`, {
    name: '第一小组',
    classId
  });

  if (result.success && result.data.data) {
    testContext.groupIds.push(result.data.data.id);
    logTest('创建小组', true, `小组ID: ${result.data.data.id}`);
    return true;
  } else {
    logTest('创建小组', false, result.data?.message || result.error);
    return false;
  }
}

async function test10_CreateRule() {
  log('\n=== 测试10: 创建积分规则 ===', 'info');

  if (testContext.classIds.length === 0) {
    logTest('跳过规则创建', false, '没有可用的班级');
    return false;
  }

  const classId = testContext.classIds[0];
  const result = await request('POST', `/rules`, {
    name: '作业全对',
    value: 5,
    type: 'ADD',
    category: 'homework',
    classId
  });

  if (result.success && result.data.data) {
    testContext.ruleIds.push(result.data.data.id);
    logTest('创建积分规则', true, `规则ID: ${result.data.data.id}`);
    return true;
  } else {
    logTest('创建积分规则', false, result.data?.message || result.error);
    return false;
  }
}

// 主测试流程
async function runTests() {
  log('╔════════════════════════════════════════════════════════╗', 'info');
  log('║     班级积分管理系统 - 功能自测报告                    ║', 'info');
  log('╚════════════════════════════════════════════════════════╝', 'info');

  const tests = [
    { name: '用户登录', fn: test1_Login, critical: true },
    { name: '创建班级', fn: test2_CreateClasses },
    { name: '创建学生', fn: test3_CreateStudents },
    { name: '获取班级列表', fn: test4_GetClasses },
    { name: '获取学生列表', fn: test5_GetStudents },
    { name: '学生加分', fn: test6_AddPoints },
    { name: '学生扣分', fn: test7_DeductPoints },
    { name: '获取数据看板', fn: test8_GetDashboard },
    { name: '创建小组', fn: test9_CreateGroup },
    { name: '创建积分规则', fn: test10_CreateRule }
  ];

  const results = {
    total: tests.length,
    passed: 0,
    failed: 0,
    skipped: 0
  };

  for (const test of tests) {
    try {
      const passed = await test.fn();
      if (passed) {
        results.passed++;
      } else {
        results.failed++;
        // 如果是关键测试失败，停止后续测试
        if (test.critical) {
          log('\n关键测试失败，停止后续测试', 'error');
          results.skipped = tests.length - (results.passed + results.failed);
          break;
        }
      }
    } catch (error) {
      log(`测试异常: ${test.name}`, 'error');
      console.error(error);
      results.failed++;
    }

    // 等待一下，避免请求过快
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // 输出测试总结
  log('\n╔════════════════════════════════════════════════════════╗', 'info');
  log('║                    测试总结                            ║', 'info');
  log('╚════════════════════════════════════════════════════════╝', 'info');
  log(`总测试数: ${results.total}`, 'info');
  log(`通过: ${results.passed}`, 'success');
  log(`失败: ${results.failed}`, results.failed > 0 ? 'error' : 'success');
  if (results.skipped > 0) {
    log(`跳过: ${results.skipped}`, 'warning');
  }
  const passRate = ((results.passed / (results.total - results.skipped)) * 100).toFixed(2);
  log(`通过率: ${passRate}%`, results.failed === 0 ? 'success' : 'warning');

  log('\n测试完成！', 'success');
}

// 运行测试
runTests().catch(error => {
  log('测试执行失败', 'error');
  console.error(error);
  process.exit(1);
});
