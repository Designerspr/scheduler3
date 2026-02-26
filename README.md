# 待办事项管理工具

一个功能完整的待办事项管理工具，支持4象限分类、甘特图、周期任务、AI集成和多端同步。

## 功能特性

- ✅ 4象限任务分类（重要且紧急 / 重要不紧急 / 不重要但紧急 / 不重要不紧急）
- ⏰ 急类型任务支持DDL（截止日期）
- 📊 慢类型任务支持甘特图和每日填空跟踪
- 🔄 周期任务支持（每天、每周、每月、自定义周期）
- 📱 多分类视图（按类型、日期排列）
- 📈 综合完成比例统计
- 🤖 AI自然语言输入解析
- 🤖 AI任务总结和建议
- 🔐 Token认证机制
- 📱 响应式设计（桌面端和移动端）

## 技术栈

### 前端
- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router
- Zustand (状态管理)
- Axios

### 后端
- Node.js + Express + TypeScript
- PostgreSQL
- OpenAI API
- JWT Token认证

## 项目结构

```
scheduler3/
├── frontend/          # React前端应用
├── backend/           # Node.js后端应用
├── database/          # 数据库迁移脚本
└── README.md
```

## 快速开始

### 前置要求

- Node.js 18+
- PostgreSQL 14+
- OpenAI API Key（用于AI功能）

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd scheduler3
```

2. **安装后端依赖**
```bash
cd backend
npm install
```

3. **配置后端环境变量**
```bash
# 方法1：复制示例文件（推荐）
# 打开 backend/env.example.txt，复制内容到 backend/.env 文件

# 方法2：手动创建 backend/.env 文件，内容如下：
# PORT=3000
# NODE_ENV=development
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=scheduler3
# DB_USER=postgres
# DB_PASSWORD=your_password_here
# JWT_SECRET=your_jwt_secret_key_here
# OPENAI_API_KEY=sk-your_openai_api_key_here
```
详细配置说明请参考 [ENV_SETUP.md](ENV_SETUP.md) 或 [QUICK_START.md](QUICK_START.md)

4. **初始化数据库**
```bash
# 创建PostgreSQL数据库
createdb scheduler3

# 运行迁移脚本
npm run migrate

# 初始化用户并获取 API Token（重要！）
npm run init-user
# 保存输出的 Token，登录前端时需要用到
```

5. **启动后端服务器**
```bash
npm run dev
```

6. **安装前端依赖**
```bash
cd ../frontend
npm install
```

7. **配置前端环境变量**
```bash
# 方法1：复制示例文件（推荐）
# 打开 frontend/env.example.txt，复制内容到 frontend/.env 文件

# 方法2：手动创建 frontend/.env 文件，内容如下：
# VITE_API_URL=http://localhost:3000/api
```

8. **启动前端开发服务器**
```bash
npm run dev
```

访问 http://localhost:5173 查看应用

## 开发

### 后端开发
```bash
cd backend
npm run dev  # 开发模式，自动重启
npm run build  # 构建
npm start  # 生产模式
```

### 前端开发
```bash
cd frontend
npm run dev  # 开发服务器
npm run build  # 构建生产版本
npm run preview  # 预览生产构建
```

## API文档

### 认证
所有API请求需要在Header中携带Token：
```
Authorization: Bearer <your_token>
```

### 主要端点

- `GET /api/tasks` - 获取任务列表
- `POST /api/tasks` - 创建任务
- `PUT /api/tasks/:id` - 更新任务
- `DELETE /api/tasks/:id` - 删除任务
- `GET /api/tasks/quadrant/:quadrant` - 按象限获取任务
- `GET /api/tasks/stats` - 获取统计信息
- `POST /api/ai/parse` - AI解析自然语言
- `POST /api/ai/summarize` - AI生成总结

详细API文档请参考后端代码注释。

## 许可证

ISC
