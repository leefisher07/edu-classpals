# 班级积分管理系统

## 版本历史

### v1.0.0 - 基础架构 (2026-03-19)

**已完成功能：**
- ✅ 项目初始化（前端 + 后端）
- ✅ 数据库设计（Prisma Schema - 13个核心表）
- ✅ 用户认证模块（注册、登录、JWT）
- ✅ 全局守卫、拦截器、异常过滤器
- ✅ 前端原型设计（基于 v0.app）

**技术栈：**
- 前端：Next.js 14 + React 18 + Tailwind CSS + shadcn/ui
- 后端：Nest.js + Prisma 7 + SQLite (开发环境)
- 认证：JWT + Passport

**数据库表：**
- users（用户）
- activation_codes（激活码）
- user_activation_codes（用户激活码关联）
- classes（班级）
- students（学生）
- parent_phones（家长手机号）
- groups（小组）
- point_records（积分记录）
- point_rules（积分规则）
- shop_items（商品）
- exchanges（兑换记录）
- pet_gallery（宠物图鉴）
- student_pets（学生宠物）
- share_links（分享链接）

**下一步计划：**
- [ ] 班级管理模块（CRUD + 权限控制）
- [ ] 学生管理模块（CRUD + 批量导入）
- [ ] 积分操作模块（加减分、批量操作、撤销）

---

### v1.1.0 - 班级与学生管理 (计划中)

**开发中功能：**
- 班级 CRUD API
- 学生 CRUD API
- 批量导入学生
- 积分操作 API

**API 设计文档：**
详见 `docs/api-v1.1.md`

---

## 开发规范

### Git 分支策略
- `main` - 生产环境（稳定版本）
- `develop` - 开发分支
- `feature/*` - 功能分支
- `hotfix/*` - 紧急修复

### 版本号规则
- 主版本号：重大架构变更
- 次版本号：新功能模块
- 修订号：Bug 修复和小优化

### 提交信息规范
- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 重构
- `test:` 测试相关
- `chore:` 构建/工具相关

---

## 项目结构

```
class-points-system/
├── backend/                 # 后端项目
│   ├── src/
│   │   ├── common/         # 公共模块
│   │   ├── modules/        # 业务模块
│   │   │   ├── auth/      # 认证模块 ✅
│   │   │   ├── classes/   # 班级模块 (开发中)
│   │   │   └── students/  # 学生模块 (开发中)
│   │   └── prisma/        # Prisma 服务
│   └── prisma/
│       ├── schema.prisma  # 数据库模型
│       └── migrations/    # 数据库迁移
│
└── frontend/               # 前端项目
    ├── app/               # Next.js App Router
    ├── components/        # React 组件
    └── lib/              # 工具库
```

---

## 快速开始

### 后端启动
```bash
cd backend
npm install
npm run start:dev
```

### 前端启动
```bash
cd frontend
npm install
npm run dev
```

### 数据库迁移
```bash
cd backend
npx prisma migrate dev
```

---

## 联系方式

- 开发者：Claude + 用户
- 开发时间：2026年3月
