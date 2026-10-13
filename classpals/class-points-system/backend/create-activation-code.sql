INSERT INTO "ActivationCode" (id, code, type, status, "validDays", remark, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'TEST-2024-001',
  'HALF_YEAR',
  'UNUSED',
  180,
  '测试激活码',
  NOW(),
  NOW()
)
ON CONFLICT (code) DO NOTHING;
