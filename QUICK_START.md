# 快速开始指南

## 环境变量配置

### 方法一：使用示例文件（推荐）

1. **后端配置**：
   - 打开 `backend/env.example.txt` 文件
   - 复制所有内容
   - 在 `backend` 目录下创建 `.env` 文件
   - 粘贴内容并修改实际值

2. **前端配置**：
   - 打开 `frontend/env.example.txt` 文件
   - 复制所有内容
   - 在 `frontend` 目录下创建 `.env` 文件
   - 粘贴内容并修改实际值

### 方法二：手动创建

#### 后端 `.env` 文件内容：

```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=scheduler3
DB_USER=postgres
DB_PASSWORD=your_password_here
JWT_SECRET=your_jwt_secret_key_here
OPENAI_API_KEY=sk-your_openai_api_key_here
```

#### 前端 `.env` 文件内容：

```env
VITE_API_URL=http://localhost:3000/api
```

## 必须修改的配置项

### 后端必须修改：

- ✅ `DB_PASSWORD`: 替换为您的 PostgreSQL 数据库密码
- ✅ `OPENAI_API_KEY`: 替换为您的 OpenAI API 密钥（如果使用 AI 功能）

### 后端可选修改：

- `JWT_SECRET`: 建议使用随机生成的密钥（可用 `openssl rand -base64 32` 生成）
- `PORT`: 如果 3000 端口被占用，可以修改为其他端口

### 前端必须修改：

- 如果后端运行在不同端口，需要修改 `VITE_API_URL` 中的端口号

## 完整设置流程

1. **安装依赖**：
   ```bash
   # 后端
   cd backend
   npm install
   
   # 前端
   cd frontend
   npm install
   ```

2. **配置环境变量**：
   - 按照上面的方法创建 `.env` 文件
   - 填写实际的配置值

3. **创建数据库**：
   ```bash
   createdb scheduler3
   ```

4. **运行数据库迁移**：
   ```bash
   cd backend
   npm run migrate
   ```

5. **初始化用户（获取 API Token）**：
   ```bash
   cd backend
   npm run init-user
   ```
   保存输出的 Token，登录前端时需要用到。

6. **启动服务**：
   ```bash
   # 终端1：启动后端
   cd backend
   npm run dev
   
   # 终端2：启动前端
   cd frontend
   npm run dev
   ```

7. **访问应用**：
   - 打开浏览器访问：http://localhost:5173
   - 使用步骤5中获取的 Token 登录

## 常见问题

### Q: 如何生成 JWT_SECRET？
A: 
- Windows: `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))`
- Linux/Mac: `openssl rand -base64 32`

### Q: 没有 OpenAI API Key 可以使用吗？
A: 可以，但 AI 功能（自然语言解析、任务总结）将无法使用。其他功能正常。

### Q: 数据库连接失败？
A: 检查：
- PostgreSQL 服务是否启动
- 数据库是否已创建：`createdb scheduler3`
- `.env` 文件中的数据库配置是否正确

### Q: 前端无法连接后端？
A: 检查：
- 后端服务是否启动（http://localhost:3000）
- 前端的 `VITE_API_URL` 配置是否正确
- 浏览器控制台是否有错误信息

更多详细信息请参考 `ENV_SETUP.md` 文件。
