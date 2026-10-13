# 班级积分管理系统

> 游戏化班级管理 + 积分激励系统

## 项目简介

这是一个完整的班级积分管理 SAAS 产品，包含教师端、家长端和运营管理端。通过游戏化的积分系统和宠物养成系统，帮助教师更好地管理班级，激励学生成长。

## 技术栈

### 后端
- **框架**: Nest.js (Node.js + TypeScript)
- **数据库**: PostgreSQL
- **ORM**: Prisma
- **缓存**: Redis
- **认证**: JWT
- **文件存储**: 阿里云OSS / 七牛云

### 前端
- **框架**: Next.js 14 (App Router)
- **UI库**: React 18+
- **样式**: Tailwind CSS + shadcn/ui
- **状态管理**: Zustand
- **数据请求**: TanStack Query
- **图表**: Recharts

## 项目结构

```
class-points-system/
├── backend/                 # 后端项目
│   ├── src/
│   │   ├── prisma/         # Prisma 服务
│   │   ├── common/         # 公共模块
│   │   ├── config/         # 配置模块
│   │   └── modules/        # 业务模块
│   ├── prisma/
│   │   └── schema.prisma   # 数据库模型
│   └── package.json
│
└── frontend/               # 前端项目
    ├── app/               # Next.js App Router
    ├── components/        # 组件库
    ├── lib/              # 工具库
    ├── types/            # 类型定义
    └── package.json
```

## 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- npm 或 yarn

### 后端启动

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等信息

# 生成 Prisma Client
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev

# 启动开发服务器
npm run start:dev
```

后端服务将运行在 `http://localhost:3000`

### 前端启动

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端服务将运行在 `http://localhost:3001`

## 核心功能

### 教师端
- ✅ 用户系统（注册/登录/账号管理/续费）
- ✅ 班级管理
- ✅ 学生管理（含分享给家长）
- ✅ 小组管理
- ✅ 积分管理
- ✅ 积分规则设置
- ✅ 积分商店
- ✅ 数据看板
- ✅ 光荣榜
- ✅ 宠物世界
- ✅ 辅助工具（随机点名、计时器等）

### 家长端
- ✅ 只读页面，查看学生数据

### 运营管理端
- ✅ 账号管理
- ✅ 激活码管理
- ✅ 宠物图鉴管理

## 开发计划

详细的开发计划请查看：[开发实施计划](.claude/plans/jolly-conjuring-cosmos.md)

### 开发阶段

1. **第一阶段（4周）**: 基础架构与核心功能
2. **第二阶段（3周）**: 积分系统与规则管理
3. **第三阶段（3周）**: 宠物系统
4. **第四阶段（2周）**: 数据看板与排行榜
5. **第五阶段（2周）**: 小组管理与积分商店
6. **第六阶段（2周）**: 家长端与分享功能
7. **第七阶段（2周）**: 辅助工具与优化
8. **第八阶段（2周）**: 运营管理端
9. **第九阶段（2周）**: 测试与部署

## 数据库设计

数据库包含以下核心表：

- **用户与账号**: users, activation_codes, user_activation_codes
- **班级与学生**: classes, students, parent_phones, groups
- **积分系统**: point_records, point_rules
- **积分商店**: shop_items, exchanges
- **宠物系统**: pet_gallery, student_pets, pet_growth_records
- **家长分享**: share_links
- **系统日志**: login_logs, operation_logs

详细的数据库模型请查看：[backend/prisma/schema.prisma](backend/prisma/schema.prisma)

## 商业模式

- **6个月版**: 15元（180天）
- **1年版**: 25元（365天）
- 支持多激活码叠加续费
- 账号过期后30天内续费可恢复数据

## 性能目标

- 首屏加载时间 < 2秒
- API响应时间 < 500ms
- 支持100+教师同时在线
- 单班级支持100名学生

## 开发规范

### Git 分支管理

```
main（生产分支）
  ├── develop（开发分支）
  │   ├── feature/auth（认证功能）
  │   ├── feature/class-management（班级管理）
  │   ├── feature/points-system（积分系统）
  │   └── ...
  └── hotfix/xxx（紧急修复）
```

### 代码规范

- 组件：PascalCase（如 `StudentCard`）
- 函数/变量：camelCase（如 `getStudentList`）
- 常量：UPPER_SNAKE_CASE（如 `MAX_STUDENTS`）
- 文件：kebab-case（如 `student-list.tsx`）

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

ISC

## 联系方式

如有问题或建议，请提交 Issue。

---

**当前状态**: 🚧 项目脚手架已搭建完成，正在开发中...

**最后更新**: 2026-03-19
