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
  if (!token) { console.error(loginRes); return; }

  // 2. Create class
  const createBody = JSON.stringify({ name: '初三四班', teacherName: '王老师' });
  const createRes = await request({
    hostname: 'localhost', port: 3000, path: '/api/classes', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(createBody), 'Authorization': `Bearer ${token}` },
  }, createBody);

  console.log('Create class:', JSON.stringify(createRes, null, 2));
  const classId = createRes.data?.id;
  if (!classId) return;

  // 3. Get class list
  const listRes = await request({
    hostname: 'localhost', port: 3000, path: '/api/classes', method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  console.log('Class list:', JSON.stringify(listRes, null, 2));

  // 4. Activate class
  const activateRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/activate`, method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Length': '0' },
  });
  console.log('Activate:', JSON.stringify(activateRes, null, 2));
}

main().catch(console.error);
