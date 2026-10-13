const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const { chromium } = require('playwright');

const API = 'http://localhost:3001/api';
const FRONTEND = 'http://localhost:3000';
const reportPath = 'C:/Users/Administrator/Desktop/CLASSPAL V1.0自测记录.md';
const artifactDir = 'C:/Users/Administrator/Desktop/classpal-selftest-artifacts';
fs.mkdirSync(artifactDir, { recursive: true });

const runId = Date.now().toString().slice(-8);
const phone = `138${runId}`;
const password = 'Test123456';
const parentPhone = '13800138000';
const codes = { initial: `FX${runId}`, renew: `FXRN${runId}` };
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
    { code: codes.initial, type: 'TIME_LIMITED', days: 90, planName: '3个月版', note: '问题修复自测首次激活' },
    { code: codes.renew, type: 'TIME_LIMITED', days: 90, planName: '3个月续费版', note: '问题修复自测续费' },
  ]) await prisma.activationCode.upsert({ where: { code: data.code }, update: data, create: data });

  const r = await req('POST', '/auth/register', { phone, password, activationCode: codes.initial });
  token = r.data.token || r.data.accessToken;
  state.userId = r.data.user.id;
  state.classA = (await req('POST', '/classes', { name: `修复自测班${runId}`, teacherName: '自测老师' })).data;
  await req('POST', `/classes/${state.classA.id}/activate`);

  state.group1 = (await req('POST', `/classes/${state.classA.id}/groups`, { name: `第一组${runId}` })).data;
  state.group2 = (await req('POST', `/classes/${state.classA.id}/groups`, { name: `第二组${runId}` })).data;

  await req('POST', `/classes/${state.classA.id}/students`, {
    names: [`修复学生A${runId}`, `修复学生B${runId}`],
    gender: 'MALE',
    groupId: state.group2.id,
    parentPhones: [{ phone: parentPhone, relationship: '妈妈' }]
  });

  const listData = (await req('GET', `/classes/${state.classA.id}/students`)).data;
  const students = listData?.students || listData || [];
  state.student = students.find((s) => s.name === `修复学生A${runId}`);
  state.studentB = students.find((s) => s.name === `修复学生B${runId}`);

  state.ruleAdd = (await req('POST', `/classes/${state.classA.id}/rules`, { name: '课堂表现', type: 'ADD', points: 5 })).data;
  state.ruleDeduct = (await req('POST', `/classes/${state.classA.id}/rules`, { name: '课堂提醒', type: 'DEDUCT', points: 2 })).data;

  await req('POST', `/students/${state.student.id}/points`, { type: 'ADD', value: 20, reason: '预置积分A' });
  await req('POST', `/students/${state.student.id}/points`, { type: 'DEDUCT', value: 3, reason: '预置扣分A' });
  await req('POST', `/students/${state.studentB.id}/points`, { type: 'ADD', value: 12, reason: '预置积分B' });

  state.shopItem = (await req('POST', `/classes/${state.classA.id}/shop/items`, {
    name: `奖品${runId}`,
    price: 10,
    stock: 5,
    category: 'PHYSICAL'
  })).data;

  const gallery = (await req('GET', '/pets/gallery')).data;
  state.petA = (gallery?.gallery || gallery || [])[0];
  state.petB = (gallery?.gallery || gallery || [])[1] || state.petA;
  assert(state.petA, '宠物图鉴为空，无法执行宠物自测');

  await req('POST', `/students/${state.student.id}/pet/select`, { petId: state.petA.id });
  await req('POST', `/students/${state.student.id}/pet/points`, { type: 'ADD', value: 35, reason: '预置经验' });
}
async function prepareBrowser(browser) {
  const context = await browser.newContext();
  await context.addInitScript(({ phone, token, userId, classId }) => {
    const expiry = new Date(Date.now() + 90 * 86400000).toISOString();
    const user = { id: userId, phone, role: 'TEACHER', licenseType: 'TIME_LIMITED', licenseName: '3个月版', accountExpiresAt: expiry, currentClassId: classId };
    localStorage.setItem('token', token);
    localStorage.setItem('auth-storage', JSON.stringify({ state: { user, token, isAuthenticated: true, hasHydrated: true }, version: 0 }));
    localStorage.setItem('class-points-auth', JSON.stringify({ state: { user, token, isAuthenticated: true, hasHydrated: true }, version: 0 }));
    localStorage.setItem('user', JSON.stringify(user));
  }, { phone, token, userId: state.userId, classId: state.classA.id });
  const page = await context.newPage();
  return { context, page };
}
async function visibleText(page, text) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
}

async function main() {
  await seedData();
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });

  await step('FIX-001', '新增学生分组正确写入', async () => {
    const list = (await req('GET', `/classes/${state.classA.id}/students`)).data;
    const students = list?.students || list || [];
    const created = students.find((s) => s.name === `修复学生A${runId}`);
    assert(created?.groupId === state.group2.id, '学生未写入选中的小组');
    return `学生写入分组 ${state.group2.name}`;
  });

  await step('FIX-002', '首页概览和排行接口有数据', async () => {
    const overview = (await req('GET', `/classes/${state.classA.id}/dashboard/overview`)).data;
    const ranking = (await req('GET', `/classes/${state.classA.id}/dashboard/ranking/students?limit=5`)).data;
    assert((overview?.studentCount || 0) >= 2, '概览学生数异常');
    assert(Array.isArray(ranking) && ranking.length > 0, '个人排行为空');
    return `概览学生 ${overview.studentCount}，排行 ${ranking.length} 条`;
  });

  await step('FIX-003', '学生积分明细接口返回加减分记录', async () => {
    const history = (await req('GET', `/students/${state.student.id}/points/history?page=1&limit=20`)).data;
    const records = history?.records || [];
    assert(records.some((r) => r.points > 0), '未找到加分记录');
    assert(records.some((r) => r.points < 0), '未找到减分记录');
    return `明细 ${records.length} 条，含加分和减分`;
  });

  await step('FIX-004', '学生兑换商品接口链路正常', async () => {
    const items = (await req('GET', `/classes/${state.classA.id}/shop/items`)).data;
    const itemList = items?.items || items || [];
    assert(itemList.some((item) => item.id === state.shopItem.id), '商品列表未返回可用商品');
    await req('POST', `/students/${state.student.id}/exchanges`, { itemId: state.shopItem.id });
    const exchanges = (await req('GET', `/students/${state.student.id}/exchanges`)).data;
    const exchangeList = Array.isArray(exchanges) ? exchanges : exchanges?.exchanges || [];
    assert(exchangeList.length > 0, '兑换记录未生成');
    return `商品可见，兑换记录 ${exchangeList.length} 条`;
  });

  await step('FIX-005', '随机点名接口可读取学生', async () => {
    const picked = (await req('POST', `/classes/${state.classA.id}/tools/random-pick`, { count: 1 })).data;
    assert(Array.isArray(picked?.picked) && picked.picked.length === 1, '随机点名未返回学生');
    return `抽中 ${picked.picked[0].name}`;
  });

  await step('FIX-006', '宠物回到蛋态不是弃养', async () => {
    await req('DELETE', `/students/${state.student.id}/pet`);
    const pet = (await req('GET', `/students/${state.student.id}/pet`)).data;
    assert(pet && pet.stage === 'EGG', '回蛋后宠物不存在或阶段不为 EGG');
    assert((pet.experience || 0) === 0, '回蛋后经验未清零');
    return `阶段 ${pet.stage}，经验 ${pet.experience}`;
  });

  await step('FIX-007', '宠物扣经验不会出现负数', async () => {
    await req('POST', `/students/${state.student.id}/pet/points`, { type: 'DEDUCT', value: 99, reason: '大额扣减' });
    const pet = (await req('GET', `/students/${state.student.id}/pet`)).data;
    assert((pet.experience || 0) === 0, '宠物经验出现负数');
    return `经验保持 ${pet.experience}`;
  });

  await step('FIX-008', '更换宠物保留经验并匹配阶段', async () => {
    await req('POST', `/students/${state.student.id}/pet/points`, { type: 'ADD', value: 35, reason: '重新加经验' });
    const before = (await req('GET', `/students/${state.student.id}/pet`)).data;
    await req('POST', `/students/${state.student.id}/pet/select`, { petId: state.petB.id });
    const after = (await req('GET', `/students/${state.student.id}/pet`)).data;
    assert((after.experience || 0) === (before.experience || 0), '更换宠物后经验未保留');
    assert(after.stage === before.stage, '更换宠物后阶段未按经验匹配');
    return `经验 ${after.experience}，阶段 ${after.stage}`;
  });

  await step('FIX-009', '前端学生页与快捷面板正常显示', async () => {
    const { context, page } = await prepareBrowser(browser);
    await page.goto(`${FRONTEND}/dashboard/students`, { waitUntil: 'domcontentloaded' });
    await visibleText(page, '学生管理');
    await visibleText(page, `修复学生A${runId}`);
    await page.getByRole('button', { name: /快捷面板/ }).click();
    await visibleText(page, '个人排行');
    await visibleText(page, '小组排行');
    await context.close();
    return '学生页和快捷面板加载正常';
  });

  await step('FIX-010', '前端学生积分明细显示且无家长模板入口', async () => {
    const { context, page } = await prepareBrowser(browser);
    await page.goto(`${FRONTEND}/dashboard/students`, { waitUntil: 'domcontentloaded' });
    await visibleText(page, `修复学生A${runId}`);
    await page.getByRole('button', { name: /查看积分明细/ }).first().click();
    await visibleText(page, '积分明细');
    await visibleText(page, '预置积分A');
    const parentTemplateVisible = await page.getByRole('button', { name: /家长模板/ }).count();
    assert(parentTemplateVisible === 0, '家长模板入口仍然可见');
    await context.close();
    return '明细可见，家长模板已隐藏';
  });

  await step('FIX-011', '前端点名工具可加载学生', async () => {
    const { context, page } = await prepareBrowser(browser);
    await page.goto(`${FRONTEND}/dashboard/tools`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /打开随机点名/ }).click();
    await visibleText(page, '随机点名');
    await visibleText(page, `修复学生A${runId}`);
    await context.close();
    return '随机点名弹窗可见且已加载学生';
  });

  await step('FIX-012', '前端宠物页隐藏经验记录入口并保留回蛋/更换', async () => {
    const { context, page } = await prepareBrowser(browser);
    await page.goto(`${FRONTEND}/dashboard/pets`, { waitUntil: 'domcontentloaded' });
    await visibleText(page, '宠物世界');
    await visibleText(page, `修复学生A${runId}`);
    assert(await page.getByRole('link', { name: /加经验记录/ }).count() === 0, '加经验记录入口仍可见');
    assert(await page.getByRole('link', { name: /扣经验记录/ }).count() === 0, '扣经验记录入口仍可见');
    assert(await page.getByRole('button', { name: /经验明细/ }).count() === 0, '经验明细入口仍可见');
    assert(await page.getByRole('button', { name: /回到蛋态/ }).count() > 0, '回到蛋态入口缺失');
    assert(await page.getByRole('button', { name: /^更换$/ }).count() > 0, '更换宠物入口缺失');
    await context.close();
    return '经验记录入口已隐藏，回蛋/更换入口保留';
  });

  await step('FIX-013', '前端宠物设置隐藏分配模式入口', async () => {
    const { context, page } = await prepareBrowser(browser);
    await page.goto(`${FRONTEND}/dashboard/pets/settings`, { waitUntil: 'domcontentloaded' });
    await visibleText(page, '宠物设置');
    assert(await page.getByText('宠物分配模式').count() === 0, '宠物分配模式标题仍可见');
    assert(await page.getByText(/教师分配|学生自选/).count() === 0, '分配模式选项仍可见');
    await context.close();
    return '分配模式入口已隐藏';
  });

  await browser.close();
}

function appendReport() {
  const pass = results.filter(r => r.ok).length;
  const fail = results.length - pass;
  const lines = [];
  lines.push('');
  lines.push('## 问题修复专项自测补充');
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

main().catch(e => addResult('FIX-RUNNER', '问题修复专项自测脚本执行', false, '脚本异常', e && e.stack ? e.stack : e))
  .finally(async () => { appendReport(); await prisma.$disconnect(); process.exitCode = results.some(r => !r.ok) ? 1 : 0; });
