import * as http from 'http';

type JsonValue = Record<string, any>;

function request(options: http.RequestOptions, body?: string): Promise<{ statusCode: number; body: JsonValue | null; raw: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let parsed: JsonValue | null = null;
        try {
          parsed = data ? JSON.parse(data) : null;
        } catch {
          parsed = null;
        }
        resolve({ statusCode: res.statusCode || 0, body: parsed, raw: data });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function requestJson(path: string, method: string, token?: string, payload?: Record<string, any>) {
  const body = payload ? JSON.stringify(payload) : undefined;
  return request({
    hostname: 'localhost',
    port: 3000,
    path,
    method,
    headers: {
      ...(body
        ? {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }, body);
}

async function main() {
  const loginRes = await requestJson('/api/auth/login', 'POST', undefined, {
    phone: '13800138000',
    password: '123456',
  });

  const token = loginRes.body?.data?.token;
  console.log('✅ Login:', token ? 'OK' : 'FAILED');
  if (!token) {
    console.log(loginRes.raw);
    return;
  }

  const classListRes = await requestJson('/api/classes', 'GET', token);
  const classId = classListRes.body?.data?.[0]?.id;
  console.log('✅ Class:', classId || 'FAILED');
  if (!classId) return;

  const studentsRes = await requestJson(`/api/classes/${classId}/students`, 'GET', token);
  const student = studentsRes.body?.data?.students?.[0];
  console.log('✅ Student:', student?.name || 'FAILED');
  if (!student?.id) return;

  const beforeStudentRes = await requestJson(`/api/classes/${classId}/students`, 'GET', token);
  const beforeStudent = beforeStudentRes.body?.data?.students?.find((item: any) => item.id === student.id);

  const allPetsRes = await requestJson('/api/pets/gallery', 'GET');
  const petId = allPetsRes.body?.data?.gallery?.[0]?.id;
  console.log('✅ Gallery pet:', petId || 'FAILED');
  if (!petId) return;

  const selectRes = await requestJson(`/api/students/${student.id}/pet/select`, 'POST', token, { petId });
  console.log('\n=== Select Pet ===');
  console.log(JSON.stringify(selectRes.body, null, 2));

  const petAfterSelect = await requestJson(`/api/students/${student.id}/pet`, 'GET', token);
  console.log('\n=== Pet After Select ===');
  console.log(JSON.stringify(petAfterSelect.body, null, 2));

  const addExpRes = await requestJson(`/api/students/${student.id}/pet/points`, 'POST', token, {
    type: 'ADD',
    value: 35,
    reason: '测试宠物加经验',
  });
  console.log('\n=== Add Pet Experience ===');
  console.log(JSON.stringify(addExpRes.body, null, 2));

  const deductExpRes = await requestJson(`/api/students/${student.id}/pet/points`, 'POST', token, {
    type: 'DEDUCT',
    value: 30,
    reason: '测试宠物扣经验',
  });
  console.log('\n=== Deduct Pet Experience ===');
  console.log(JSON.stringify(deductExpRes.body, null, 2));

  const petHistoryRes = await requestJson(`/api/students/${student.id}/pet/points/history`, 'GET', token);
  console.log('\n=== Pet Point History ===');
  console.log(JSON.stringify(petHistoryRes.body, null, 2));

  const afterStudentRes = await requestJson(`/api/classes/${classId}/students`, 'GET', token);
  const afterStudent = afterStudentRes.body?.data?.students?.find((item: any) => item.id === student.id);
  console.log('\n=== Student Points Comparison ===');
  console.log({
    beforeTotalPoints: beforeStudent?.totalPoints,
    afterTotalPoints: afterStudent?.totalPoints,
    beforeAvailablePoints: beforeStudent?.availablePoints,
    afterAvailablePoints: afterStudent?.availablePoints,
  });

  const resetRes = await requestJson(`/api/students/${student.id}/pet`, 'DELETE', token);
  console.log('\n=== Reset Pet ===');
  console.log(JSON.stringify(resetRes.body, null, 2));

  const petAfterReset = await requestJson(`/api/students/${student.id}/pet`, 'GET', token);
  console.log('\n=== Pet After Reset ===');
  console.log(JSON.stringify(petAfterReset.body, null, 2));

  console.log('\n✅ Pet API verification completed');
}

main().catch((error) => {
  console.error('❌ Test failed');
  console.error(error);
});
