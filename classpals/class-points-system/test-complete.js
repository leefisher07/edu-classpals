#!/usr/bin/env node

/**
 * 班级积分管理系统 - 完整功能自测脚本
 * 通过API直接测试后端功能
 */

const API_BASE = 'http://localhost:3001/api';

// 测试结果统计
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// 测试上下文
const ctx = {
  token: null,
  userId: null,
  classId: null,
  studentIds: [],
  groupId: null,
  ruleId: null,
  itemId: null
};

// 工具函数
async function request(method, endpoint, data = null, useAuth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (useAuth && ctx.token) {
    headers['Authorization'] = `Bearer ${ctx.token}`;
  }

  const options = { method, headers };
  if (data) options.body = JSON.stringify(data);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const result = await response.json();
    return { success: response.ok, status: response.status, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function log(message, type = 'info') {
  const colors = { info: '\x1b[36m', success: '\x1b[32m', error: '\x1b[31m', warning: '\x1b[33m' };
  console.log(`${colors[type]}${message}\x1b[0m`);
}

function test(name, passed, details = '') {
  testResults.total++;
  const icon = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${icon} ${name}\x1b[0m`);
  if (details) console.log(`  ${details}`);
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
    testResults.errors.push({ name, details });
  }
}

// 测试用例
async function testLogin() {
  log('\n=== 模块一：用户登录测试 ===', 'info');

  // 测试1：正常登录
  const result = await request('POST', '/auth/login', {
    phone: '13800138000',
    password: '123456'
  }, false);

  if (result.success && result.data.data) {
    ctx.token = result.data.data.token;
    ctx.userId = result.data.data.user.id;
    test('用户登录', true, `Token: ${ctx.token.substring(0, 30)}...`);
    return true;
  } else {
    test('用户登录', false, result.data?.message || result.error);
    log('提示：请先在数据库中创建测试用户（手机号: 13800138000, 密码: Test123456）', 'warning');
    return false;
  }
}

async function testClassManagement() {
  log('\n=== 模块二：班级管理测试 ===', 'info');

  // 测试1：创建班级
  const createResult = await request('POST', '/classes', {
    name: '测试班级1',
    teacherName: '张老师'
  });

  if (createResult.success && createResult.data.data) {
    ctx.classId = createResult.data.data.id;
    test('创建班级', true, `班级ID: ${ctx.classId}`);
  } else {
    test('创建班级', false, createResult.data?.message || createResult.error);
    return false;
  }

  // 测试2：获取班级列表
  const listResult = await request('GET', '/classes');
  if (listResult.success && listResult.data.data) {
    const classes = Array.isArray(listResult.data.data) ? listResult.data.data : [];
    test('获取班级列表', true, `共 ${classes.length} 个班级`);
  } else {
    test('获取班级列表', false, listResult.data?.message || listResult.error);
  }

  // 测试3：获取班级详情
  const detailResult = await request('GET', `/classes/${ctx.classId}`);
  if (detailResult.success && detailResult.data.data) {
    test('获取班级详情', true, `班级名称: ${detailResult.data.data.name}`);
  } else {
    test('获取班级详情', false, detailResult.data?.message || detailResult.error);
  }

  return true;
}

async function testStudentManagement() {
  log('\n=== 模块三：学生管理测试 ===', 'info');

  if (!ctx.classId) {
    test('学生管理测试', false, '没有可用的班级ID');
    return false;
  }

  const students = [
    { names: ['张三'], gender: 'MALE', studentNumber: '001' },
    { names: ['李四'], gender: 'MALE', studentNumber: '002' },
    { names: ['王五'], gender: 'FEMALE', studentNumber: '003' },
    { names: ['赵六'], gender: 'MALE', studentNumber: '004' },
    { names: ['钱七'], gender: 'FEMALE', studentNumber: '005' }
  ];

  // 测试1：批量创建学生
  for (const student of students) {
    const result = await request('POST', `/classes/${ctx.classId}/students`, {
      ...student
    });

    if (result.success && result.data.data) {
      const createdStudents = result.data.data.created || [];
      if (createdStudents.length > 0) {
        ctx.studentIds.push(createdStudents[0].id);
        test(`创建学生: ${student.names[0]}`, true, `学号: ${student.studentNumber}`);
      } else {
        test(`创建学生: ${student.names[0]}`, false, '未返回学生数据');
      }
    } else {
      test(`创建学生: ${student.names[0]}`, false, result.data?.message || result.error);
    }
  }

  // 测试2：获取学生列表
  const listResult = await request('GET', `/classes/${ctx.classId}/students`);
  if (listResult.success && listResult.data.data) {
    const students = Array.isArray(listResult.data.data) ? listResult.data.data : (listResult.data.data.students || []);
    test('获取学生列表', true, `共 ${students.length} 个学生`);
  } else {
    test('获取学生列表', false, listResult.data?.message || listResult.error);
  }

  return ctx.studentIds.length > 0;
}

async function testPointsManagement() {
  log('\n=== 模块四：积分管理测试 ===', 'info');

  if (ctx.studentIds.length === 0) {
    test('积分管理测试', false, '没有可用的学生');
    return false;
  }

  // 测试1：学生加分
  const addResult = await request('POST', `/students/${ctx.studentIds[0]}/points`, {
    type: 'ADD',
    value: 5,
    reason: '课堂表现优秀'
  });

  if (addResult.success) {
    test('学生加分', true, '加5分成功');
  } else {
    test('学生加分', false, addResult.data?.message || addResult.error);
  }

  // 测试2：学生扣分
  const deductResult = await request('POST', `/students/${ctx.studentIds[1]}/points`, {
    type: 'DEDUCT',
    value: 2,
    reason: '作业未完成'
  });

  if (deductResult.success) {
    test('学生扣分', true, '扣2分成功');
  } else {
    test('学生扣分', false, deductResult.data?.message || deductResult.error);
  }

  // 测试3：获取积分记录
  const recordsResult = await request('GET', `/classes/${ctx.classId}/points/records`);
  if (recordsResult.success && recordsResult.data.data) {
    test('获取积分记录', true, `共 ${recordsResult.data.data.records?.length || 0} 条记录`);
  } else {
    test('获取积分记录', false, recordsResult.data?.message || recordsResult.error);
  }

  return true;
}

async function testGroupManagement() {
  log('\n=== 模块五：小组管理测试 ===', 'info');

  if (!ctx.classId) {
    test('小组管理测试', false, '没有可用的班级ID');
    return false;
  }

  // 测试1：创建小组
  const createResult = await request('POST', `/classes/${ctx.classId}/groups`, {
    name: '第一小组'
  });

  if (createResult.success && createResult.data.data) {
    ctx.groupId = createResult.data.data.id;
    test('创建小组', true, `小组ID: ${ctx.groupId}`);
  } else {
    test('创建小组', false, createResult.data?.message || createResult.error);
    return false;
  }

  // 测试2：获取小组列表
  const listResult = await request('GET', `/classes/${ctx.classId}/groups`);
  if (listResult.success && listResult.data.data) {
    test('获取小组列表', true, `共 ${listResult.data.data.groups?.length || 0} 个小组`);
  } else {
    test('获取小组列表', false, listResult.data?.message || listResult.error);
  }

  return true;
}

async function testRulesManagement() {
  log('\n=== 模块六：积分规则测试 ===', 'info');

  if (!ctx.classId) {
    test('积分规则测试', false, '没有可用的班级ID');
    return false;
  }

  // 测试1：创建加分规则
  const createResult = await request('POST', `/classes/${ctx.classId}/rules`, {
    name: '作业全对',
    points: 5,
    type: 'ADD',
    category: 'homework'
  });

  if (createResult.success && createResult.data.data) {
    ctx.ruleId = createResult.data.data.id;
    test('创建积分规则', true, `规则ID: ${ctx.ruleId}`);
  } else {
    test('创建积分规则', false, createResult.data?.message || createResult.error);
    return false;
  }

  // 测试2：获取规则列表
  const listResult = await request('GET', `/classes/${ctx.classId}/rules`);
  if (listResult.success && listResult.data.data) {
    test('获取规则列表', true, `共 ${listResult.data.data.rules?.length || 0} 条规则`);
  } else {
    test('获取规则列表', false, listResult.data?.message || listResult.error);
  }

  return true;
}

async function testShopManagement() {
  log('\n=== 模块七：积分商店测试 ===', 'info');

  if (!ctx.classId) {
    test('积分商店测试', false, '没有可用的班级ID');
    return false;
  }

  // 测试1：创建商品
  const createResult = await request('POST', `/classes/${ctx.classId}/shop/items`, {
    name: '笔记本',
    price: 10,
    stock: 5,
    description: '精美笔记本',
    category: 'PHYSICAL'
  });

  if (createResult.success && createResult.data.data) {
    ctx.itemId = createResult.data.data.id;
    test('创建商品', true, `商品ID: ${ctx.itemId}`);
  } else {
    test('创建商品', false, createResult.data?.message || createResult.error);
    return false;
  }

  // 测试2：获取商品列表
  const listResult = await request('GET', `/classes/${ctx.classId}/shop/items`);
  if (listResult.success && listResult.data.data) {
    test('获取商品列表', true, `共 ${listResult.data.data.items?.length || 0} 个商品`);
  } else {
    test('获取商品列表', false, listResult.data?.message || listResult.error);
  }

  return true;
}

async function testDashboard() {
  log('\n=== 模块八：数据看板测试 ===', 'info');

  if (!ctx.classId) {
    test('数据看板测试', false, '没有可用的班级ID');
    return false;
  }

  // 测试1：获取数据概览
  const overviewResult = await request('GET', `/classes/${ctx.classId}/dashboard/overview`);
  if (overviewResult.success && overviewResult.data.data) {
    const data = overviewResult.data.data;
    test('获取数据概览', true,
      `总积分: ${data.totalPoints || 0}, 学生数: ${data.studentCount || 0}`);
  } else {
    test('获取数据概览', false, overviewResult.data?.message || overviewResult.error);
  }

  // 测试2：获取排行榜
  const rankingResult = await request('GET', `/classes/${ctx.classId}/dashboard/ranking/students?period=total`);
  if (rankingResult.success && rankingResult.data.data) {
    test('获取排行榜', true, `前5名数据获取成功`);
  } else {
    test('获取排行榜', false, rankingResult.data?.message || rankingResult.error);
  }

  // 测试3：获取趋势数据
  const trendResult = await request('GET', `/classes/${ctx.classId}/dashboard/trend?days=7`);
  if (trendResult.success && trendResult.data.data) {
    test('获取趋势数据', true, `近7天趋势数据获取成功`);
  } else {
    test('获取趋势数据', false, trendResult.data?.message || trendResult.error);
  }

  return true;
}

async function testPetsSystem() {
  log('\n=== 模块九：宠物系统测试 ===', 'info');

  if (!ctx.classId || ctx.studentIds.length === 0) {
    test('宠物系统测试', false, '没有可用的班级或学生');
    return false;
  }

  // 测试1：获取宠物列表
  const listResult = await request('GET', `/classes/${ctx.classId}/pets`);
  if (listResult.success && listResult.data.data) {
    test('获取宠物列表', true, `共 ${listResult.data.data.pets?.length || 0} 只宠物`);
  } else {
    test('获取宠物列表', false, listResult.data?.message || listResult.error);
  }

  // 测试2：获取宠物图鉴
  const catalogResult = await request('GET', '/pets/gallery');
  if (catalogResult.success && catalogResult.data.data) {
    test('获取宠物图鉴', true, `共 ${catalogResult.data.data.pets?.length || 0} 种宠物`);
  } else {
    test('获取宠物图鉴', false, catalogResult.data?.message || catalogResult.error);
  }

  return true;
}

// 主测试流程
async function runTests() {
  log('╔════════════════════════════════════════════════════════╗', 'info');
  log('║     班级积分管理系统 - 功能自测报告                    ║', 'info');
  log('╚════════════════════════════════════════════════════════╝', 'info');

  const startTime = Date.now();

  // 执行测试
  const loginSuccess = await testLogin();
  if (!loginSuccess) {
    log('\n登录失败，无法继续测试', 'error');
    printSummary(startTime);
    return;
  }

  await new Promise(resolve => setTimeout(resolve, 300));
  await testClassManagement();

  await new Promise(resolve => setTimeout(resolve, 300));
  await testStudentManagement();

  await new Promise(resolve => setTimeout(resolve, 300));
  await testPointsManagement();

  await new Promise(resolve => setTimeout(resolve, 300));
  await testGroupManagement();

  await new Promise(resolve => setTimeout(resolve, 300));
  await testRulesManagement();

  await new Promise(resolve => setTimeout(resolve, 300));
  await testShopManagement();

  await new Promise(resolve => setTimeout(resolve, 300));
  await testDashboard();

  await new Promise(resolve => setTimeout(resolve, 300));
  await testPetsSystem();

  printSummary(startTime);
}

function printSummary(startTime) {
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  log('\n╔════════════════════════════════════════════════════════╗', 'info');
  log('║                    测试总结                            ║', 'info');
  log('╚════════════════════════════════════════════════════════╝', 'info');
  log(`总测试数: ${testResults.total}`, 'info');
  log(`通过: ${testResults.passed}`, 'success');
  log(`失败: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'success');

  const passRate = testResults.total > 0
    ? ((testResults.passed / testResults.total) * 100).toFixed(2)
    : 0;
  log(`通过率: ${passRate}%`, testResults.failed === 0 ? 'success' : 'warning');
  log(`耗时: ${duration}秒`, 'info');

  if (testResults.errors.length > 0) {
    log('\n失败的测试:', 'error');
    testResults.errors.forEach((err, index) => {
      log(`${index + 1}. ${err.name}`, 'error');
      if (err.details) log(`   ${err.details}`, 'error');
    });
  }

  log('\n测试完成！', 'success');
}

// 运行测试
runTests().catch(error => {
  log('测试执行失败', 'error');
  console.error(error);
  process.exit(1);
});
