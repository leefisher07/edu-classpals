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

  // 2. Get class and student
  const classListRes = await request({
    hostname: 'localhost', port: 3000, path: '/api/classes', method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const classId = classListRes.data?.[0]?.id;
  console.log('✅ Class ID:', classId);
  if (!classId) return;

  const studentsRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/students`, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const student = studentsRes.data?.students?.[0];
  console.log('✅ Student:', student?.name, '| Available Points:', student?.availablePoints);
  if (!student) return;

  // 3. Create shop items
  const item1Body = JSON.stringify({ name: '铅笔', description: '2B铅笔一支', price: 5, stock: 100, category: 'PHYSICAL' });
  const item1Res = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/shop/items`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(item1Body), 'Authorization': `Bearer ${token}` },
  }, item1Body);
  console.log('\n=== Create Item 1 (Physical) ===');
  console.log(JSON.stringify(item1Res, null, 2));

  const item2Body = JSON.stringify({ name: '免作业券', description: '免一次作业', price: 20, category: 'PRIVILEGE' });
  const item2Res = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/shop/items`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(item2Body), 'Authorization': `Bearer ${token}` },
  }, item2Body);

  const item1Id = item1Res.data?.id;
  const item2Id = item2Res.data?.id;

  // 4. Get all items
  const itemsRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/shop/items`, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  console.log('\n=== Get All Items ===');
  console.log(JSON.stringify(itemsRes, null, 2));

  // 5. Update item
  const updateBody = JSON.stringify({ price: 8, description: '2B铅笔一支（优质）' });
  const updateRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/shop/items/${item1Id}`, method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(updateBody), 'Authorization': `Bearer ${token}` },
  }, updateBody);
  console.log('\n=== Update Item ===');
  console.log(JSON.stringify(updateRes, null, 2));

  // 6. Exchange item
  const exchangeBody = JSON.stringify({ itemId: item1Id, quantity: 1 });
  const exchangeRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/students/${student.id}/exchanges`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(exchangeBody), 'Authorization': `Bearer ${token}` },
  }, exchangeBody);
  console.log('\n=== Exchange Item ===');
  console.log(JSON.stringify(exchangeRes, null, 2));

  const exchangeId = exchangeRes.data?.exchange?.id;

  // 7. Get class exchanges
  const classExchangesRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/shop/exchanges`, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  console.log('\n=== Class Exchanges ===');
  console.log(JSON.stringify(classExchangesRes, null, 2));

  // 8. Get student exchanges
  const studentExchangesRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/students/${student.id}/exchanges`, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  console.log('\n=== Student Exchanges ===');
  console.log(JSON.stringify(studentExchangesRes, null, 2));

  // 9. Mark as delivered
  if (exchangeId) {
    const deliverBody = JSON.stringify({ status: 'DELIVERED' });
    const deliverRes = await request({
      hostname: 'localhost', port: 3000, path: `/api/shop/exchanges/${exchangeId}/status`, method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(deliverBody), 'Authorization': `Bearer ${token}` },
    }, deliverBody);
    console.log('\n=== Mark as Delivered ===');
    console.log(JSON.stringify(deliverRes, null, 2));
  }

  // 10. Test insufficient points (try to buy expensive item)
  const expensiveBody = JSON.stringify({ itemId: item2Id, quantity: 10 });
  const expensiveRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/students/${student.id}/exchanges`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(expensiveBody), 'Authorization': `Bearer ${token}` },
  }, expensiveBody);
  console.log('\n=== Insufficient Points Test ===');
  console.log(JSON.stringify(expensiveRes, null, 2));

  console.log('\n✅ All shop tests completed!');
}

main().catch(console.error);
