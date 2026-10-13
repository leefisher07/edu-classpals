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

function assertNonZeroRanking(label: string, ranking: any[]) {
  const nonZero = ranking.filter((item) => (item.points ?? item.periodPoints ?? item.totalPoints ?? 0) !== 0);
  console.log(`${label} 非零人数:`, nonZero.length);
  if (nonZero.length === 0) {
    console.error(`❌ ${label} 返回全 0，异常`);
  } else {
    console.log(`✅ ${label} 正常`);
  }
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
  if (!classId) return;

  const totalRankingRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/dashboard/ranking/students?period=total`, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const weekRankingRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/dashboard/ranking/students?period=week`, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const monthRankingRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/dashboard/ranking/students?period=month`, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const customRankingRes = await request({
    hostname: 'localhost', port: 3000, path: `/api/classes/${classId}/dashboard/ranking/students?period=custom&startDate=2026-03-23&endDate=2026-03-31`, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  console.log('\n=== Student Ranking (Total) ===');
  console.log(JSON.stringify(totalRankingRes, null, 2));
  console.log('\n=== Student Ranking (Week) ===');
  console.log(JSON.stringify(weekRankingRes, null, 2));
  console.log('\n=== Student Ranking (Month) ===');
  console.log(JSON.stringify(monthRankingRes, null, 2));
  console.log('\n=== Student Ranking (Custom) ===');
  console.log(JSON.stringify(customRankingRes, null, 2));

  assertNonZeroRanking('周榜', weekRankingRes.data || []);
  assertNonZeroRanking('月榜', monthRankingRes.data || []);
  assertNonZeroRanking('自定义榜', customRankingRes.data || []);

  console.log('\n✅ Dashboard ranking tests completed!');
}

main().catch(console.error);
