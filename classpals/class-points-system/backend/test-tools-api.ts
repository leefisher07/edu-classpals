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
  const loginBody = JSON.stringify({ phone: '13800138000', password: '123456' });
  const loginRes = await request({
    hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) },
  }, loginBody);
  const token = loginRes.data?.token;
  console.log('✅ Login:', token ? 'OK' : 'FAILED');
  if (!token) return;

  const classListRes = await request({
    hostname: 'localhost', port: 3000, path: '/api/classes', method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const classId = classListRes.data?.[0]?.id;
  console.log('✅ Class ID:', classId);

  // 1. Random pick 1 student
  const pick1Body = JSON.stringify({ count: 1 });
  const pick1Res = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/tools/random-pick`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(pick1Body), 'Authorization': `Bearer ${token}` },
  }, pick1Body);
  console.log('\n=== Random Pick 1 ===');
  console.log(JSON.stringify(pick1Res, null, 2));

  // 2. Random pick 2 students
  const pick2Body = JSON.stringify({ count: 2 });
  const pick2Res = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/tools/random-pick`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(pick2Body), 'Authorization': `Bearer ${token}` },
  }, pick2Body);
  console.log('\n=== Random Pick 2 ===');
  console.log(JSON.stringify(pick2Res, null, 2));

  // 3. Random pick with exclude
  const pickedId = pick1Res.data?.picked?.[0]?.id;
  if (pickedId) {
    const excludeBody = JSON.stringify({ count: 1, excludeIds: [pickedId] });
    const excludeRes = await request({
      hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/tools/random-pick`, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(excludeBody), 'Authorization': `Bearer ${token}` },
    }, excludeBody);
    console.log('\n=== Random Pick with Exclude ===');
    console.log(JSON.stringify(excludeRes, null, 2));
  }

  // 4. Pick history
  const historyRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/tools/pick-history`, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  console.log('\n=== Pick History ===');
  console.log(JSON.stringify(historyRes, null, 2));

  console.log('\n✅ All tools tests completed!');
}

main().catch(console.error);
