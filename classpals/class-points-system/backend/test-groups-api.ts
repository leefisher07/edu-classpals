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

  // 3. Create groups
  const g1Body = JSON.stringify({ name: '第一组', color: '#EF4444' });
  const g1Res = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/groups`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(g1Body), 'Authorization': `Bearer ${token}` },
  }, g1Body);
  console.log('\n=== Create Group 1 ===');
  console.log(JSON.stringify(g1Res, null, 2));

  const g2Body = JSON.stringify({ name: '第二组', color: '#3B82F6' });
  const g2Res = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/groups`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(g2Body), 'Authorization': `Bearer ${token}` },
  }, g2Body);

  const group1Id = g1Res.data?.id;
  const group2Id = g2Res.data?.id;

  // 4. Get all groups
  const groupsRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/groups`, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  console.log('\n=== Get All Groups ===');
  console.log(JSON.stringify(groupsRes, null, 2));

  // 5. Add members to group
  const studentsRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/students`, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const allStudentIds = studentsRes.data?.students?.map((s: any) => s.id) || [];
  const half = Math.ceil(allStudentIds.length / 2);
  const group1Members = allStudentIds.slice(0, half);
  const group2Members = allStudentIds.slice(half);

  if (group1Members.length > 0) {
    const addBody = JSON.stringify({ studentIds: group1Members });
    const addRes = await request({
      hostname: 'localhost', port: 3000, path: `/api/groups/${group1Id}/members`, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(addBody), 'Authorization': `Bearer ${token}` },
    }, addBody);
    console.log('\n=== Add Members to Group 1 ===');
    console.log(JSON.stringify(addRes, null, 2));
  }

  if (group2Members.length > 0) {
    const addBody = JSON.stringify({ studentIds: group2Members });
    await request({
      hostname: 'localhost', port: 3000, path: `/api/groups/${group2Id}/members`, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(addBody), 'Authorization': `Bearer ${token}` },
    }, addBody);
  }

  // 6. Get group detail
  const groupDetailRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/groups/${group1Id}`, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  console.log('\n=== Group 1 Detail ===');
  console.log(JSON.stringify(groupDetailRes, null, 2));

  // 7. Update group
  const updateBody = JSON.stringify({ name: '红队' });
  const updateRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/groups/${group1Id}`, method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(updateBody), 'Authorization': `Bearer ${token}` },
  }, updateBody);
  console.log('\n=== Update Group ===');
  console.log(JSON.stringify(updateRes, null, 2));

  // 8. Remove a member
  if (group1Members.length > 0) {
    const removeBody = JSON.stringify({ studentIds: [group1Members[0]] });
    const removeRes = await request({
      hostname: 'localhost', port: 3000, path: `/api/groups/${group1Id}/members`, method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(removeBody), 'Authorization': `Bearer ${token}` },
    }, removeBody);
    console.log('\n=== Remove Member from Group ===');
    console.log(JSON.stringify(removeRes, null, 2));
  }

  // 9. Random group (by group count)
  const randomBody = JSON.stringify({ groupCount: 2 });
  const randomRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/groups/random`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(randomBody), 'Authorization': `Bearer ${token}` },
  }, randomBody);
  console.log('\n=== Random Group ===');
  console.log(JSON.stringify(randomRes, null, 2));

  // 10. Get groups after random
  const groupsAfterRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/groups`, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  console.log('\n=== Groups After Random ===');
  console.log(JSON.stringify(groupsAfterRes, null, 2));

  console.log('\n✅ All groups tests completed!');
}

main().catch(console.error);
