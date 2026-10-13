# 需求文档 vs 原型代码 vs 数据库设计 - 对比分析

## 一、班级管理模块

### 需求文档要求：
- 创建班级（班级名称、班主任）
- 编辑班级信息（班级名称、班主任）
- 删除班级（需二次确认，数据归档）
- 班级列表查看
- 无限制创建班级

### 原型代码字段：
```typescript
interface ClassInfo {
  id: string
  name: string              // ✅ 班级名称
  teacher: string           // ✅ 班主任
  studentCount: number      // ✅ 学生数量（统计）
  totalPoints: number       // ✅ 总积分（统计）
  createdAt: string         // ✅ 创建时间
  isActive: boolean         // ✅ 是否当前班级
}
```

### 数据库设计：
```prisma
model Class {
  id              String    @id @default(uuid())
  name            String                    // ✅ 班级名称
  teacherName     String?                   // ✅ 班主任
  userId          String                    // ✅ 所属教师ID
  isArchived      Boolean   @default(false) // ✅ 是否归档
  createdAt       DateTime  @default(now()) // ✅ 创建时间
  updatedAt       DateTime  @updatedAt      // ✅ 更新时间
}
```

### ⚠️ 发现的问题：

1. **缺少 isActive 字段**
   - 原型需要：标记当前使用的班级
   - 数据库缺少：`isActive` 或 `currentClassId` 字段
   - **解决方案**：在 User 表添加 `currentClassId` 字段，或在 Class 表添加 `isActive` 字段

2. **统计字段**
   - 原型需要：`studentCount`, `totalPoints`
   - 数据库：需要实时计算或缓存
   - **解决方案**：API 返回时动态计算

---

## 二、学生管理模块

### 需求文档要求：
- 姓名（必填）
- 性别（默认男、必填）
- 学号（可选）
- 分组（可选）
- 头像（选择默认图标或上传头像）
- 头像默认背景色
- 班干部（是/否）
- 班干部岗位（可选）
- 家长手机号管理（手机号1+关系、手机号2+关系）
- Excel批量导入
- 学生排序（按学号/姓名/积分/自定义拖拽）
- 每个班级最多100名学生

### 原型代码字段：
```typescript
export interface Student {
  id: string
  name: string              // ✅ 姓名
  studentNo?: string        // ✅ 学号
  gender: "male" | "female" // ✅ 性别
  groupId?: string          // ✅ 小组ID
  totalPoints: number       // ✅ 总积分
  availablePoints: number   // ⚠️ 可用积分（需求文档未提及）
  avatarColor: string       // ✅ 头像颜色
}
```

### 数据库设计：
```prisma
model Student {
  id              String    @id @default(uuid())
  classId         String                    // ✅ 班级ID
  name            String                    // ✅ 姓名
  gender          Gender    @default(MALE)  // ✅ 性别
  studentNumber   String?                   // ✅ 学号
  avatar          String?                   // ✅ 头像
  avatarBgColor   String?   @default("#3B82F6") // ✅ 头像背景色
  isCadre         Boolean   @default(false) // ✅ 是否班干部
  cadrePosition   String?                   // ✅ 班干部岗位
  groupId         String?                   // ✅ 小组ID
  totalPoints     Int       @default(0)     // ✅ 总积分
  sortOrder       Int       @default(0)     // ✅ 排序
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model ParentPhone {
  id              String    @id @default(uuid())
  studentId       String                    // ✅ 学生ID
  phone           String                    // ✅ 手机号
  relationship    String                    // ✅ 关系
  createdAt       DateTime  @default(now())
}
```

### ⚠️ 发现的问题：

1. **可用积分字段缺失**
   - 原型需要：`availablePoints`（可用于兑换的积分）
   - 数据库只有：`totalPoints`（总积分）
   - **解决方案**：添加 `availablePoints` 字段，或通过计算得出（总积分 - 已兑换积分）

2. **字段命名不一致**
   - 原型：`studentNo`
   - 数据库：`studentNumber`
   - **解决方案**：API 层做字段映射

3. **头像颜色字段**
   - 原型：`avatarColor`（CSS 类名，如 "bg-red-100 text-red-600"）
   - 数据库：`avatarBgColor`（颜色值，如 "#3B82F6"）
   - **解决方案**：API 返回时生成 CSS 类名

---

## 三、积分管理模块

### 需求文档要求：
- 单人加分（选择已有规则或自定义）
- 单人扣分（选择已有规则或自定义）
- 快速加1分按钮
- 查看学生积分明细
- 按时间筛选积分记录
- 按规则类型筛选积分记录
- 批量加减分（全班/小组/多选学生）
- 撤销功能（5分钟内可撤销）

### 原型代码功能：
```typescript
// 单个学生加减分
handleAddPoint(student: Student)
handleDeductPoint(student: Student)

// 快速加1分
handleQuickAddPoint(student: Student)

// 批量加减分
handleBatchPoints(data: {
  studentIds: string[]
  value: number
  reason?: string
  ruleId?: string
})

// 查看积分明细
handleViewHistory(student: Student)

// 撤销记录
onRevoke(recordId: string)
```

### 数据库设计：
```prisma
model PointRecord {
  id              String    @id @default(uuid())
  studentId       String                    // ✅ 学生ID
  classId         String                    // ✅ 班级ID
  type            PointType                 // ✅ 类型（ADD/DEDUCT）
  value           Int                       // ✅ 分值
  reason          String?                   // ✅ 原因
  ruleId          String?                   // ✅ 规则ID
  operatorId      String                    // ✅ 操作人ID
  createdAt       DateTime  @default(now()) // ✅ 创建时间
}

enum PointType {
  ADD
  DEDUCT
}
```

### ⚠️ 发现的问题：

1. **撤销功能支持**
   - 需求：5分钟内可撤销
   - 数据库缺少：`isRevoked` 字段或 `revokedAt` 字段
   - **解决方案**：添加 `isRevoked` 和 `revokedAt` 字段

2. **可用积分计算**
   - 需求：总积分 - 已兑换积分 = 可用积分
   - 数据库：需要关联 Exchange 表计算
   - **解决方案**：API 返回时动态计算

---

## 四、需要调整的数据库字段

### 1. User 表 - 添加当前班级
```prisma
model User {
  // ... 现有字段
  currentClassId  String?   // 当前使用的班级ID
}
```

### 2. Student 表 - 添加可用积分
```prisma
model Student {
  // ... 现有字段
  availablePoints Int       @default(0)  // 可用积分
}
```

### 3. PointRecord 表 - 添加撤销支持
```prisma
model PointRecord {
  // ... 现有字段
  isRevoked       Boolean   @default(false)  // 是否已撤销
  revokedAt       DateTime?                  // 撤销时间
  revokedBy       String?                    // 撤销人ID
}
```

---

## 五、API 设计调整

### 班级管理 API

#### 1. 创建班级
```typescript
POST /api/classes
Body: {
  name: string,           // 班级名称
  teacherName?: string    // 班主任（可选，默认当前用户名）
}
Response: {
  id, name, teacherName, userId,
  studentCount: 0, totalPoints: 0,
  isActive: false, createdAt
}
```

#### 2. 切换当前班级
```typescript
POST /api/classes/:id/activate
Response: { id, isActive: true }
// 同时更新 User.currentClassId
```

### 学生管理 API

#### 1. 添加学生
```typescript
POST /api/classes/:classId/students
Body: {
  names: string[],              // 支持批量
  gender: "male" | "female",
  studentNumber?: string,
  groupId?: string,
  isCadre?: boolean,
  cadrePosition?: string,
  parentPhones?: [
    { phone: string, relationship: string }
  ]
}
Response: {
  created: [{
    id, name, studentNumber, gender, groupId,
    totalPoints: 0, availablePoints: 0,
    avatarColor: "bg-red-100 text-red-600",  // 动态生成
    isCadre, cadrePosition
  }],
  count: number
}
```

#### 2. 获取学生列表
```typescript
GET /api/classes/:classId/students?search=&sortBy=totalPoints&sortDesc=true
Response: {
  students: [{
    id, name, studentNumber, gender, groupId,
    totalPoints, availablePoints,  // availablePoints = totalPoints - 已兑换积分
    avatarColor,                   // 根据 avatarBgColor 生成 CSS 类
    isCadre, cadrePosition,
    pet: { level, exp }
  }],
  total, page, limit
}
```

### 积分操作 API

#### 1. 单个学生加减分
```typescript
POST /api/students/:id/points
Body: {
  type: "add" | "deduct",
  value: number,
  reason?: string,
  ruleId?: string
}
Response: {
  id, totalPoints, availablePoints,
  record: { id, type, value, reason, createdAt, canRevoke: true }
}
```

#### 2. 撤销积分记录
```typescript
DELETE /api/points/records/:id
// 检查是否在5分钟内
// 更新 isRevoked = true, revokedAt = now
// 回退学生积分
Response: {
  message: "已撤销",
  student: { id, totalPoints, availablePoints }
}
```

---

## 六、总结

### ✅ 完全匹配的功能
1. 班级基础 CRUD
2. 学生基础 CRUD
3. 积分加减分操作
4. 家长手机号管理
5. 小组管理
6. 班干部管理

### ⚠️ 需要调整的地方
1. **数据库迁移**：添加 `User.currentClassId`, `Student.availablePoints`, `PointRecord.isRevoked`
2. **字段映射**：`studentNumber` → `studentNo`, `avatarBgColor` → `avatarColor`
3. **动态计算**：`studentCount`, `totalPoints`, `availablePoints`
4. **撤销逻辑**：5分钟时间窗口检查

### 📋 开发优先级
1. **P0（立即）**：数据库迁移 → 班级 CRUD → 学生 CRUD
2. **P1（重要）**：积分操作 → 撤销功能 → 批量导入
3. **P2（优化）**：排序拖拽 → 统计缓存

---

## 七、下一步行动

1. ✅ 创建数据库迁移文件（添加缺失字段）
2. ✅ 开发班级管理 API
3. ✅ 开发学生管理 API
4. ✅ 开发积分操作 API
5. ✅ 编写单元测试
6. ✅ 前端对接测试
