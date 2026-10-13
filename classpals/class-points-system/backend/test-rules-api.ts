import * as http from 'http';

function request(options: http.RequestOptions, body?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  // 1. Login
  const loginBody = JSON.stringify({ phone: '13800138000', password: '123456' });
  const loginRes = await request({
    hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) },
  }, loginBody);

  const token = loginRes.data?.token;
  console.log('✅ Login:', token ? 'OK' : 'FAILED');
  if (!token) return;

  // 2. Get class
  const classListRes = await request({
    hostname: 'localhost', port: 3000, path: '/api/classes', method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const classId = classListRes.data?.[0]?.id;
  console.log('✅ Class ID:', classId);
  if (!classId) return;

  // 3. Create rules
  const rule1Body = JSON.stringify({ name: '回答问题', points: 2, type: 'ADD', category: '课堂表现', icon: '🙋' });
  const rule1Res = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/rules`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(rule1Body), 'Authorization': `Bearer ${token}` },
  }, rule1Body);
  console.log('\n=== Create Rule 1 (ADD) ===');
  console.log(JSON.stringify(rule1Res, null, 2));

  const rule2Body = JSON.stringify({ name: '迟到', points: 1, type: 'DEDUCT', category: '纪律', icon: '⏰' });
  const rule2Res = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/rules`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(rule2Body), 'Authorization': `Bearer ${token}` },
  }, rule2Body);
  console.log('\n=== Create Rule 2 (DEDUCT) ===');
  console.log(JSON.stringify(rule2Res, null, 2));

  const ruleId = rule1Res.data?.id;
  const rule2Id = rule2Res.data?.id;

  // 4. Get all rules
  const rulesRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/rules`, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  console.log('\n=== Get All Rules ===');
  console.log(JSON.stringify(rulesRes, null, 2));

  // 5. Update rule
  const updateBody = JSON.stringify({ name: '积极回答问题', points: 3 });
  const updateRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/rules/${ruleId}`, method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(updateBody), 'Authorization': `Bearer ${token}` },
  }, updateBody);
  console.log('\n=== Update Rule ===');
  console.log(JSON.stringify(updateRes, null, 2));

  // 6. Toggle enabled (disable)
  const toggleRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/rules/${rule2Id}/toggle`, method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Length': '0' },
  });
  console.log('\n=== Toggle Rule (disable) ===');
  console.log(JSON.stringify(toggleRes, null, 2));

  // 7. Update sort order
  const sortBody = JSON.stringify({ ruleIds: [rule2Id, ruleId] });
  const sortRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/rules/sort`, method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(sortBody), 'Authorization': `Bearer ${token}` },
  }, sortBody);
  console.log('\n=== Update Sort Order ===');
  console.log(JSON.stringify(sortRes, null, 2));

  // 8. Add points using ruleId
  const studentsRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/students`, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const studentId = studentsRes.data?.students?.[0]?.id;

  if (studentId && ruleId) {
    const pointsBody = JSON.stringify({ type: 'ADD', value: 3, reason: '积极回答问题', ruleId });
    const pointsRes = await request({
      hostname: 'localhost', port: 3000, path: `/api/students/${studentId}/points`, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(pointsBody), 'Authorization': `Bearer ${token}` },
    }, pointsBody);
    console.log('\n=== Add Points with Rule ===');
    console.log(JSON.stringify(pointsRes, null, 2));
  }

  // 9. Delete rule
  const deleteRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/rules/${rule2Id}`, method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  console.log('\n=== Delete Rule ===');
  console.log(JSON.stringify(deleteRes, null, 2));

  console.log('\n✅ All rules tests completed!');
}

main().catch(console.error);
