#!/bin/bash

# 测试班级管理 API

echo "=== 1. 登录获取 Token ==="
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","password":"123456"}')

echo "$LOGIN_RESPONSE" | jq .

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ 登录失败，无法获取 Token"
  exit 1
fi

echo ""
echo "✅ Token: ${TOKEN:0:50}..."
echo ""

echo "=== 2. 创建班级 ==="
CREATE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/classes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"初三四班","teacherName":"王老师"}')

echo "$CREATE_RESPONSE" | jq .
CLASS_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.id')
echo ""

echo "=== 3. 获取班级列表 ==="
curl -s -X GET http://localhost:3000/api/classes \
  -H "Authorization: Bearer $TOKEN" | jq .
echo ""

if [ "$CLASS_ID" != "null" ] && [ -n "$CLASS_ID" ]; then
  echo "=== 4. 获取班级详情 ==="
  curl -s -X GET "http://localhost:3000/api/classes/$CLASS_ID" \
    -H "Authorization: Bearer $TOKEN" | jq .
  echo ""

  echo "=== 5. 更新班级 ==="
  curl -s -X PATCH "http://localhost:3000/api/classes/$CLASS_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"name":"初三五班","teacherName":"李老师"}' | jq .
  echo ""

  echo "=== 6. 切换当前班级 ==="
  curl -s -X POST "http://localhost:3000/api/classes/$CLASS_ID/activate" \
    -H "Authorization: Bearer $TOKEN" | jq .
  echo ""

  echo "=== 7. 再次获取班级列表（验证 isActive） ==="
  curl -s -X GET http://localhost:3000/api/classes \
    -H "Authorization: Bearer $TOKEN" | jq .
  echo ""
fi

echo "✅ 测试完成"
