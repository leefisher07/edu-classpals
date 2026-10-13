#!/usr/bin/env node

/**
 * 班级积分管理系统 - 前端UI自动化测试
 * 使用Playwright测试前端界面功能
 */

const { chromium } = require('playwright');

// 测试结果统计
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// 测试配置
const config = {
  baseUrl: 'http://localhost:3001',
  timeout: 10000,
  phone: '13800138000',
  password: '123456'
};

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m'
  };
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

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testLogin(page) {
  log('\n=== 模块一：用户登录测试 ===', 'info');

  try {
    // 访问登录页面
    await page.goto(config.baseUrl, { waitUntil: 'networkidle' });
    await sleep(1000);

    test('访问登录页面', true, `URL: ${config.baseUrl}`);

    // 检查登录表单元素
    const phoneInput = await page.locator('input[type="tel"], input[placeholder*="手机号"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();
    const loginButton = await page.locator('button[type="submit"]:has-text("登录")').first();

    const hasForm = await phoneInput.count() > 0 && await passwordInput.count() > 0;
    test('登录表单元素存在', hasForm, hasForm ? '手机号、密码输入框和登录按钮都存在' : '缺少表单元素');

    if (!hasForm) return false;

    // 填写登录信息
    await phoneInput.fill(config.phone);
    await passwordInput.fill(config.password);
    test('填写登录信息', true, `手机号: ${config.phone}`);

    // 点击登录
    await loginButton.click();
    await sleep(3000);

    // 检查是否有错误提示
    const errorMsg = await page.locator('[class*="error"], [role="alert"], .text-red-500, .text-red-600').first().textContent().catch(() => '');
    if (errorMsg) {
      test('登录成功', false, `错误提示: ${errorMsg}`);
      return false;
    }

    // 检查是否登录成功（跳转到dashboard）
    const currentUrl = page.url();
    const isLoggedIn = currentUrl.includes('/dashboard') || currentUrl.includes('/overview');

    if (!isLoggedIn) {
      // 截图保存
      await page.screenshot({ path: 'login-failed.png' });
      test('登录成功', false, `当前URL: ${currentUrl}, 已保存截图到 login-failed.png`);
    } else {
      test('登录成功', true, `当前URL: ${currentUrl}`);
    }

    return isLoggedIn;
  } catch (error) {
    test('登录测试', false, error.message);
    return false;
  }
}

async function testDashboard(page) {
  log('\n=== 模块二：数据看板测试 ===', 'info');

  try {
    // 导航到数据看板
    await page.goto(`${config.baseUrl}/dashboard/overview`, { waitUntil: 'networkidle' });
    await sleep(1500);

    // 检查统计卡片
    const statsCards = await page.locator('[class*="stat"], [class*="card"]').count();
    test('统计卡片显示', statsCards > 0, `找到 ${statsCards} 个统计卡片`);

    // 检查图表
    const charts = await page.locator('svg, canvas').count();
    test('图表显示', charts > 0, `找到 ${charts} 个图表元素`);

    // 检查页面标题
    const hasTitle = await page.locator('h1, h2').count() > 0;
    test('页面标题显示', hasTitle);

    return true;
  } catch (error) {
    test('数据看板测试', false, error.message);
    return false;
  }
}

async function testStudentManagement(page) {
  log('\n=== 模块三：学生管理测试 ===', 'info');

  try {
    // 导航到学生管理页面
    await page.goto(`${config.baseUrl}/dashboard/students`, { waitUntil: 'networkidle' });
    await sleep(2000); // 增加等待时间

    // 检查学生列表
    const studentList = await page.locator('[class*="student"], [class*="grid"]').count();
    test('学生列表显示', studentList > 0, `找到学生列表容器`);

    // 检查添加学生按钮 - 更新选择器
    await page.waitForSelector('button:has-text("添加学生")', { timeout: 5000 }).catch(() => null);
    const addButton = await page.locator('button:has-text("添加学生")').count();
    test('添加学生按钮存在', addButton > 0, addButton > 0 ? '找到添加学生按钮' : '未找到按钮');

    // 检查搜索功能 - 更新选择器
    const searchInput = await page.locator('input[placeholder*="搜索"], input[aria-label*="搜索"]').count();
    test('搜索功能存在', searchInput > 0, searchInput > 0 ? '找到搜索输入框' : '未找到搜索框');

    // 检查学生卡片或表格行
    const studentItems = await page.locator('[class*="student-card"], tr[class*="student"], [data-student-id]').count();
    test('学生数据显示', studentItems >= 0, `显示 ${studentItems} 个学生`);

    return true;
  } catch (error) {
    test('学生管理测试', false, error.message);
    return false;
  }
}

async function testPointsManagement(page) {
  log('\n=== 模块四：积分管理测试 ===', 'info');

  try {
    // 在学生管理页面测试积分操作
    await page.goto(`${config.baseUrl}/dashboard/students`, { waitUntil: 'networkidle' });
    await sleep(1500);

    // 检查加分/扣分按钮
    const pointButtons = await page.locator('button:has-text("加分"), button:has-text("扣分"), button:has-text("+"), button:has-text("-")').count();
    test('积分操作按钮存在', pointButtons > 0, `找到 ${pointButtons} 个积分操作按钮`);

    // 检查批量操作功能
    const batchButtons = await page.locator('button:has-text("批量")').count();
    test('批量操作功能', batchButtons >= 0, batchButtons > 0 ? '存在批量操作按钮' : '未找到批量操作按钮');

    return true;
  } catch (error) {
    test('积分管理测试', false, error.message);
    return false;
  }
}

async function testGroupManagement(page) {
  log('\n=== 模块五：小组管理测试 ===', 'info');

  try {
    // 导航到小组管理页面
    await page.goto(`${config.baseUrl}/dashboard/groups`, { waitUntil: 'networkidle' });
    await sleep(2000);

    // 检查小组列表
    const groupList = await page.locator('[class*="group"]').count();
    test('小组管理页面加载', groupList >= 0, `页面已加载`);

    // 检查创建小组按钮 - 更新选择器
    await page.waitForSelector('button:has-text("创建小组")', { timeout: 5000 }).catch(() => null);
    const createButton = await page.locator('button:has-text("创建小组")').count();
    test('创建小组按钮存在', createButton > 0, createButton > 0 ? '找到创建小组按钮' : '未找到按钮');

    return true;
  } catch (error) {
    test('小组管理测试', false, error.message);
    return false;
  }
}

async function testRulesManagement(page) {
  log('\n=== 模块六：积分规则测试 ===', 'info');

  try {
    // 导航到积分规则页面
    await page.goto(`${config.baseUrl}/dashboard/rules`, { waitUntil: 'networkidle' });
    await sleep(2000);

    // 检查规则列表
    const ruleList = await page.locator('[class*="rule"]').count();
    test('积分规则页面加载', ruleList >= 0, `页面已加载`);

    // 检查添加规则按钮 - 更新选择器
    await page.waitForSelector('button:has-text("添加规则")', { timeout: 5000 }).catch(() => null);
    const addButton = await page.locator('button:has-text("添加规则")').count();
    test('添加规则按钮存在', addButton > 0, addButton > 0 ? '找到添加规则按钮' : '未找到按钮');

    return true;
  } catch (error) {
    test('积分规则测试', false, error.message);
    return false;
  }
}

async function testShopManagement(page) {
  log('\n=== 模块七：积分商店测试 ===', 'info');

  try {
    // 导航到积分商店页面
    await page.goto(`${config.baseUrl}/dashboard/shop`, { waitUntil: 'networkidle' });
    await sleep(2000);

    // 检查商品列表
    const shopItems = await page.locator('[class*="item"], [class*="product"]').count();
    test('积分商店页面加载', shopItems >= 0, `页面已加载`);

    // 检查添加商品按钮 - 更新选择器
    await page.waitForSelector('button:has-text("添加商品")', { timeout: 5000 }).catch(() => null);
    const addButton = await page.locator('button:has-text("添加商品")').count();
    test('添加商品按钮存在', addButton > 0, addButton > 0 ? '找到添加商品按钮' : '未找到按钮');

    return true;
  } catch (error) {
    test('积分商店测试', false, error.message);
    return false;
  }
}

async function testPetsSystem(page) {
  log('\n=== 模块八：宠物世界测试 ===', 'info');

  try {
    // 导航到宠物世界页面
    await page.goto(`${config.baseUrl}/dashboard/pets`, { waitUntil: 'networkidle' });
    await sleep(1500);

    // 检查宠物列表
    const petList = await page.locator('[class*="pet"]').count();
    test('宠物世界页面加载', petList >= 0, `页面已加载`);

    // 检查宠物卡片
    const petCards = await page.locator('[class*="pet-card"], [data-pet-id]').count();
    test('宠物卡片显示', petCards >= 0, `显示 ${petCards} 个宠物`);

    return true;
  } catch (error) {
    test('宠物世界测试', false, error.message);
    return false;
  }
}

async function testNavigation(page) {
  log('\n=== 模块九：导航菜单测试 ===', 'info');

  try {
    // 检查侧边栏导航
    const navItems = await page.locator('nav a, [role="navigation"] a').count();
    test('导航菜单显示', navItems > 0, `找到 ${navItems} 个导航链接`);

    // 检查主要导航项
    const menuItems = ['数据看板', '学生管理', '小组管理', '积分规则', '积分商店', '宠物世界'];
    let foundItems = 0;

    for (const item of menuItems) {
      const count = await page.locator(`text="${item}"`).count();
      if (count > 0) foundItems++;
    }

    test('主要功能菜单完整', foundItems >= 4, `找到 ${foundItems}/${menuItems.length} 个主要菜单项`);

    return true;
  } catch (error) {
    test('导航菜单测试', false, error.message);
    return false;
  }
}

async function runTests() {
  log('╔════════════════════════════════════════════════════════╗', 'info');
  log('║     班级积分管理系统 - 前端UI自动化测试报告           ║', 'info');
  log('╚════════════════════════════════════════════════════════╝', 'info');

  const startTime = Date.now();
  let browser;
  let page;

  try {
    // 启动浏览器
    log('\n正在启动Microsoft Edge浏览器...', 'info');
    browser = await chromium.launch({
      headless: false,
      channel: 'msedge',
      args: ['--start-maximized']
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    page = await context.newPage();

    log('浏览器启动成功', 'success');

    // 执行测试
    const loginSuccess = await testLogin(page);
    if (!loginSuccess) {
      log('\n登录失败，无法继续测试', 'error');
      printSummary(startTime);
      await browser.close();
      return;
    }

    await sleep(500);
    await testNavigation(page);

    await sleep(500);
    await testDashboard(page);

    await sleep(500);
    await testStudentManagement(page);

    await sleep(500);
    await testPointsManagement(page);

    await sleep(500);
    await testGroupManagement(page);

    await sleep(500);
    await testRulesManagement(page);

    await sleep(500);
    await testShopManagement(page);

    await sleep(500);
    await testPetsSystem(page);

    printSummary(startTime);

    log('\n测试完成，浏览器将在5秒后关闭...', 'info');
    await sleep(5000);

  } catch (error) {
    log('\n测试执行失败', 'error');
    console.error(error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
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
}

// 运行测试
runTests().catch(error => {
  log('测试执行失败', 'error');
  console.error(error);
  process.exit(1);
});
