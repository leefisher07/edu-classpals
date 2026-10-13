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

  const studentsRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/students`, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const student = studentsRes.data?.students?.[0];
  console.log('✅ Student:', student?.name);

  // 1. Create share link
  const createBody = JSON.stringify({
    allowViewRanking: true,
    hidePointRecords: false,
  });
  const createRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/students/${student.id}/share`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(createBody), 'Authorization': `Bearer ${token}` },
  }, createBody);
  console.log('\n=== Create Share Link ===');
  console.log(JSON.stringify(createRes, null, 2));
  const shareToken = createRes.data?.token;
  const linkId = createRes.data?.id;

  // 2. Get student share links
  const linksRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/students/${student.id}/share`, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  console.log('\n=== Get Share Links ===');
  console.log(JSON.stringify(linksRes, null, 2));

  // 3. Parent verify (public endpoint)
  const verifyBody = JSON.stringify({ phone: '13900000001' });
  const verifyRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/parent/${shareToken}/verify`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(verifyBody) },
  }, verifyBody);
  console.log('\n=== Parent Verify ===');
  console.log(JSON.stringify(verifyRes, null, 2));

  // 4. Parent view data (public endpoint)
  const parentViewRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/parent/${shareToken}?phone=13900000001`, method: 'GET',
    headers: {},
  });
  console.log('\n=== Parent View Data ===');
  console.log(JSON.stringify(parentViewRes, null, 2));

  // 5. Update share link
  const updateBody = JSON.stringify({ hidePointRecords: true });
  const updateRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/share/${linkId}`, method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(updateBody), 'Authorization': `Bearer ${token}` },
  }, updateBody);
  console.log('\n=== Update Share Link (hide records) ===');
  console.log(JSON.stringify(updateRes, null, 2));

  // 6. Parent view after update (should not see records)
  const parentViewRes2 = await request({
    hostname: 'localhost', port: 3000, path: `/api/parent/${shareToken}?phone=13900000001`, method: 'GET',
    headers: {},
  });
  console.log('\n=== Parent View After Update ===');
  console.log('Point Records:', parentViewRes2.data?.pointRecords);

  // 7. Disable link
  const disableBody = JSON.stringify({ isActive: false });
  await request({
    hostname: 'localhost', port: 3000, path: `/api/share/${linkId}`, method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(disableBody), 'Authorization': `Bearer ${token}` },
  }, disableBody);
  console.log('\n✅ Link disabled');

  // 8. Try to access disabled link (should fail)
  const disabledRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/parent/${shareToken}?phone=13900000001`, method: 'GET',
    headers: {},
  });
  console.log('\n=== Access Disabled Link ===');
  console.log(JSON.stringify(disabledRes, null, 2));

  console.log('\n✅ All share tests completed!');
}

main().catch(console.error);
