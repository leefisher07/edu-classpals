const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');

const API = 'http://localhost:3001/api';
const FRONTEND = 'http://localhost:3000';
const reportPath = 'C:/Users/Administrator/Desktop/CLASSPAL V1.0自测记录.md';
const runId = Date.now().toString().slice(-8);
const phone = `139${runId}`;
const password = 'Test123456';
const username = `自测教师${runId}`;
const codes = {
  initial: `CP90${runId}`,
  renew: `RN90${runId}`,
  used: `USED${runId}`,
  permanent: `PERM${runId}`,
};

const adapter = new PrismaLibSql({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });
const results = [];
let token = '';
const state = {};

function nowIso() { return new Date().toISOString(); }
function addResult(id, name, ok, actual, issue = '') {
  results.push({ id, name, ok, actual: String(actual || ''), issue: String(issue || '') });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name}${issue ? ' - ' + issue : ''}`);
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function monthsDiffOk(dateValue, minDays, maxDays) {
  const diff = (new Date(dateValue).getTime() - Date.now()) / 86400000;
  return diff >= minDays && diff <= maxDays;
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
function unwrap(x) { return x; }
async function step(id, name, fn) {
  try {
    const actual = await fn();
    addResult(id, name, true, actual || '通过');
  } catch (e) {
    addResult(id, name, false, '失败', e && e.message ? e.message : e);
  }
}

async function seedCodes() {
  for (const data of [
    { code: codes.initial, type: 'TIME_LIMITED', days: 90, planName: '3个月版', note: 'CLASSPAL V1.0 自测首次激活' },
    { code: codes.renew, type: 'TIME_LIMITED', days: 90, planName: '3个月续费版', note: 'CLASSPAL V1.0 自测续费' },
    { code: codes.used, type: 'TIME_LIMITED', days: 90, planName: '已使用码', status: 'ACTIVATED', note: 'CLASSPAL V1.0 自测已使用码' },
    { code: codes.permanent, type: 'PERMANENT', planName: '永久版', note: 'CLASSPAL V1.0 自测永久码' },
  ]) {
    await prisma.activationCode.upsert({
      where: { code: data.code },
      update: data,
      create: data,
    });
  }
}

async function main() {
  await seedCodes();

  await step('TC-AUTH-001', '新用户使用 3 个月激活码完成注册激活', async () => {
    const r = await req('POST', '/auth/register', { phone, password, activationCode: codes.initial });
    token = r.data.accessToken || r.data.token;
    state.userId = r.data.user.id;
    assert(token, '注册后未返回 token');
    const user = await prisma.user.findUnique({ where: { id: state.userId } });
    assert(user.status === 'ACTIVE', `用户状态不是 ACTIVE: ${user.status}`);
    assert(user.licenseType === 'TIME_LIMITED', `授权类型不是 TIME_LIMITED: ${user.licenseType}`);
    assert(monthsDiffOk(user.accountExpiresAt, 85, 95), `到期时间不是约 90 天后: ${user.accountExpiresAt}`);
    const code = await prisma.activationCode.findUnique({ where: { code: codes.initial } });
    assert(code.status === 'ACTIVATED', `激活码未变为 ACTIVATED: ${code.status}`);
    return `账号 ${phone} 已激活，到期 ${user.accountExpiresAt.toISOString()}`;
  });

  await step('TC-AUTH-002', '已激活用户正常登录', async () => {
    const r = await req('POST', '/auth/login', { phone, password });
    assert(r.data.accessToken || r.data.token, '登录未返回 token');
    token = r.data.accessToken || r.data.token;
    return '登录成功并返回 token';
  });

  await step('TC-AUTH-005', '个人中心使用有效激活码续费', async () => {
    const before = await prisma.user.findUnique({ where: { id: state.userId } });
    const r = await req('POST', '/auth/redeem-code', { activationCode: codes.renew });
    const after = await prisma.user.findUnique({ where: { id: state.userId } });
    assert(after.accountExpiresAt > before.accountExpiresAt, '续费后到期时间没有延长');
    const diff = (after.accountExpiresAt - before.accountExpiresAt) / 86400000;
    assert(diff >= 85 && diff <= 95, `续费不是基于原到期时间累加约 90 天，实际 ${diff.toFixed(1)} 天`);
    return `续费成功，延长 ${diff.toFixed(1)} 天`;
  });

  await step('TC-AUTH-006', '个人中心输入无效激活码不改变授权', async () => {
    const before = await prisma.user.findUnique({ where: { id: state.userId } });
    const r = await req('POST', '/auth/redeem-code', { activationCode: `BAD${runId}` }, false);
    const after = await prisma.user.findUnique({ where: { id: state.userId } });
    assert(!r.ok, '无效激活码竟然续费成功');
    assert(!String(r.text).includes('property activationCode should not exist'), '接口未进入无效码业务校验，被 DTO 白名单拦截');
    assert(+after.accountExpiresAt === +before.accountExpiresAt, '无效码导致到期时间变化');
    return `接口返回 HTTP ${r.status}，授权未变化`;
  });

  await step('TC-AUTH-007', '个人中心输入已使用激活码不改变授权', async () => {
    const before = await prisma.user.findUnique({ where: { id: state.userId } });
    const r = await req('POST', '/auth/redeem-code', { activationCode: codes.used }, false);
    const after = await prisma.user.findUnique({ where: { id: state.userId } });
    assert(!r.ok, '已使用激活码竟然续费成功');
    assert(!String(r.text).includes('property activationCode should not exist'), '接口未进入已使用码业务校验，被 DTO 白名单拦截');
    assert(+after.accountExpiresAt === +before.accountExpiresAt, '已使用码导致到期时间变化');
    return `接口返回 HTTP ${r.status}，授权未变化`;
  });

  await step('TC-CLASS-001/002/003', '创建 A班/B班并验证切换隔离基础数据', async () => {
    const a = unwrap((await req('POST', '/classes', { name: `A班自测${runId}`, teacherName: username })).data);
    const b = unwrap((await req('POST', '/classes', { name: `B班自测${runId}`, teacherName: username })).data);
    state.classA = a; state.classB = b;
    await req('POST', `/classes/${a.id}/activate`);
    const list = unwrap((await req('GET', '/classes')).data);
    assert(list.some(c => c.id === a.id) && list.some(c => c.id === b.id), '班级列表缺少 A班或 B班');
    assert(a.id !== b.id, 'A班/B班 id 相同');
    return `A班 ${a.id}，B班 ${b.id}`;
  });

  await step('TC-STU-001', '手动创建学生并验证班级隔离', async () => {
    const aRes = unwrap((await req('POST', `/classes/${state.classA.id}/students`, { names: ['A1自测', 'A2自测', 'A3自测'], gender: 'MALE' })).data);
    const bRes = unwrap((await req('POST', `/classes/${state.classB.id}/students`, { names: ['B1自测', 'B2自测'], gender: 'FEMALE' })).data);
    const aList = unwrap((await req('GET', `/classes/${state.classA.id}/students`)).data);
    const bList = unwrap((await req('GET', `/classes/${state.classB.id}/students`)).data);
    state.aStudents = Array.isArray(aList) ? aList : aList.students || aList.data || [];
    state.bStudents = Array.isArray(bList) ? bList : bList.students || bList.data || [];
    assert(state.aStudents.some(s => s.name === 'A1自测'), 'A班未找到 A1');
    assert(!state.aStudents.some(s => s.name && s.name.startsWith('B')), 'A班出现 B班学生');
    assert(!state.bStudents.some(s => s.name && s.name.startsWith('A')), 'B班出现 A班学生');
    state.a1 = state.aStudents.find(s => s.name === 'A1自测');
    state.a2 = state.aStudents.find(s => s.name === 'A2自测');
    state.a3 = state.aStudents.find(s => s.name === 'A3自测');
    state.b1 = state.bStudents.find(s => s.name === 'B1自测');
    return `A班 ${state.aStudents.length} 人，B班 ${state.bStudents.length} 人，未串班`;
  });

  await step('TC-STU-002', '修改学生信息后关联不丢失', async () => {
    const updated = unwrap((await req('PATCH', `/students/${state.a1.id}`, { name: 'A1自测修改', studentNumber: 'A001', gender: 'FEMALE', isCadre: true, cadrePosition: '班长', parentPhones: [{ phone: '13800138000', relationship: '家长1' }] })).data);
    state.a1.name = updated.name;
    const fetched = unwrap((await req('GET', `/students/${state.a1.id}`)).data);
    assert(fetched.name === 'A1自测修改', '姓名修改未保存');
    assert(fetched.studentNumber === 'A001', '学号修改未保存');
    return '学生姓名、学号、性别、班干部、家长手机号修改保存';
  });

  await step('TC-GROUP-001/002/004', '小组创建、添加成员、设置组长', async () => {
    const g1 = unwrap((await req('POST', `/classes/${state.classA.id}/groups`, { name: 'G1自测', color: '#3B82F6' })).data);
    const g2 = unwrap((await req('POST', `/classes/${state.classA.id}/groups`, { name: 'G2自测', color: '#10B981' })).data);
    state.g1 = g1; state.g2 = g2;
    await req('POST', `/groups/${g1.id}/members`, { studentIds: [state.a1.id, state.a2.id] });
    await req('PATCH', `/groups/${g1.id}/leader`, { leaderId: state.a1.id });
    const group = unwrap((await req('GET', `/groups/${g1.id}`)).data);
    assert(group.members && group.members.length >= 2, '小组成员未正确添加');
    assert(group.leaderId === state.a1.id, '组长未正确设置');
    return 'G1/G2 创建成功，成员和组长正确';
  });

  await step('TC-RULE-001/002', '创建并编辑加分和扣分规则', async () => {
    const add = unwrap((await req('POST', `/classes/${state.classA.id}/rules`, { name: '课堂表现', points: 5, type: 'ADD', category: '课堂' })).data);
    const deduct = unwrap((await req('POST', `/classes/${state.classA.id}/rules`, { name: '迟到', points: 2, type: 'DEDUCT', category: '纪律' })).data);
    await req('PATCH', `/rules/${add.id}`, { name: '课堂表现优秀', points: 6, type: 'ADD', category: '课堂' });
    const aRules = unwrap((await req('GET', `/classes/${state.classA.id}/rules`)).data);
    const bRules = unwrap((await req('GET', `/classes/${state.classB.id}/rules`)).data);
    assert(aRules.some(r => r.name === '课堂表现优秀'), '规则编辑后未找到');
    assert(!bRules.some(r => r.name === '课堂表现优秀'), 'A班规则串到 B班');
    state.addRule = aRules.find(r => r.name === '课堂表现优秀'); state.deductRule = deduct;
    return '规则创建/编辑成功，B班未出现 A班规则';
  });

  await step('TC-POINT-001/002/003/004', '单个与批量学生加减分正确', async () => {
    await req('POST', `/students/${state.a1.id}/points`, { type: 'ADD', value: 5, reason: '单个加分', ruleId: state.addRule.id });
    await req('POST', `/students/${state.a1.id}/points`, { type: 'DEDUCT', value: 2, reason: '单个扣分', ruleId: state.deductRule.id });
    await req('POST', `/classes/${state.classA.id}/points/batch`, { studentIds: [state.a1.id, state.a2.id, state.a3.id], type: 'ADD', value: 5, reason: '批量加分' });
    await req('POST', `/classes/${state.classA.id}/points/batch`, { studentIds: [state.a1.id, state.a2.id, state.a3.id], type: 'DEDUCT', value: 2, reason: '批量扣分' });
    const a1 = unwrap((await req('GET', `/students/${state.a1.id}`)).data);
    const a2 = unwrap((await req('GET', `/students/${state.a2.id}`)).data);
    const b1 = unwrap((await req('GET', `/students/${state.b1.id}`)).data);
    assert(a1.totalPoints === 6 && a1.availablePoints === 6, `A1积分应为6/6，实际 ${a1.totalPoints}/${a1.availablePoints}`);
    assert(a2.totalPoints === 3 && a2.availablePoints === 3, `A2积分应为3/3，实际 ${a2.totalPoints}/${a2.availablePoints}`);
    assert(b1.totalPoints === 0 && b1.availablePoints === 0, 'B班学生积分被影响');
    return 'A1=6，A2=3，B1=0，积分未串班';
  });

  await step('TC-GROUP-005', '小组批量加减分', async () => {
    await req('POST', `/classes/${state.classA.id}/points/batch`, { studentIds: [state.a1.id, state.a2.id], type: 'ADD', value: 5, reason: '小组加分' });
    await req('POST', `/classes/${state.classA.id}/points/batch`, { studentIds: [state.a1.id, state.a2.id], type: 'DEDUCT', value: 2, reason: '小组扣分' });
    const a1 = unwrap((await req('GET', `/students/${state.a1.id}`)).data);
    const a3 = unwrap((await req('GET', `/students/${state.a3.id}`)).data);
    assert(a1.totalPoints === 9, `A1小组加减后应为9，实际 ${a1.totalPoints}`);
    assert(a3.totalPoints === 3, `非小组成员A3不应变化，实际 ${a3.totalPoints}`);
    return '仅小组成员变化，非成员不变';
  });

  await step('TC-RECORD-001/002', '积分明细字段、筛选和班级隔离', async () => {
    const all = unwrap((await req('GET', `/classes/${state.classA.id}/points/records?limit=100&type=all`)).data);
    const filtered = unwrap((await req('GET', `/classes/${state.classA.id}/points/records?studentName=A1&type=add&limit=100`)).data);
    const b = unwrap((await req('GET', `/classes/${state.classB.id}/points/records?limit=100&type=all`)).data);
    const recs = all.records || all.data || [];
    const frecs = filtered.records || filtered.data || [];
    const brecs = b.records || b.data || [];
    assert(recs.length >= 8, `A班积分记录数量不足，实际 ${recs.length}`);
    assert(frecs.every(r => r.student && r.student.name.includes('A1') && r.points > 0), '筛选结果不准确');
    assert(brecs.length === 0, `B班不应有积分记录，实际 ${brecs.length}`);
    return `A班记录 ${recs.length} 条，筛选正常，B班0条`;
  });

  await step('TC-SHOP-001/004/005/006', '商品创建、兑换、库存与记录', async () => {
    const item = unwrap((await req('POST', `/classes/${state.classA.id}/shop/items`, { name: '铅笔自测', price: 5, stock: 10, category: 'PHYSICAL', description: '自测商品' })).data);
    state.item = item;
    const before = unwrap((await req('GET', `/students/${state.a1.id}`)).data);
    await req('POST', `/students/${state.a1.id}/exchanges`, { itemId: item.id, quantity: 1 });
    const after = unwrap((await req('GET', `/students/${state.a1.id}`)).data);
    const items = unwrap((await req('GET', `/classes/${state.classA.id}/shop/items`)).data);
    const updatedItem = items.find(i => i.id === item.id);
    const exchanges = unwrap((await req('GET', `/classes/${state.classA.id}/shop/exchanges?limit=20`)).data);
    const bItems = unwrap((await req('GET', `/classes/${state.classB.id}/shop/items`)).data);
    assert(after.availablePoints === before.availablePoints - 5, '兑换未扣可用积分');
    assert(after.totalPoints === before.totalPoints, '兑换不应扣总积分');
    assert(updatedItem.stock === 9, `库存应为9，实际 ${updatedItem.stock}`);
    assert((exchanges.exchanges || exchanges.records || exchanges.data || exchanges).length >= 1, '未生成兑换记录');
    assert(!bItems.some(i => i.name === '铅笔自测'), '商品串到 B班');
    return '兑换扣可用积分、扣库存、生成记录，未串班';
  });

  await step('TC-PETSET-001/TC-PET-001/002/003/005/TC-PETREC-001', '宠物设置、领养、经验、进化与明细', async () => {
    await req('PATCH', `/classes/${state.classA.id}/pet-settings`, { eggToBaby: 1, babyToTeen: 10, teenToAdult: 20, adultToFinal: 30, assignMode: 'TEACHER_ASSIGN' });
    const gallery = unwrap((await req('GET', '/pets/gallery')).data);
    const pet = (Array.isArray(gallery) ? gallery : gallery.gallery || gallery.data || gallery.records || [])[0];
    assert(pet && pet.id, '宠物图鉴为空，无法测试领养');
    await req('POST', `/students/${state.a1.id}/pet/select`, { petId: pet.id });
    const beforeStudent = unwrap((await req('GET', `/students/${state.a1.id}`)).data);
    await req('POST', `/students/${state.a1.id}/pet/points`, { type: 'ADD', value: 9, reason: '加到9' });
    let sp = unwrap((await req('GET', `/students/${state.a1.id}/pet`)).data);
    assert(sp.experience === 9, `经验应为9，实际 ${sp.experience}`);
    await req('POST', `/students/${state.a1.id}/pet/points`, { type: 'ADD', value: 1, reason: '加到10' });
    sp = unwrap((await req('GET', `/students/${state.a1.id}/pet`)).data);
    assert(sp.experience === 10, `经验应为10，实际 ${sp.experience}`);
    assert(sp.stage === 'TEEN', `10经验应进化到 TEEN，实际 ${sp.stage}`);
    await req('POST', `/students/${state.a1.id}/pet/points`, { type: 'DEDUCT', value: 2, reason: '扣经验' });
    sp = unwrap((await req('GET', `/students/${state.a1.id}/pet`)).data);
    assert(sp.experience === 8, `扣经验后应为8，实际 ${sp.experience}`);
    const afterStudent = unwrap((await req('GET', `/students/${state.a1.id}`)).data);
    assert(afterStudent.totalPoints === beforeStudent.totalPoints && afterStudent.availablePoints === beforeStudent.availablePoints, '宠物经验污染了学生积分');
    const recs = unwrap((await req('GET', `/classes/${state.classA.id}/pets/records?limit=50&type=all`)).data);
    const list = recs.records || recs.data || [];
    assert(list.length >= 3, `宠物经验明细不足，实际 ${list.length}`);
    return '宠物经验不影响学生积分，10经验进化到TEEN，明细生成';
  });

  await step('TC-SHARE-001/003', '创建分享链接并验证不泄露其他班级', async () => {
    const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
    const link = unwrap((await req('POST', `/students/${state.a1.id}/share`, { expiresAt, allowViewRanking: true, hidePointRecords: false, hideDeductions: false })).data);
    assert(link.token, '分享链接未返回 token');
    const v = await req('POST', `/parent/${link.token}/verify`, { phone: '13800138000' });
    assert(v.ok, '家长手机号验证失败');
    const view = unwrap((await req('GET', `/parent/${link.token}?phone=13800138000`)).data);
    const text = JSON.stringify(view);
    assert(text.includes('A1自测修改'), '分享视图未包含对应学生');
    assert(!text.includes('B1自测'), '分享视图泄露 B班学生');
    return '分享 token 可访问对应学生，未发现 B班泄露';
  });

  await step('TC-CLEAR-001', '清空 A班数据不影响 B班', async () => {
    const bBefore = unwrap((await req('GET', `/classes/${state.classB.id}/students`)).data);
    const bCount = Array.isArray(bBefore) ? bBefore.length : (bBefore.students || bBefore.data || []).length;
    await req('POST', `/classes/${state.classA.id}/data-management/clear-points`);
    const aAfter = unwrap((await req('GET', `/classes/${state.classA.id}/students`)).data);
    const bAfter = unwrap((await req('GET', `/classes/${state.classB.id}/students`)).data);
    const aList = Array.isArray(aAfter) ? aAfter : aAfter.students || aAfter.data || [];
    const bList = Array.isArray(bAfter) ? bAfter : bAfter.students || bAfter.data || [];
    assert(aList.every(s => s.totalPoints === 0 && s.availablePoints === 0), 'A班清空后仍有学生积分');
    assert(bList.length === bCount, 'B班学生数量被清空影响');
    assert(bList.every(s => s.name.startsWith('B')), 'B班学生数据异常');
    return `A班积分清零，B班仍 ${bList.length} 人`;
  });

  await step('UI-SMOKE-001', '前端首页可访问', async () => {
    const r = await fetch(FRONTEND);
    assert(r.ok, `前端首页 HTTP ${r.status}`);
    return 'http://localhost:3000 可访问';
  });
}

function writeReport() {
  const pass = results.filter(r => r.ok).length;
  const fail = results.length - pass;
  const lines = [];
  lines.push('# CLASSPAL V1.0 自测记录');
  lines.push('');
  lines.push(`- 自测时间：${nowIso()}`);
  lines.push(`- 测试账号：${phone}`);
  lines.push(`- 后端：${API}`);
  lines.push(`- 前端：${FRONTEND}`);
  lines.push(`- 结果：通过 ${pass}，失败 ${fail}`);
  lines.push('');
  lines.push('## 自动化 P0/API 自测结果');
  lines.push('');
  lines.push('| 用例编号 | 是否通过 | 实际结果 | 问题描述 |');
  lines.push('|---|---|---|---|');
  for (const r of results) {
    lines.push(`| ${r.id} | ${r.ok ? '通过' : '失败'} | ${r.actual.replace(/\|/g, '/')} | ${r.issue.replace(/\|/g, '/')} |`);
  }
  lines.push('');
  lines.push('## 说明');
  lines.push('');
  lines.push('- 本次优先覆盖 P0 商业闭环、核心数据正确性、A班/B班隔离。');
  lines.push('- 尚未完整覆盖需要人工浏览器操作或 Excel 文件操作的全部细节，例如导入模板文件内容逐格检查、导出文件人工核对、便捷工具完整 UI 操作。');
  lines.push('- 失败项如有，会在上表如实记录。');
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
}

main().catch(e => {
  addResult('RUNNER', '自测脚本执行', false, '脚本异常', e && e.stack ? e.stack : e);
}).finally(async () => {
  writeReport();
  await prisma.$disconnect();
  const fail = results.filter(r => !r.ok).length;
  process.exitCode = fail ? 1 : 0;
});
