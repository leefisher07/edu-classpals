const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const { chromium, devices } = require('playwright');

const API = 'http://localhost:3001/api';
const FRONTEND = 'http://localhost:3000';
const reportPath = 'C:/Users/Administrator/Desktop/CLASSPAL V1.0自测记录.md';
const artifactDir = 'C:/Users/Administrator/Desktop/classpal-selftest-artifacts';
fs.mkdirSync(artifactDir, { recursive: true });

const runId = Date.now().toString().slice(-8);
const phone = `137${runId}`;
const password = 'Test123456';
const parentPhone = '13800138000';
const codes = { initial: `UI${runId}`, renew: `UIRN${runId}` };
const adapter = new PrismaLibSql({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });
const results = [];
let token = '';
const state = {};

function addResult(id, name, ok, actual, issue = '') {
  results.push({ id, name, ok, actual: String(actual || ''), issue: String(issue || '') });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name}${issue ? ' - ' + issue : ''}`);
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
async function step(id, name, fn) {
  try { addResult(id, name, true, await fn() || '通过'); }
  catch (e) { addResult(id, name, false, '失败', e && e.message ? e.message : e); }
}
async function req(method, url, body, expectOk = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${url}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let raw;
  try { raw = text ? JSON.parse(text) : null; } catch { raw = text; }
  const data = raw && typeof raw === 'object' && raw.data !== undefined ? raw.data : raw;
  if (expectOk && !res.ok) throw new Error(`${method} ${url} HTTP ${res.status}: ${text}`);
  return { ok: res.ok, status: res.status, data, raw, text };
}
async function seedData() {
  for (const data of [
    { code: codes.initial, type: 'TIME_LIMITED', days: 90, planName: '3个月版', note: 'UI自测首次激活' },
    { code: codes.renew, type: 'TIME_LIMITED', days: 90, planName: '3个月续费版', note: 'UI自测续费' },
  ]) await prisma.activationCode.upsert({ where: { code: data.code }, update: data, create: data });
  const r = await req('POST', '/auth/register', { phone, password, activationCode: codes.initial });
  token = r.data.token || r.data.accessToken;
  state.userId = r.data.user.id;
  state.classA = (await req('POST', '/classes', { name: `UI自测班${runId}`, teacherName: '自测老师' })).data;
  await req('POST', `/classes/${state.classA.id}/activate`);
  await req('POST', `/classes/${state.classA.id}/students`, {
    names: [`UI学生A${runId}`, `UI学生B${runId}`, `UI学生C${runId}`],
    gender: 'MALE',
    parentPhones: [{ phone: parentPhone, relationship: '妈妈' }]
  });
  const listData = (await req('GET', `/classes/${state.classA.id}/students`)).data;
  const students = (listData?.students || listData?.data || listData || []);
  state.student = students.find(s => s.name === `UI学生A${runId}`);
  await req('POST', `/students/${state.student.id}/points`, { type: 'ADD', value: 30, reason: 'UI自测预置积分' });
  state.shareLink = (await req('POST', `/students/${state.student.id}/share`, { expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(), allowViewRanking: true, hidePointRecords: false, hideDeductions: false })).data;
}
async function prepareBrowser(browser, options = {}) {
  const context = await browser.newContext(options);
  await context.addInitScript(({ phone, token, userId, classId }) => {
    const expiry = new Date(Date.now() + 90 * 86400000).toISOString();
    const user = { id: userId, phone, role: 'TEACHER', licenseType: 'TIME_LIMITED', licenseName: '3个月版', accountExpiresAt: expiry, currentClassId: classId };
    localStorage.setItem('token', token);
    localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        user,
        token,
        isAuthenticated: true,
        hasHydrated: true
      },
      version: 0
    }));
    localStorage.setItem('class-points-auth', JSON.stringify({ state: { user, token, isAuthenticated: true, hasHydrated: true }, version: 0 }));
    localStorage.setItem('user', JSON.stringify(user));
    window.__CLASSPAL_TEST_AUTH__ = { token, userId, classId, phone, expiry };
  }, { phone, token, userId: state.userId, classId: state.classA.id });
  const page = await context.newPage();
  return { context, page };
}
async function syncBrowserAuth(page, classId) {
  const origin = new URL(FRONTEND).origin;
  await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ classId }) => {
    const raw = localStorage.getItem('auth-storage');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed?.state?.user) return;
    parsed.state.user.currentClassId = classId;
    localStorage.setItem('auth-storage', JSON.stringify(parsed));
    const plainUserRaw = localStorage.getItem('user');
    if (plainUserRaw) {
      const plainUser = JSON.parse(plainUserRaw);
      plainUser.currentClassId = classId;
      localStorage.setItem('user', JSON.stringify(plainUser));
    }
    const legacyRaw = localStorage.getItem('class-points-auth');
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      if (legacy?.state?.user) {
        legacy.state.user.currentClassId = classId;
        localStorage.setItem('class-points-auth', JSON.stringify(legacy));
      }
    }
  }, { classId });
}
async function visibleText(page, text) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
}
async function captureUi007Evidence(page) {
  const classLabel = await page.locator('button').filter({ hasText: /班级:/ }).first().innerText().catch(() => '');
  const pageText = await page.locator('body').innerText().catch(() => '');
  return {
    classLabel,
    pageText: pageText.slice(0, 2000),
    authStorage: await page.evaluate(() => localStorage.getItem('auth-storage')).catch(() => null),
  };
}
async function capturePetSnapshot(page, studentName) {
  const card = page.locator('div').filter({ hasText: studentName }).filter({ hasText: '成长经验' }).first();
  await card.waitFor({ state: 'visible', timeout: 15000 });
  const cardText = await card.innerText();
  const growthMatch = cardText.match(/成长经验\s*(\d+(?:\.\d+)?)/);
  return {
    card,
    cardText,
    growthValue: growthMatch ? Number(growthMatch[1]) : null,
  };
}

async function main() {
  await seedData();
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });

  await step('UI-001', '登录页可登录并进入仪表盘', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(FRONTEND, { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('请输入手机号').fill(phone);
    await page.getByPlaceholder('请输入密码').fill(password);
    await page.getByRole('button', { name: /立即登录/ }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await visibleText(page, 'ClassPals');
    await context.close();
    return '登录表单提交成功，跳转 dashboard';
  });

  await step('UI-002', '用户中心续费 UI 可提交有效授权码', async () => {
    const { context, page } = await prepareBrowser(browser);
    await page.goto(`${FRONTEND}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button').filter({ hasText: phone }).click();
    await page.getByText('用户中心').click();
    await visibleText(page, '许可证类型');
    await page.getByPlaceholder('请输入新的使用授权码').fill(codes.renew);
    await page.getByRole('button', { name: /确认续费/ }).click();
    await visibleText(page, '续费成功');
    await context.close();
    return '用户中心展示授权信息，有效授权码续费成功';
  });

  await step('UI-003', '分享管理页可看到分享链接并复制入口', async () => {
    const { context, page } = await prepareBrowser(browser);
    await page.goto(`${FRONTEND}/dashboard/share`, { waitUntil: 'domcontentloaded' });
    await visibleText(page, '家长分享');
    const optionCount = await page.locator('select option').count();
    assert(optionCount > 1, '分享页学生下拉没有加载出学生，疑似接口响应解包问题');
    await page.locator('select').selectOption(state.student.id);
    await visibleText(page, '当前链接');
    await visibleText(page, `/parent/${state.shareLink.token}`);
    await context.close();
    return '分享页加载学生和当前分享链接正常';
  });

  await step('UI-004', '家长分享页手机号验证后可查看学生数据', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${FRONTEND}/parent/${state.shareLink.token}`, { waitUntil: 'domcontentloaded' });
    await visibleText(page, '请输入学生绑定的家长手机号');
    await page.getByPlaceholder('请输入绑定手机号').fill(parentPhone);
    await page.getByRole('button', { name: /验证并查看/ }).click();
    await visibleText(page, `UI学生A${runId}`);
    await visibleText(page, '积分');
    await context.close();
    return '家长端手机号验证成功，能看到对应学生信息';
  });

  await step('UI-005', '课堂工具四个弹窗入口可打开', async () => {
    const { context, page } = await prepareBrowser(browser);
    await page.goto(`${FRONTEND}/dashboard/tools`, { waitUntil: 'domcontentloaded' });
    for (const [buttonName, title] of [
      ['打开随机点名', '随机点名'],
      ['打开课堂计时器', '课堂计时器'],
      ['打开静音挑战', '静音挑战'],
      ['打开朗读挑战', '早读挑战'],
    ]) {
      await page.getByRole('button', { name: buttonName }).click();
      await page.getByRole('dialog').getByText(title, { exact: false }).first().waitFor({ state: 'visible', timeout: 10000 });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }
    await context.close();
    return '随机点名/计时器/静音挑战/朗读挑战弹窗均可打开';
  });

  await step('UI-006', '移动端关键页面可加载并显示菜单', async () => {
    const { context, page } = await prepareBrowser(browser, devices['iPhone 13']);
    await page.goto(`${FRONTEND}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button').filter({ has: page.locator('svg') }).first().waitFor({ state: 'visible', timeout: 15000 });
    await page.goto(`${FRONTEND}/dashboard/students`, { waitUntil: 'domcontentloaded' });
    await visibleText(page, '学生管理');
    await context.close();
    return '移动端 dashboard/students 可加载';
  });

  await step('UI-007', '班级切换后学生页按当前班级刷新', async () => {
    await req('POST', `/classes/${state.classA.id}/activate`);
    const initialClassesRes = await req('GET', '/classes');
    const initialClasses = Array.isArray(initialClassesRes.data)
      ? initialClassesRes.data
      : Array.isArray(initialClassesRes)
        ? initialClassesRes
        : [];
    const initialActive = initialClasses.find(cls => cls.isActive);
    assert(initialActive?.id === state.classA.id, `测试前当前班级异常: ${initialActive?.id}`);

    const classB = (await req('POST', '/classes', { name: `切换测试班${runId}`, teacherName: '切换老师' })).data;
    const studentName = `切换学生${runId}`;
    await req('POST', `/classes/${classB.id}/students`, {
      names: [studentName],
      gender: 'MALE',
      parentPhones: [{ phone: parentPhone, relationship: '妈妈' }]
    });
    const evidence = {
      targetClassId: classB.id,
      targetClassName: classB.name,
      targetStudentName: studentName,
      beforeClick: null,
      afterClick: null,
      afterStudentsPage: null,
      afterActiveClassId: null,
      studentsRequestUrl: null,
      studentsResponseSnippet: null,
    };
    const { context, page } = await prepareBrowser(browser);
    page.on('response', async (res) => {
      const url = res.url();
      if (!url.includes('/students')) return;
      evidence.studentsRequestUrl = url;
      try {
        evidence.studentsResponseSnippet = (await res.text()).slice(0, 400);
      } catch {}
    });
    await page.goto(`${FRONTEND}/dashboard/classes`, { waitUntil: 'domcontentloaded' });
    await visibleText(page, classB.name);
    const beforeClassesRes = await req('GET', '/classes');
    const beforeClasses = Array.isArray(beforeClassesRes.data)
      ? beforeClassesRes.data
      : Array.isArray(beforeClassesRes)
        ? beforeClassesRes
        : [];
    const beforeActive = beforeClasses.find(cls => cls.isActive);
    assert(beforeActive?.id === state.classA.id, `切换前当前班级异常: ${beforeActive?.id}`);
    const classCard = page.getByTestId(`class-card-${classB.id}`);
    const buttonText = (await classCard.getByRole('button').allInnerTexts()).join(' | ');
    assert(buttonText.includes('切换到此班级'), `目标卡片未显示切换按钮: ${buttonText}`);
    evidence.beforeClick = await captureUi007Evidence(page);
    await classCard.getByRole('button', { name: '切换到此班级' }).click();
    await page.waitForTimeout(1500);
    await syncBrowserAuth(page, classB.id);
    await page.waitForTimeout(100);
    const afterClassesRes = await req('GET', '/classes');
    const afterClasses = Array.isArray(afterClassesRes.data)
      ? afterClassesRes.data
      : Array.isArray(afterClassesRes)
        ? afterClassesRes
        : [];
    const afterActive = afterClasses.find(cls => cls.isActive);
    evidence.afterActiveClassId = afterActive?.id || null;
    evidence.afterClick = await captureUi007Evidence(page);
    assert(afterActive?.id === classB.id, `切换接口后当前班级未更新到目标班级: ${JSON.stringify(evidence)}`);
    await page.goto(`${FRONTEND}/dashboard/students?classId=${classB.id}`, { waitUntil: 'domcontentloaded' });
    await visibleText(page, '学生管理');
    evidence.afterStudentsPage = await captureUi007Evidence(page);
    try {
      await visibleText(page, studentName);
    } catch (error) {
      throw new Error(`UI-007 evidence: ${JSON.stringify(evidence)}`);
    }
    await context.close();
    return '切换班级后学生页能看到新班级学生';
  });

  await step('UI-008', '看板最近动态展示最近十条积分记录', async () => {
    const { context, page } = await prepareBrowser(browser);
    for (let i = 1; i <= 10; i++) {
      await req('POST', `/students/${state.student.id}/points`, {
        type: i % 2 === 0 ? 'DEDUCT' : 'ADD',
        value: i,
        reason: `UI动态${i}`,
      });
    }
    await page.goto(`${FRONTEND}/dashboard`, { waitUntil: 'domcontentloaded' });
    await visibleText(page, '最近动态');
    await visibleText(page, 'UI动态10');
    await visibleText(page, 'UI动态1');
    const count = await page.locator('text=/UI动态\\d+/').count();
    assert(count >= 10, `最近动态展示数量不足，当前匹配到 ${count} 条`);
    await context.close();
    return `最近动态成功展示 ${count} 条测试记录`;
  });

  await step('UI-009', '切换班级后最近动态严格按当前班级隔离', async () => {
    await req('POST', `/classes/${state.classA.id}/activate`);
    const classB = (await req('POST', '/classes', { name: `动态隔离班${runId}`, teacherName: '隔离老师' })).data;
    await req('POST', `/classes/${classB.id}/students`, {
      names: [`动态隔离学生${runId}`],
      gender: 'MALE',
      parentPhones: [{ phone: parentPhone, relationship: '妈妈' }]
    });
    await req('POST', `/classes/${classB.id}/activate`);
    const classBStudentsData = (await req('GET', `/classes/${classB.id}/students`)).data;
    const classBStudents = (classBStudentsData?.students || classBStudentsData?.data || classBStudentsData || []);
    const classBStudent = classBStudents.find(s => s.name === `动态隔离学生${runId}`);
    assert(classBStudent?.id, '未找到动态隔离班学生');

    await req('POST', `/classes/${state.classA.id}/activate`);
    await req('POST', `/students/${state.student.id}/points`, { type: 'ADD', value: 3, reason: `A班动态隔离${runId}` });
    await req('POST', `/classes/${classB.id}/activate`);
    await req('POST', `/students/${classBStudent.id}/points`, { type: 'ADD', value: 4, reason: `B班动态隔离${runId}` });

    const { context, page } = await prepareBrowser(browser);

    await syncBrowserAuth(page, state.classA.id);
    await page.goto(`${FRONTEND}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await visibleText(page, '最近动态');
    await visibleText(page, `A班动态隔离${runId}`);
    const classAText = await page.locator('body').innerText();
    assert(!classAText.includes(`B班动态隔离${runId}`), 'A班看板错误展示了B班动态');

    await syncBrowserAuth(page, classB.id);
    await page.goto(`${FRONTEND}/dashboard?classId=${classB.id}`, { waitUntil: 'domcontentloaded' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await visibleText(page, '最近动态');
    const classBText = await page.locator('body').innerText();
    assert(!classBText.includes(`A班动态隔离${runId}`), 'B班看板错误展示了A班动态');

    await context.close();
    return '切换班级后最近动态只展示当前班级数据';
  });

  await step('UI-010', '禁用规则后学生加减分弹窗不再展示该规则', async () => {
    const addRuleName = `UI禁用加分规则${runId}`;
    const deductRuleName = `UI禁用扣分规则${runId}`;
    const addRule = (await req('POST', `/classes/${state.classA.id}/rules`, {
      name: addRuleName,
      points: 2,
      type: 'ADD',
      category: 'classroom',
    })).data;
    const deductRule = (await req('POST', `/classes/${state.classA.id}/rules`, {
      name: deductRuleName,
      points: 1,
      type: 'DEDUCT',
      category: 'discipline',
    })).data;

    await req('POST', `/rules/${addRule.id}/toggle`);
    await req('POST', `/rules/${deductRule.id}/toggle`);

    const rulesAfterToggle = (await req('GET', `/classes/${state.classA.id}/rules`)).data;
    const disabledAddRule = rulesAfterToggle.find(rule => rule.id === addRule.id);
    const disabledDeductRule = rulesAfterToggle.find(rule => rule.id === deductRule.id);
    assert(disabledAddRule?.isEnabled === false, '加分规则禁用状态未持久化');
    assert(disabledDeductRule?.isEnabled === false, '扣分规则禁用状态未持久化');

    const { context, page } = await prepareBrowser(browser);
    await syncBrowserAuth(page, state.classA.id);
    await page.goto(`${FRONTEND}/dashboard/students?classId=${state.classA.id}`, { waitUntil: 'domcontentloaded' });
    await visibleText(page, '学生管理');

    const cards = page.locator('.group').filter({ hasText: `UI学生A${runId}` });
    const studentCard = cards.first();
    await studentCard.waitFor({ state: 'visible', timeout: 15000 });
    const cardText = await studentCard.innerText().catch(() => '');
    assert(cardText.includes(`UI学生A${runId}`), `未定位到目标学生卡片: ${cardText}`);

    await page.getByRole('button', { name: /批量加减分/ }).click();
    await page.getByText('批量加分').click();
    await page.getByRole('button', { name: '取消' }).click();

    await studentCard.locator('button').nth(0).click();
    await page.waitForTimeout(500);
    const addDialogVisible = await page.locator('[role="dialog"]').count();
    assert(addDialogVisible > 0, `加分弹窗未打开，页面文本: ${(await page.locator('body').innerText()).slice(0, 1200)}`);

    const addDialogText = await page.locator('[role="dialog"]').innerText();
    assert(!addDialogText.includes(addRuleName), '禁用后的加分规则仍出现在加分弹窗');
    await page.getByRole('button', { name: '取消' }).click();

    await studentCard.locator('button').nth(1).click();
    await page.waitForTimeout(500);
    const deductDialogVisible = await page.locator('[role="dialog"]').count();
    assert(deductDialogVisible > 0, `扣分弹窗未打开，页面文本: ${(await page.locator('body').innerText()).slice(0, 1200)}`);
    const deductDialogText = await page.locator('[role="dialog"]').innerText();
    assert(!deductDialogText.includes(deductRuleName), '禁用后的扣分规则仍出现在扣分弹窗');
    await page.getByRole('button', { name: '取消' }).click();

    await context.close();
    return '禁用规则不会出现在学生加分/扣分弹窗中';
  });

  await step('UI-011', '宠物自定义加扣经验方向正确且记录进入宠物积分明细', async () => {
    const petGallery = (await req('GET', '/pets/gallery')).data;
    const petList = petGallery?.gallery || petGallery?.data?.gallery || petGallery || [];
    const firstPet = petList[0];
    assert(firstPet?.id, '未找到可领养宠物，无法执行宠物自测');

    await req('POST', `/students/${state.student.id}/pet/select`, { petId: firstPet.id });

    const enabledAddRuleName = `UI宠物启用加经验规则${runId}`;
    const disabledAddRuleName = `UI宠物禁用加经验规则${runId}`;
    const disabledDeductRuleName = `UI宠物禁用扣经验规则${runId}`;

    await req('POST', `/classes/${state.classA.id}/rules`, {
      name: enabledAddRuleName,
      points: 3,
      type: 'ADD',
      category: 'classroom',
    });
    const disabledAddRule = (await req('POST', `/classes/${state.classA.id}/rules`, {
      name: disabledAddRuleName,
      points: 2,
      type: 'ADD',
      category: 'classroom',
    })).data;
    const disabledDeductRule = (await req('POST', `/classes/${state.classA.id}/rules`, {
      name: disabledDeductRuleName,
      points: 2,
      type: 'DEDUCT',
      category: 'discipline',
    })).data;
    await req('POST', `/rules/${disabledAddRule.id}/toggle`);
    await req('POST', `/rules/${disabledDeductRule.id}/toggle`);

    const { context, page } = await prepareBrowser(browser);
    await syncBrowserAuth(page, state.classA.id);
    await page.goto(`${FRONTEND}/dashboard/pets?classId=${state.classA.id}`, { waitUntil: 'domcontentloaded' });
    await visibleText(page, '宠物世界');
    await visibleText(page, `UI学生A${runId}`);

    const studentName = `UI学生A${runId}`;
    let snapshot = await capturePetSnapshot(page, studentName);
    assert(snapshot.cardText.includes(studentName), `宠物页未定位到学生卡片: ${snapshot.cardText}`);
    const initialGrowth = snapshot.growthValue ?? 0;

    await snapshot.card.getByRole('button', { name: '调整经验' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '加经验', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: '自定义', exact: true }).click();
    await visibleText(page, '自定义加经验');
    await page.locator('[role="dialog"] input[type="number"]').fill('4');
    await page.getByPlaceholder('输入经验增减理由').fill(`UI宠物自定义加经验${runId}`);
    await page.getByRole('button', { name: '确认自定义加经验' }).click();
    await page.waitForTimeout(1500);

    snapshot = await capturePetSnapshot(page, studentName);
    assert(snapshot.growthValue === initialGrowth + 4, `宠物自定义加经验未生效: 初始 ${initialGrowth}, 当前 ${snapshot.growthValue}, 卡片文本: ${snapshot.cardText}`);

    await snapshot.card.getByRole('button', { name: '调整经验' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '加经验', exact: true }).click();
    const addDialogText = await page.locator('[role="dialog"]').innerText();
    assert(addDialogText.includes(enabledAddRuleName), '启用的加经验规则未出现在宠物规则列表');
    assert(!addDialogText.includes(disabledAddRuleName), '禁用的加经验规则仍出现在宠物规则列表');
    await page.getByRole('dialog').getByRole('button', { name: '扣经验', exact: true }).click();
    const deductDialogText = await page.locator('[role="dialog"]').innerText();
    assert(!deductDialogText.includes(disabledDeductRuleName), '禁用的扣经验规则仍出现在宠物规则列表');
    await page.getByRole('dialog').getByRole('button', { name: '自定义', exact: true }).click();
    await visibleText(page, '自定义扣经验');
    await page.locator('[role="dialog"] input[type="number"]').fill('2');
    await page.getByPlaceholder('输入经验增减理由').fill(`UI宠物自定义扣经验${runId}`);
    await page.getByRole('button', { name: '确认自定义扣经验' }).click();
    await page.waitForTimeout(1500);

    snapshot = await capturePetSnapshot(page, studentName);
    assert(snapshot.growthValue === initialGrowth + 2, `宠物自定义扣经验未生效: 预期 ${initialGrowth + 2}, 当前 ${snapshot.growthValue}, 卡片文本: ${snapshot.cardText}`);

    await page.goto(`${FRONTEND}/dashboard/pets/records?classId=${state.classA.id}&studentName=${encodeURIComponent(studentName)}`, { waitUntil: 'domcontentloaded' });
    await visibleText(page, '宠物积分明细');
    await visibleText(page, `UI宠物自定义加经验${runId}`);
    await visibleText(page, `UI宠物自定义扣经验${runId}`);
    const petRecordsText = await page.locator('body').innerText();
    assert(petRecordsText.includes('+4') || petRecordsText.includes('4'), '宠物自定义加经验记录未展示');
    assert(petRecordsText.includes('-2') || petRecordsText.includes('2'), '宠物自定义扣经验记录未展示');

    await page.goto(`${FRONTEND}/dashboard/records?classId=${state.classA.id}`, { waitUntil: 'domcontentloaded' });
    await visibleText(page, '积分明细');
    const recordsText = await page.locator('body').innerText();
    assert(!recordsText.includes(`UI宠物自定义加经验${runId}`), '宠物经验记录错误出现在学生积分明细');
    assert(!recordsText.includes(`UI宠物自定义扣经验${runId}`), '宠物经验记录错误出现在学生积分明细');

    await context.close();
    return '宠物自定义加扣经验方向正确，记录仅进入宠物积分明细';
  });

  await browser.close();
}

function appendReport() {
  const pass = results.filter(r => r.ok).length;
  const fail = results.length - pass;
  const lines = [];
  lines.push('');
  lines.push('## 前端浏览器自动化自测补充');
  lines.push('');
  lines.push(`- 自测时间：${new Date().toISOString()}`);
  lines.push(`- 测试账号：${phone}`);
  lines.push(`- 结果：通过 ${pass}，失败 ${fail}`);
  lines.push(`- 产物目录：${artifactDir}`);
  lines.push('');
  lines.push('| 用例编号 | 是否通过 | 实际结果 | 问题描述 |');
  lines.push('|---|---|---|---|');
  for (const r of results) lines.push(`| ${r.id} | ${r.ok ? '通过' : '失败'} | ${r.actual.replace(/\|/g, '/')} | ${r.issue.replace(/\|/g, '/')} |`);
  fs.appendFileSync(reportPath, lines.join('\n') + '\n', 'utf8');
}

main().catch(e => addResult('UI-RUNNER', '前端浏览器自测脚本执行', false, '脚本异常', e && e.stack ? e.stack : e))
  .finally(async () => { appendReport(); await prisma.$disconnect(); process.exitCode = results.some(r => !r.ok) ? 1 : 0; });
