const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');

const API = 'http://localhost:3001/api';
const FRONTEND = 'http://localhost:3000';
const reportPath = 'C:/Users/Administrator/Desktop/CLASSPAL V1.0自测记录.md';
const artifactDir = 'C:/Users/Administrator/Desktop/classpal-selftest-artifacts';
fs.mkdirSync(artifactDir, { recursive: true });

const runId = Date.now().toString().slice(-8);
const phone = `136${runId}`;
const password = 'Test123456';
const codes = { initial: `FILE${runId}`, renew: `FIRN${runId}` };
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
async function reqBuffer(method, url, body, extraHeaders = {}) {
  const headers = { ...extraHeaders };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${url}`, { method, headers, body });
  const arrayBuffer = await res.arrayBuffer();
  if (!res.ok) throw new Error(`${method} ${url} HTTP ${res.status}: ${Buffer.from(arrayBuffer).toString('utf8')}`);
  return { res, buffer: Buffer.from(arrayBuffer) };
}
async function uploadExcel(url, filePath, mode = 'append', expectOk = true) {
  const form = new FormData();
  form.append('mode', mode);
  form.append('file', new Blob([fs.readFileSync(filePath)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), path.basename(filePath));
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${API}${url}`, { method: 'POST', headers, body: form });
  const text = await res.text();
  let raw;
  try { raw = text ? JSON.parse(text) : null; } catch { raw = text; }
  const data = raw && typeof raw === 'object' && raw.data !== undefined ? raw.data : raw;
  if (expectOk && !res.ok) throw new Error(`UPLOAD ${url} HTTP ${res.status}: ${text}`);
  return { ok: res.ok, status: res.status, data, text };
}
async function makeImportFile(fileName, data) {
  const wb = new ExcelJS.Workbook();

  const groupSheet = wb.addWorksheet('小组');
  groupSheet.columns = [
    { header: '小组名称（必填）', key: 'name' },
    { header: '颜色（可选）', key: 'color' },
    { header: '组长姓名（可选）', key: 'leaderName' },
  ];
  (data.groups || []).forEach((row) => groupSheet.addRow(row));

  const studentSheet = wb.addWorksheet('学生');
  studentSheet.columns = [
    { header: '姓名（必填）', key: 'name' },
    { header: '学号（可选）', key: 'studentNumber' },
    { header: '性别（男/女，可留空）', key: 'gender' },
    { header: '所属小组（可留空）', key: 'groupName' },
    { header: '总积分（不会填请填0）', key: 'totalPoints' },
    { header: '可用积分（可兑换积分）', key: 'availablePoints' },
    { header: '是否班干部（是/否）', key: 'isCadre' },
    { header: '班干部岗位（可留空）', key: 'cadrePosition' },
    { header: '自定义岗位（可留空）', key: 'customPosition' },
    { header: '家长手机号（可选，最多2个）', key: 'parentPhones' },
  ];
  (data.students || []).forEach((row) => studentSheet.addRow(row));

  const ruleSheet = wb.addWorksheet('积分规则');
  ruleSheet.columns = [
    { header: '规则名称（必填）', key: 'name' },
    { header: '分值（必填）', key: 'points' },
    { header: '类型（加分/扣分）', key: 'type' },
    { header: '分类（可选）', key: 'category' },
    { header: '图标（可选）', key: 'icon' },
    { header: '启用（是/否）', key: 'isEnabled' },
  ];
  (data.rules || []).forEach((row) => ruleSheet.addRow(row));

  const shopSheet = wb.addWorksheet('商品');
  shopSheet.columns = [
    { header: '商品名称（必填）', key: 'name' },
    { header: '所需积分（必填）', key: 'price' },
    { header: '库存（留空=不限）', key: 'stock' },
    { header: '分类（实物/特权/虚拟）', key: 'category' },
    { header: '描述（可选）', key: 'description' },
    { header: '上架（是/否）', key: 'isAvailable' },
  ];
  (data.shopItems || []).forEach((row) => shopSheet.addRow(row));

  const p = path.join(artifactDir, fileName);
  await wb.xlsx.writeFile(p);
  return p;
}
async function seedUser() {
  for (const data of [
    { code: codes.initial, type: 'TIME_LIMITED', days: 90, planName: '3个月版', note: '文件自测首次激活' },
    { code: codes.renew, type: 'TIME_LIMITED', days: 90, planName: '3个月续费版', note: '文件自测续费' },
  ]) await prisma.activationCode.upsert({ where: { code: data.code }, update: data, create: data });
  const r = await req('POST', '/auth/register', { phone, password, activationCode: codes.initial });
  token = r.data.token || r.data.accessToken;
  state.userId = r.data.user.id;
}

async function main() {
  await seedUser();
  const a = (await req('POST', '/classes', { name: `文件自测A班${runId}`, teacherName: '自测老师' })).data;
  const b = (await req('POST', '/classes', { name: `文件自测B班${runId}`, teacherName: '自测老师' })).data;
  state.classA = a; state.classB = b;
  await req('POST', `/classes/${a.id}/activate`);
  state.group = (await req('POST', `/classes/${a.id}/groups`, { name: '第一组', color: '#3B82F6' })).data;
  state.rule = (await req('POST', `/classes/${a.id}/rules`, { name: '导入后加分规则', points: 5, type: 'ADD', category: '自测' })).data;

  await step('FILE-001', '下载导入模板并检查字段说明', async () => {
    const { buffer } = await reqBuffer('GET', `/classes/${a.id}/data-management/import-template`);
    const p = path.join(artifactDir, `template-${runId}.xlsx`);
    fs.writeFileSync(p, buffer);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(p);
    const sheetNames = wb.worksheets.map(s => s.name);
    for (const n of ['填写说明', '小组', '学生', '积分规则', '商品']) assert(sheetNames.includes(n), `模板缺少 sheet：${n}`);
    const instructions = wb.getWorksheet('填写说明');
    const text = JSON.stringify(instructions.getSheetValues());
    assert(text.includes('初始化班级数据') && text.includes('导入模板用于初始化'), '填写说明未更新为初始化导入语义');
    const student = wb.getWorksheet('学生');
    const rules = wb.getWorksheet('积分规则');
    const shop = wb.getWorksheet('商品');
    assert(student.getCell('A1').note, '学生姓名字段缺少批注说明');
    assert(student.getCell('C2').dataValidation, '学生性别列缺少下拉校验');
    assert(rules.getCell('C2').dataValidation, '规则类型列缺少下拉校验');
    assert(shop.getCell('D2').dataValidation, '商品分类列缺少下拉校验');
    return `模板 ${path.basename(p)} 包含 ${sheetNames.join('、')}，初始化说明和下拉校验存在`;
  });

  await step('FILE-002', '四类初始化数据可预览并追加导入', async () => {
    const importData = {
      groups: [
        { name: `追加第一组${runId}`, color: '#3B82F6', leaderName: `追加学生甲${runId}` },
        { name: `追加第二组${runId}`, color: '#10B981', leaderName: '' },
      ],
      students: [
        { name: `追加学生甲${runId}`, studentNumber: 'APP001', gender: '男', groupName: `追加第一组${runId}`, totalPoints: 20, availablePoints: 10, isCadre: '是', cadrePosition: '班长', customPosition: '', parentPhones: '妈妈：13800138000' },
        { name: `追加学生乙${runId}`, studentNumber: 'APP002', gender: '女', groupName: `追加第二组${runId}`, totalPoints: 30, availablePoints: 20, isCadre: '否', cadrePosition: '', customPosition: '', parentPhones: '' },
      ],
      rules: [
        { name: `追加规则${runId}`, points: 2, type: '加分', category: '作业', icon: '', isEnabled: '是' },
      ],
      shopItems: [
        { name: `追加商品${runId}`, price: 50, stock: '', category: '特权奖励', description: '追加商品描述', isAvailable: '是' },
      ],
    };
    const p = await makeImportFile(`append-full-${runId}.xlsx`, importData);
    const preview = await uploadExcel(`/classes/${a.id}/data-management/import/preview`, p);
    assert(preview.data.summary.groups === 2, '预览小组数量不正确');
    assert(preview.data.summary.students === 2, '预览学生数量不正确');
    assert(preview.data.summary.rules === 1, '预览规则数量不正确');
    assert(preview.data.summary.shopItems === 1, '预览商品数量不正确');
    assert(preview.data.toCreateGroups.length === 2, '预览未识别将创建的小组');
    const imported = await uploadExcel(`/classes/${a.id}/data-management/import`, p);
    assert(imported.data.importedGroups === 2, '导入小组数量不正确');
    assert(imported.data.importedStudents === 2, '导入学生数量不正确');
    assert(imported.data.importedRules === 1, '导入规则数量不正确');
    assert(imported.data.importedShopItems === 1, '导入商品数量不正确');
    const groupsData = (await req('GET', `/classes/${a.id}/groups`)).data;
    const groups = Array.isArray(groupsData) ? groupsData : (groupsData.groups || groupsData.data || []);
    assert(groups.some(x => x.name === `追加第一组${runId}`), '追加导入后小组未创建');
    const studentsData = (await req('GET', `/classes/${a.id}/students`)).data;
    const students = Array.isArray(studentsData) ? studentsData : (studentsData.students || studentsData.data || []);
    assert(students.some(x => x.name === `追加学生甲${runId}`), '追加导入后学生未创建');
    const rulesData = (await req('GET', `/classes/${a.id}/rules`)).data;
    const ruleList = Array.isArray(rulesData) ? rulesData : (rulesData.data || rulesData.rules || []);
    assert(ruleList.some(x => x.name === `追加规则${runId}`), '追加导入后规则未创建');
    const shopData = (await req('GET', `/classes/${a.id}/shop/items`)).data;
    const items = Array.isArray(shopData) ? shopData : (shopData.data || shopData.items || []);
    assert(items.some(x => x.name === `追加商品${runId}`), '追加导入后商品未创建');
    return '四类初始化数据预览与追加导入成功';
  });

  await step('FILE-003', '追加导入存在同名学生/规则/商品时会跳过已有数据并只导入新增数据', async () => {
    const mixedData = {
      groups: [
        { name: `追加第一组${runId}`, color: '#3B82F6', leaderName: `追加学生甲${runId}` },
        { name: `新增第三组${runId}`, color: '#F59E0B', leaderName: `新增学生丙${runId}` },
      ],
      students: [
        { name: `追加学生甲${runId}`, studentNumber: 'C001', gender: '男', groupName: `追加第一组${runId}`, totalPoints: 20, availablePoints: 10, isCadre: '是', cadrePosition: '班长', customPosition: '', parentPhones: '' },
        { name: `新增学生丙${runId}`, studentNumber: 'C003', gender: '女', groupName: `新增第三组${runId}`, totalPoints: 12, availablePoints: 12, isCadre: '否', cadrePosition: '', customPosition: '', parentPhones: '' },
      ],
      rules: [
        { name: `追加规则${runId}`, points: 2, type: '加分', category: '作业', icon: '', isEnabled: '是' },
        { name: `新增规则${runId}`, points: 4, type: '扣分', category: '纪律', icon: '', isEnabled: '是' },
      ],
      shopItems: [
        { name: `追加商品${runId}`, price: 50, stock: '', category: '特权奖励', description: '追加商品描述', isAvailable: '是' },
        { name: `新增商品${runId}`, price: 15, stock: 5, category: '实物奖励', description: '', isAvailable: '是' },
      ],
    };
    const p = await makeImportFile(`append-mixed-${runId}.xlsx`, mixedData);
    const preview = await uploadExcel(`/classes/${a.id}/data-management/import/preview`, p);
    assert(preview.ok, '混合文件预览应该成功返回');
    assert(preview.data.canSubmit === true, '混合文件预览应允许正式提交');
    assert(preview.data.appendPlan.skippedStudents.includes(`追加学生甲${runId}`), '预览未标记已有学生会被跳过');
    assert(preview.data.appendPlan.studentsToCreate.includes(`新增学生丙${runId}`), '预览未标记新增学生会被创建');
    assert(preview.data.appendPlan.skippedRules.some(x => x.includes(`追加规则${runId}`)), '预览未标记已有规则会被跳过');
    assert(preview.data.appendPlan.rulesToCreate.some(x => x.includes(`新增规则${runId}`)), '预览未标记新增规则会被创建');
    assert(preview.data.appendPlan.skippedShopItems.includes(`追加商品${runId}`), '预览未标记已有商品会被跳过');
    assert(preview.data.appendPlan.shopItemsToCreate.includes(`新增商品${runId}`), '预览未标记新增商品会被创建');
    const imported = await uploadExcel(`/classes/${a.id}/data-management/import`, p);
    assert(imported.data.importedStudents === 1, `追加导入新增学生数不正确：${JSON.stringify(imported.data)}`);
    assert(imported.data.importedRules === 1, '追加导入新增规则数不正确');
    assert(imported.data.importedShopItems === 1, '追加导入新增商品数不正确');
    assert(imported.data.importedGroups === 1, '追加导入新增小组数不正确');
    assert(imported.data.skippedStudents.includes(`追加学生甲${runId}`), '正式导入结果未返回跳过的学生');
    const studentsData = (await req('GET', `/classes/${a.id}/students`)).data;
    const students = Array.isArray(studentsData) ? studentsData : (studentsData.students || studentsData.data || []);
    assert(students.filter(x => x.name === `追加学生甲${runId}`).length === 1, '已有学生被重复创建');
    assert(students.some(x => x.name === `新增学生丙${runId}`), '新增学生未创建');
    const rulesData = (await req('GET', `/classes/${a.id}/rules`)).data;
    const ruleList = Array.isArray(rulesData) ? rulesData : (rulesData.data || rulesData.rules || []);
    assert(ruleList.filter(x => x.name === `追加规则${runId}`).length === 1, '已有规则被重复创建');
    assert(ruleList.some(x => x.name === `新增规则${runId}`), '新增规则未创建');
    const shopData = (await req('GET', `/classes/${a.id}/shop/items`)).data;
    const items = Array.isArray(shopData) ? shopData : (shopData.data || shopData.items || []);
    assert(items.filter(x => x.name === `追加商品${runId}`).length === 1, '已有商品被重复创建');
    assert(items.some(x => x.name === `新增商品${runId}`), '新增商品未创建');
    return '追加导入会跳过系统已有数据，仅创建文件中的新增数据';
  });

  await step('FILE-004', '覆盖导入可整体替换四类初始化数据', async () => {
    const replaceData = {
      groups: [{ name: `覆盖组${runId}`, color: '#8B5CF6', leaderName: `覆盖学生${runId}` }],
      students: [{ name: `覆盖学生${runId}`, studentNumber: 'REP001', gender: '女', groupName: `覆盖组${runId}`, totalPoints: 88, availablePoints: 66, isCadre: '是', cadrePosition: '学习委员', customPosition: '', parentPhones: '爸爸：13900139000' }],
      rules: [{ name: `覆盖规则${runId}`, points: 5, type: '扣分', category: '纪律', icon: '', isEnabled: '是' }],
      shopItems: [{ name: `覆盖商品${runId}`, price: 99, stock: 5, category: '虚拟奖励', description: '覆盖商品', isAvailable: '是' }],
    };
    const p = await makeImportFile(`replace-full-${runId}.xlsx`, replaceData);
    const preview = await uploadExcel(`/classes/${a.id}/data-management/import/preview`, p, 'replace');
    assert(preview.data.summary.groups === 1 && preview.data.summary.students === 1, '覆盖预览摘要不正确');
    const imported = await uploadExcel(`/classes/${a.id}/data-management/import`, p, 'replace');
    assert(imported.data.importedGroups === 1, '覆盖导入小组数量不正确');
    assert(imported.data.importedStudents === 1, '覆盖导入学生数量不正确');
    assert(imported.data.importedRules === 1, '覆盖导入规则数量不正确');
    assert(imported.data.importedShopItems === 1, '覆盖导入商品数量不正确');
    const studentsData = (await req('GET', `/classes/${a.id}/students`)).data;
    const students = Array.isArray(studentsData) ? studentsData : (studentsData.students || studentsData.data || []);
    assert(students.length === 1 && students[0].name === `覆盖学生${runId}`, '覆盖导入后学生未被整体替换');
    const groupsData = (await req('GET', `/classes/${a.id}/groups`)).data;
    const groups = Array.isArray(groupsData) ? groupsData : (groupsData.groups || groupsData.data || []);
    assert(groups.length === 1 && groups[0].name === `覆盖组${runId}`, '覆盖导入后小组未被整体替换');
    return '覆盖导入可整体替换小组/学生/规则/商品';
  });

  await step('FILE-005', '异常导入校验且不产生脏数据', async () => {
    const beforeData = (await req('GET', `/classes/${a.id}/students`)).data;
    const before = (Array.isArray(beforeData) ? beforeData : (beforeData.students || beforeData.data || [])).length;
    const cases = [
      ['missinggroup', { groups: [], students: [{ name: '缺组学生', groupName: '不存在组' }], rules: [{ name: '规则A', points: 1, type: '加分', isEnabled: '是' }], shopItems: [{ name: '商品A', price: 1, category: '实物奖励', isAvailable: '是' }] }, '缺少“小组”工作表'],
      ['badrule', { groups: [{ name: '规则异常组' }], students: [{ name: '规则异常学生', groupName: '规则异常组' }], rules: [{ name: '错误规则', points: 1, type: '未知', isEnabled: '是' }], shopItems: [{ name: '商品A', price: 1, category: '实物奖励', isAvailable: '是' }] }, '类型非法'],
      ['badshop', { groups: [{ name: '商品异常组' }], students: [{ name: '商品异常学生', groupName: '商品异常组' }], rules: [{ name: '规则B', points: 1, type: '加分', isEnabled: '是' }], shopItems: [{ name: '错误商品', price: 1, category: '未知分类', isAvailable: '是' }] }, '分类非法'],
    ];
    for (const [name, payload, expectText] of cases) {
      const p = await makeImportFile(`${name}-${runId}.xlsx`, payload);
      if (name === 'missinggroup') {
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.readFile(p);
        wb.removeWorksheet('小组');
        await wb.xlsx.writeFile(p);
      }
      const r = await uploadExcel(`/classes/${a.id}/data-management/import/preview`, p, 'append', false);
      assert(!r.ok, `${name} 异常文件预览竟然成功`);
      assert(r.text.includes(expectText), `${name} 错误提示不符合预期：${r.text}`);
    }
    const implicitGroupData = {
      groups: [{ name: `显式组${runId}`, color: '#3B82F6', leaderName: '' }],
      students: [
        { name: `隐式组学生${runId}`, studentNumber: 'AUTO001', gender: '男', groupName: `自动补组${runId}`, totalPoints: 5, availablePoints: 5, isCadre: '否', cadrePosition: '', customPosition: '', parentPhones: '' },
      ],
      rules: [{ name: `隐式组规则${runId}`, points: 3, type: '加分', category: '课堂', icon: '', isEnabled: '是' }],
      shopItems: [{ name: `隐式组商品${runId}`, price: 8, stock: '', category: '特权奖励', description: '', isAvailable: '是' }],
    };
    const implicitPath = await makeImportFile(`implicit-group-${runId}.xlsx`, implicitGroupData);
    const preview = await uploadExcel(`/classes/${a.id}/data-management/import/preview`, implicitPath);
    assert(preview.data.toCreateGroups.includes(`自动补组${runId}`), '预览未识别学生引用的隐式新小组');
    const imported = await uploadExcel(`/classes/${a.id}/data-management/import`, implicitPath);
    assert(imported.data.createdGroups.includes(`自动补组${runId}`), '正式导入未返回隐式创建的小组');
    const groupsData = (await req('GET', `/classes/${a.id}/groups`)).data;
    const groups = Array.isArray(groupsData) ? groupsData : (groupsData.groups || groupsData.data || []);
    assert(groups.some(x => x.name === `自动补组${runId}`), '学生引用的新小组未被自动创建');
    const afterData = (await req('GET', `/classes/${a.id}/students`)).data;
    const after = (Array.isArray(afterData) ? afterData : (afterData.students || afterData.data || [])).length;
    assert(after === before + 1, `隐式建组导入后学生数异常：${before} -> ${after}`);
    return '缺少 sheet / 规则类型非法 / 商品分类非法均被拦截，学生引用的新小组会自动创建';
  });

  await step('FILE-006', '可再次导入数据导出文件结构正确且能继续追加导入', async () => {
    const { buffer } = await reqBuffer('GET', `/classes/${a.id}/data-management/export-importable`);
    const exportPath = path.join(artifactDir, `export-importable-${runId}.xlsx`);
    fs.writeFileSync(exportPath, buffer);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(exportPath);
    const sheetNames = wb.worksheets.map(s => s.name);
    assert(sheetNames.length === 5, `可再次导入文件 sheet 数量不正确：${sheetNames.join('、')}`);
    for (const n of ['填写说明', '小组', '学生', '积分规则', '商品']) {
      assert(sheetNames.includes(n), `可再次导入文件缺少 sheet：${n}`);
    }
    assert(wb.getWorksheet('学生').getRow(1).values.includes('姓名（必填）'), '学生 sheet 表头未对齐导入模板');
    assert(wb.getWorksheet('积分规则').getRow(1).values.includes('类型（加分/扣分）'), '规则 sheet 表头未对齐导入模板');
    assert(wb.getWorksheet('商品').getRow(1).values.includes('分类（实物/特权/虚拟）'), '商品 sheet 表头未对齐导入模板');
    assert(wb.getWorksheet('学生').getCell('C2').dataValidation, '学生 sheet 缺少性别下拉');
    assert(wb.getWorksheet('积分规则').getCell('C2').dataValidation, '规则 sheet 缺少类型下拉');
    assert(wb.getWorksheet('商品').getCell('D2').dataValidation, '商品 sheet 缺少分类下拉');

    wb.getWorksheet('小组').addRow([`回导新增组${runId}`, '#06B6D4', `回导新增学生${runId}`]);
    wb.getWorksheet('学生').addRow([`回导新增学生${runId}`, 'REI001', '男', `回导新增组${runId}`, 9, 9, '否', '', '', '']);
    wb.getWorksheet('积分规则').addRow([`回导新增规则${runId}`, 3, '加分', '回导', '', '是']);
    wb.getWorksheet('商品').addRow([`回导新增商品${runId}`, 12, '', '特权奖励', '回导新增', '是']);
    await wb.xlsx.writeFile(exportPath);

    const preview = await uploadExcel(`/classes/${a.id}/data-management/import/preview`, exportPath);
    if (!preview.data.appendPlan?.studentsToCreate?.includes(`回导新增学生${runId}`)) {
      const debugPath = path.join(artifactDir, `export-importable-debug-${runId}.json`);
      fs.writeFileSync(debugPath, JSON.stringify(preview.data, null, 2), 'utf8');
    }
    const appendPlan = preview.data.appendPlan || {};
    const studentsToCreate = appendPlan.studentsToCreate || [];
    const rulesToCreate = appendPlan.rulesToCreate || [];
    const shopItemsToCreate = appendPlan.shopItemsToCreate || [];
    assert(studentsToCreate.includes(`回导新增学生${runId}`), `回导预览未识别新增学生：${JSON.stringify(appendPlan)}`);
    assert(rulesToCreate.some(x => x.includes(`回导新增规则${runId}`)), `回导预览未识别新增规则：${JSON.stringify(appendPlan)}`);
    assert(shopItemsToCreate.includes(`回导新增商品${runId}`), `回导预览未识别新增商品：${JSON.stringify(appendPlan)}`);
    const imported = await uploadExcel(`/classes/${a.id}/data-management/import`, exportPath);
    assert(imported.data.importedGroups >= 1, '回导新增小组未导入');
    assert(imported.data.importedStudents >= 1, '回导新增学生未导入');
    assert(imported.data.importedRules >= 1, '回导新增规则未导入');
    assert(imported.data.importedShopItems >= 1, '回导新增商品未导入');
    state.importableExportPath = exportPath;
    return `可再次导入文件 ${path.basename(exportPath)} 可继续补充并成功回导`;
  });

  await step('FILE-007', '导出班级数据并检查内容隔离', async () => {
    const studentsData = (await req('GET', `/classes/${a.id}/students`)).data;
    const students = Array.isArray(studentsData) ? studentsData : (studentsData.students || studentsData.data || []);
    const s = students.find(x => x.name === `覆盖学生${runId}`);
    assert(s, '未找到覆盖导入后的目标学生');
    const rulesData = (await req('GET', `/classes/${a.id}/rules`)).data;
    const ruleList = Array.isArray(rulesData) ? rulesData : (rulesData.data || rulesData.rules || []);
    const exportRule = ruleList.find(x => x.name === `覆盖规则${runId}`);
    assert(exportRule, '未找到覆盖导入后的目标规则');
    await req('POST', `/students/${s.id}/points`, { type: 'ADD', value: 5, reason: '导出前加分', ruleId: exportRule.id });
    const item = (await req('POST', `/classes/${a.id}/shop/items`, { name: `导出商品${runId}`, price: 10, stock: 3, category: 'PHYSICAL' })).data;
    await req('POST', `/students/${s.id}/exchanges`, { itemId: item.id, quantity: 1 });
    await req('POST', `/classes/${b.id}/students`, { names: [`B班不应导出${runId}`], gender: 'MALE' });
    const { buffer } = await reqBuffer('GET', `/classes/${a.id}/data-management/export`);
    const p = path.join(artifactDir, `export-${runId}.xlsx`);
    fs.writeFileSync(p, buffer);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(p);
    for (const n of ['班级信息', '学生', '积分记录', '商品兑换', '宠物', '积分规则', '小组']) assert(wb.getWorksheet(n), `导出缺少 sheet：${n}`);
    const allText = JSON.stringify(wb.worksheets.map(ws => ws.getSheetValues()));
    assert(allText.includes(`覆盖学生${runId}`), '导出未包含A班学生');
    assert(allText.includes(`导出商品${runId}`), '导出未包含兑换商品');
    assert(!allText.includes(`B班不应导出${runId}`), '导出泄露了B班学生');
    state.exportPath = p;
    return `导出文件 ${path.basename(p)} 内容完整，未包含B班数据`;
  });

  await step('FILE-008', '导出文件再导入按当前能力明确处理', async () => {
    const target = (await req('POST', '/classes', { name: `导出再导入班${runId}`, teacherName: '自测老师' })).data;
    const r = await uploadExcel(`/classes/${target.id}/data-management/import/preview`, state.exportPath, 'append', false);
    assert(!r.ok, '导出文件再导入预览不应静默成功');
    assert(r.text.includes('缺少“商品”工作表') || (r.text.includes('表头不匹配') && r.text.includes('不支持直接导入系统导出的备份文件')), `错误提示不明确：${r.text}`);
    const studentsData = (await req('GET', `/classes/${target.id}/students`)).data;
    const students = Array.isArray(studentsData) ? studentsData : (studentsData.students || studentsData.data || []);
    assert(students.length === 0, '失败导入后目标班级产生了学生');
    return '当前导出文件含“学生”以外格式，导入失败提示明确且未写入脏数据';
  });
}

function appendReport() {
  const pass = results.filter(r => r.ok).length;
  const fail = results.length - pass;
  const lines = [];
  lines.push('');
  lines.push('## 文件导入导出与模板自测补充');
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

main().catch(e => addResult('FILE-RUNNER', '文件自测脚本执行', false, '脚本异常', e && e.stack ? e.stack : e))
  .finally(async () => { appendReport(); await prisma.$disconnect(); process.exitCode = results.some(r => !r.ok) ? 1 : 0; });
