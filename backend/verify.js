// End-to-end API verification script
const BASE = 'http://localhost:5000/api';
let token = '';

async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text();
  return { status: res.status, data };
}

async function run() {
  let passed = 0, failed = 0;

  function check(label, condition, detail = '') {
    if (condition) { console.log(`  ✅ ${label}`); passed++; }
    else { console.error(`  ❌ ${label}${detail ? ': ' + detail : ''}`); failed++; }
  }

  console.log('\n🔷 Auth Tests');
  let r = await req('POST', '/auth/login', { username: 'admin', password: 'admin123' });
  check('Login with correct credentials returns 200', r.status === 200);
  check('Login response has token', !!r.data.token);
  token = r.data.token;

  r = await req('POST', '/auth/login', { username: 'admin', password: 'wrong' });
  check('Login with wrong password returns 401', r.status === 401);

  console.log('\n🔷 Employee Tests');
  const empPayload = { employee_id: 'TEST001', name: 'Alice Smith', email: 'alice@test.com', mobile: '9876543210', department: 'Engineering', designation: 'Engineer', status: 'Active' };
  r = await req('POST', '/employees', empPayload);
  check('Create employee returns 201', r.status === 201, JSON.stringify(r.data));
  const empId = r.data?.id;

  r = await req('GET', '/employees?search=Alice');
  check('Search employee by name works', r.status === 200 && r.data.employees?.length >= 1);

  r = await req('GET', `/employees/${empId}`);
  check('Get employee by ID works', r.status === 200 && r.data.employee_id === 'TEST001');

  r = await req('PUT', `/employees/${empId}`, { name: 'Alice Johnson', email: 'alice@test.com', mobile: '9876543210', department: 'Engineering', designation: 'Senior Engineer', status: 'Active' });
  check('Update employee returns 200', r.status === 200);

  r = await req('GET', `/employees/${empId}`);
  check('Designation updated correctly', r.data.designation === 'Senior Engineer');

  console.log('\n🔷 Attendance Tests');
  r = await req('POST', '/attendance/mark', { employee_id: 'TEST001', type: 'checkin' });
  check('Mark check-in returns 201', r.status === 201, JSON.stringify(r.data));
  const attStatus = r.data?.record?.status;
  check('Status is Present or Late', attStatus === 'Present' || attStatus === 'Late', attStatus);

  r = await req('POST', '/attendance/mark', { employee_id: 'TEST001', type: 'checkout' });
  check('Mark check-out returns 200', r.status === 200);

  r = await req('GET', '/attendance?search=Alice');
  check('Get attendance records works', r.status === 200 && r.data.records?.length >= 1);

  r = await req('GET', '/attendance/summary');
  check('Attendance summary works', r.status === 200 && typeof r.data.present === 'number');

  r = await req('GET', '/attendance/employee/TEST001');
  check('Employee history works', r.status === 200 && Array.isArray(r.data));

  console.log('\n🔷 Dashboard Tests');
  r = await req('GET', '/dashboard/stats');
  check('Dashboard stats works', r.status === 200 && typeof r.data.stats?.totalEmployees === 'number');
  check('Department distribution returned', Array.isArray(r.data.departmentDistribution));

  console.log('\n🔷 Cleanup — Delete test employee');
  r = await req('DELETE', `/employees/${empId}`);
  check('Delete employee returns 200', r.status === 200);

  r = await req('GET', `/employees/${empId}`);
  check('Employee no longer exists after deletion', r.status === 404);

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) console.log('🎉 All tests passed! API is working correctly.\n');
  else console.error(`⚠️  ${failed} test(s) failed. Check backend logs.\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error('Fatal error in test script:', err); process.exit(1); });
