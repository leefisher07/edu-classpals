# API 文档 v1.1.0

## 班级管理 API

### 1. 创建班级
```
POST /api/classes
Authorization: Bearer {token}

Request Body:
{
  "name": "初三四班",
  "teacher": "王老师"  // 可选，默认当前用户
}

Response: 200 OK
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "name": "初三四班",
    "teacher": "王老师",
    "teacherId": "uuid",
    "studentCount": 0,
    "totalPoints": 0,
    "isActive": false,
    "createdAt": "2026-03-19T14:00:00.000Z"
  }
}
```

### 2. 获取我的班级列表
```
GET /api/classes
Authorization: Bearer {token}

Response: 200 OK
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "uuid",
      "name": "初三四班",
      "teacher": "王老师",
      "studentCount": 42,
      "totalPoints": 1580,
      "isActive": true,
      "createdAt": "2026-03-01T00:00:00.000Z"
    }
  ]
}
```

### 3. 获取班级详情
```
GET /api/classes/:id
Authorization: Bearer {token}

Response: 200 OK
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "name": "初三四班",
    "teacher": "王老师",
    "studentCount": 42,
    "totalPoints": 1580,
    "createdAt": "2026-03-01T00:00:00.000Z",
    "students": [...]
  }
}
```

### 4. 更新班级
```
PATCH /api/classes/:id
Authorization: Bearer {token}

Request Body:
{
  "name": "初三五班",
  "teacher": "李老师"
}

Response: 200 OK
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "name": "初三五班",
    "teacher": "李老师",
    "updatedAt": "2026-03-19T14:00:00.000Z"
  }
}
```

### 5. 删除班级（归档）
```
DELETE /api/classes/:id
Authorization: Bearer {token}

Response: 200 OK
{
  "code": 200,
  "message": "班级已归档",
  "data": null
}
```

### 6. 切换当前班级
```
POST /api/classes/:id/activate
Authorization: Bearer {token}

Response: 200 OK
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "isActive": true
  }
}
```

---

## 学生管理 API

### 1. 添加学生（支持批量）
```
POST /api/classes/:classId/students
Authorization: Bearer {token}

Request Body:
{
  "names": ["张三", "李四"],
  "gender": "male",
  "groupId": "uuid",      // 可选
  "studentNo": "001"      // 可选
}

Response: 200 OK
{
  "code": 200,
  "message": "success",
  "data": {
    "created": [
      {
        "id": "uuid",
        "name": "张三",
        "studentNo": "001",
        "gender": "male",
        "groupId": "uuid",
        "totalPoints": 0,
        "availablePoints": 0,
        "avatarColor": "bg-red-100 text-red-600"
      }
    ],
    "count": 2
  }
}
```

### 2. 获取班级学生列表
```
GET /api/classes/:classId/students?search=张&sortBy=totalPoints&sortDesc=true&page=1&limit=20
Authorization: Bearer {token}

Response: 200 OK
{
  "code": 200,
  "message": "success",
  "data": {
    "students": [
      {
        "id": "uuid",
        "name": "张三",
        "studentNo": "001",
        "gender": "male",
        "groupId": "uuid",
        "totalPoints": 85,
        "availablePoints": 45,
        "avatarColor": "bg-red-100 text-red-600",
        "pet": {
          "level": 2,
          "exp": 45
        }
      }
    ],
    "total": 42,
    "page": 1,
    "limit": 20
  }
}
```

### 3. 获取学生详情
```
GET /api/students/:id
Authorization: Bearer {token}

Response: 200 OK
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "name": "张三",
    "studentNo": "001",
    "gender": "male",
    "groupId": "uuid",
    "totalPoints": 85,
    "availablePoints": 45,
    "parentPhones": ["13800138000"],
    "pet": {
      "id": "uuid",
      "name": "小火龙",
      "level": 2,
      "exp": 45,
      "image": "/pets/charmander.png"
    },
    "createdAt": "2026-03-01T00:00:00.000Z"
  }
}
```

### 4. 更新学生信息
```
PATCH /api/students/:id
Authorization: Bearer {token}

Request Body:
{
  "name": "张三丰",
  "studentNo": "002",
  "gender": "male",
  "groupId": "uuid",
  "parentPhones": ["13800138000", "13900139000"]
}

Response: 200 OK
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "name": "张三丰",
    "updatedAt": "2026-03-19T14:00:00.000Z"
  }
}
```

### 5. 删除学生
```
DELETE /api/students/:id
Authorization: Bearer {token}

Response: 200 OK
{
  "code": 200,
  "message": "学生已删除",
  "data": null
}
```

---

## 积分操作 API

### 1. 单个学生加减分
```
POST /api/students/:id/points
Authorization: Bearer {token}

Request Body:
{
  "type": "add",          // "add" | "deduct"
  "value": 5,
  "reason": "回答问题",
  "ruleId": "uuid"        // 可选
}

Response: 200 OK
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "totalPoints": 90,
    "availablePoints": 50,
    "record": {
      "id": "uuid",
      "type": "add",
      "value": 5,
      "reason": "回答问题",
      "createdAt": "2026-03-19T14:00:00.000Z"
    }
  }
}
```

### 2. 批量加减分
```
POST /api/classes/:classId/points/batch
Authorization: Bearer {token}

Request Body:
{
  "studentIds": ["uuid1", "uuid2"],
  "type": "add",
  "value": 3,
  "reason": "课堂表现好",
  "ruleId": "uuid"
}

Response: 200 OK
{
  "code": 200,
  "message": "success",
  "data": {
    "updated": 2,
    "records": [
      {
        "studentId": "uuid1",
        "totalPoints": 88,
        "availablePoints": 48
      }
    ]
  }
}
```

### 3. 快速加1分
```
POST /api/students/:id/points/quick
Authorization: Bearer {token}

Response: 200 OK
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "totalPoints": 86,
    "availablePoints": 46
  }
}
```

### 4. 查看学生积分明细
```
GET /api/students/:id/points/history?page=1&limit=20
Authorization: Bearer {token}

Response: 200 OK
{
  "code": 200,
  "message": "success",
  "data": {
    "records": [
      {
        "id": "uuid",
        "type": "add",
        "value": 5,
        "reason": "回答问题",
        "createdAt": "2026-03-19T14:00:00.000Z",
        "canRevoke": true
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 20
  }
}
```

### 5. 撤销积分记录（5分钟内）
```
DELETE /api/points/records/:id
Authorization: Bearer {token}

Response: 200 OK
{
  "code": 200,
  "message": "已撤销",
  "data": {
    "student": {
      "id": "uuid",
      "totalPoints": 80,
      "availablePoints": 40
    }
  }
}
```

---

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（未登录或 Token 失效） |
| 403 | 禁止访问（权限不足） |
| 404 | 资源不存在 |
| 409 | 冲突（如手机号已注册） |
| 500 | 服务器内部错误 |

---

## 数据模型

### Student（学生）
```typescript
{
  id: string
  name: string
  studentNo?: string
  gender: "male" | "female"
  groupId?: string
  totalPoints: number        // 总积分
  availablePoints: number    // 可用积分
  avatarColor: string        // 头像颜色
}
```

### Class（班级）
```typescript
{
  id: string
  name: string
  teacher: string
  teacherId: string
  studentCount: number
  totalPoints: number
  isActive: boolean
  createdAt: Date
}
```

### PointRecord（积分记录）
```typescript
{
  id: string
  studentId: string
  type: "add" | "deduct"
  value: number
  reason: string
  ruleId?: string
  createdAt: Date
  canRevoke: boolean         // 是否可撤销（5分钟内）
}
```
