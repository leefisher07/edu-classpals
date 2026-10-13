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

  // 2. Get class list
  const classListRes = await request({
    hostname: 'localhost', port: 3000, path: '/api/classes', method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const classId = classListRes.data?.[0]?.id;
  console.log('✅ Class ID:', classId);
  if (!classId) return;

  // 3. Create students (batch)
  const createBody = JSON.stringify({
    names: ['张三', '李四', '王五'],
    gender: 'MALE',
    parentPhones: [{ phone: '13800138001', relationship: '爸爸' }]
  });
  const createRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/students`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(createBody), 'Authorization': `Bearer ${token}` },
  }, createBody);
  console.log('\n=== Create Students ===');
  console.log(JSON.stringify(createRes, null, 2));

  const studentId = createRes.data?.created?.[0]?.id;
  if (!studentId) return;

  // 4. Get student list
  const listRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/students`, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  console.log('\n=== Student List ===');
  console.log(JSON.stringify(listRes, null, 2));

  // 5. Get student detail
  const detailRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/students/${studentId}`, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  console.log('\n=== Student Detail ===');
  console.log(JSON.stringify(detailRes, null, 2));

  // 6. Update student
  const updateBody = JSON.stringify({
    name: '张三丰',
    studentNumber: '001',
    isCadre: true,
    cadrePosition: '班长',
  });
  const updateRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/students/${studentId}`, method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(updateBody), 'Authorization': `Bearer ${token}` },
  }, updateBody);
  console.log('\n=== Update Student ===');
  console.log(JSON.stringify(updateRes, null, 2));

  // 7. Search students
  const searchRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/students?search=张`, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  console.log('\n=== Search Students (张) ===');
  console.log(JSON.stringify(searchRes, null, 2));

  // 8. Sort by name
  const sortRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/students?sortBy=name&sortDesc=false`, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  console.log('\n=== Sort by Name (ASC) ===');
  console.log(JSON.stringify(sortRes, null, 2));

  console.log('\n✅ All tests completed!');
}

main().catch(console.error);
