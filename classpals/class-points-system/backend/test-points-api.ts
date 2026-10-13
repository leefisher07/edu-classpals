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

  // 2. Get students
  const classListRes = await request({
    hostname: 'localhost', port: 3000, path: '/api/classes', method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const classId = classListRes.data?.[0]?.id;

  const studentsRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/students`, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const studentId = studentsRes.data?.students?.[0]?.id;
  console.log('✅ Student ID:', studentId);
  if (!studentId) return;

  // 3. Add points
  const addBody = JSON.stringify({ type: 'ADD', value: 5, reason: '回答问题' });
  const addRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/students/${studentId}/points`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(addBody), 'Authorization': `Bearer ${token}` },
  }, addBody);
  console.log('\n=== Add Points ===');
  console.log(JSON.stringify(addRes, null, 2));

  const recordId = addRes.data?.record?.id;

  // 4. Quick add 1 point
  const quickRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/students/${studentId}/points/quick`, method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Length': '0' },
  });
  console.log('\n=== Quick Add 1 Point ===');
  console.log(JSON.stringify(quickRes, null, 2));

  // 5. Deduct points
  const deductBody = JSON.stringify({ type: 'DEDUCT', value: 2, reason: '迟到' });
  const deductRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/students/${studentId}/points`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(deductBody), 'Authorization': `Bearer ${token}` },
  }, deductBody);
  console.log('\n=== Deduct Points ===');
  console.log(JSON.stringify(deductRes, null, 2));

  // 6. Batch add points
  const allStudentIds = studentsRes.data.students.map((s: any) => s.id);
  const batchBody = JSON.stringify({
    studentIds: allStudentIds,
    type: 'ADD',
    value: 3,
    reason: '课堂表现好',
  });
  const batchRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/points/batch`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(batchBody), 'Authorization': `Bearer ${token}` },
  }, batchBody);
  console.log('\n=== Batch Add Points ===');
  console.log(JSON.stringify(batchRes, null, 2));

  // 7. Get history
  const historyRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/students/${studentId}/points/history?page=1&limit=10`, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  console.log('\n=== Points History ===');
  console.log(JSON.stringify(historyRes, null, 2));

  // 8. Revoke record (within 5 minutes)
  if (recordId) {
    const revokeRes = await request({
      hostname: 'localhost', port: 3000, path: `/api/points/records/${recordId}`, method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    console.log('\n=== Revoke Record ===');
    console.log(JSON.stringify(revokeRes, null, 2));
  }

  // 9. Get history again (verify revoke)
  const historyRes2 = await request({
    hostname: 'localhost', port: 3000, path: `/api/students/${studentId}/points/history?page=1&limit=10`, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  console.log('\n=== Points History After Revoke ===');
  console.log(JSON.stringify(historyRes2, null, 2));

  console.log('\n✅ All tests completed!');
}

main().catch(console.error);
