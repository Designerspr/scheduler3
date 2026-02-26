# 环境变量配置说明

本文档提供完整的环境变量配置示例，方便您快速设置项目。

## 后端环境变量配置

在 `backend` 目录下创建 `.env` 文件，内容如下：

```env
# ============================================
# 服务器配置
# ============================================
# 后端服务端口号
PORT=3000

# 运行环境：development | production
NODE_ENV=development

# ============================================
# PostgreSQL 数据库配置
# ============================================
# 数据库主机地址
DB_HOST=localhost

# 数据库端口号（PostgreSQL默认5432）
DB_PORT=5432

# 数据库名称
DB_NAME=scheduler3

# 数据库用户名
DB_USER=postgres

# 数据库密码（请替换为您的实际密码）
DB_PASSWORD=your_password_here

# ============================================
# JWT 认证配置
# ============================================
# JWT密钥（用于Token签名，请使用随机生成的强密钥）
# 生成方式：openssl rand -base64 32
JWT_SECRET=your_jwt_secret_key_here_change_this_to_a_random_string

# ============================================
# OpenAI API 配置
# ============================================
# OpenAI API密钥（从 https://platform.openai.com/api-keys 获取）
# 格式：sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-your_openai_api_key_here
```

### 后端配置说明

1. **PORT**: 后端服务运行的端口，默认 3000
2. **NODE_ENV**: 运行环境，开发环境使用 `development`
3. **DB_HOST**: PostgreSQL 数据库主机，本地开发使用 `localhost`
4. **DB_PORT**: PostgreSQL 端口，默认 5432
5. **DB_NAME**: 数据库名称，需要先创建：`createdb scheduler3`
6. **DB_USER**: 数据库用户名，通常是 `postgres`
7. **DB_PASSWORD**: 数据库密码，请替换为您的实际密码
8. **JWT_SECRET**: JWT 签名密钥，建议使用随机字符串（可用 `openssl rand -base64 32` 生成）
9. **OPENAI_API_KEY**: OpenAI API 密钥，从 [OpenAI Platform](https://platform.openai.com/api-keys) 获取

## 前端环境变量配置

在 `frontend` 目录下创建 `.env` 文件，内容如下：

```env
# ============================================
# 前端环境变量配置
# ============================================
# 后端API服务地址
# 开发环境：http://localhost:3000/api
# 生产环境：https://your-domain.com/api
VITE_API_URL=http://localhost:3000/api
```

### 前端配置说明

1. **VITE_API_URL**: 后端 API 服务地址
   - 开发环境：`http://localhost:3000/api`
   - 生产环境：`https://your-domain.com/api`（请使用 HTTPS）

## 快速设置步骤

### 1. 创建后端环境变量文件

```bash
cd backend
# Windows (PowerShell)
Copy-Item .env.example .env
# 或手动创建 .env 文件，复制上面的配置内容

# Linux/Mac
cp .env.example .env
# 或手动创建 .env 文件，复制上面的配置内容
```

### 2. 创建前端环境变量文件

```bash
cd frontend
# Windows (PowerShell)
Copy-Item .env.example .env
# 或手动创建 .env 文件，复制上面的配置内容

# Linux/Mac
cp .env.example .env
# 或手动创建 .env 文件，复制上面的配置内容
```

### 3. 编辑配置文件

使用文本编辑器打开 `.env` 文件，根据实际情况填写：

**后端 `.env` 必须修改的项：**
- `DB_PASSWORD`: 您的 PostgreSQL 密码
- `JWT_SECRET`: 随机生成的密钥（可选，但建议设置）
- `OPENAI_API_KEY`: 您的 OpenAI API 密钥（如果使用 AI 功能）

**前端 `.env` 必须修改的项：**
- `VITE_API_URL`: 如果后端运行在不同端口，需要修改

### 4. 生成 JWT Secret（可选）

```bash
# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Linux/Mac
openssl rand -base64 32
```

将生成的字符串填入 `JWT_SECRET`。

## 配置示例（最小化配置）

如果您只想快速测试，可以使用以下最小配置：

### 后端最小配置

```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=scheduler3
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=dev_secret_key_change_in_production
OPENAI_API_KEY=sk-your_key_here
```

### 前端最小配置

```env
VITE_API_URL=http://localhost:3000/api
```

## 注意事项

1. **安全性**：
   - 生产环境请使用强密码和随机密钥
   - 不要将 `.env` 文件提交到版本控制系统
   - `.env` 文件已在 `.gitignore` 中排除

2. **数据库**：
   - 确保 PostgreSQL 服务已启动
   - 确保数据库已创建：`createdb scheduler3`
   - 如果使用 Docker，`DB_HOST` 可能需要改为容器名称

3. **OpenAI API**：
   - 如果没有 OpenAI API Key，AI 功能将无法使用
   - 可以在 OpenAI 官网注册并获取免费额度

4. **端口冲突**：
   - 如果 3000 端口被占用，可以修改 `PORT` 值
   - 同时需要修改前端的 `VITE_API_URL` 中的端口号

## 验证配置

配置完成后，可以运行以下命令验证：

```bash
# 后端
cd backend
npm run migrate  # 测试数据库连接
npm run init-user  # 初始化用户并获取 Token

# 前端
cd frontend
npm run dev  # 启动开发服务器
```

如果配置正确，后端应该能成功连接数据库，前端应该能正常启动。
