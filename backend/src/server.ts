import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '服务器运行正常' });
});

// API路由
import taskRoutes from './routes/tasks';
import progressRoutes from './routes/progress';
import periodicRoutes from './routes/periodic';
import aiRoutes from './routes/ai';
import subtaskRoutes from './routes/subtasks';
app.use('/api/tasks', taskRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/periodic', periodicRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/subtasks', subtaskRoutes);

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: '未找到请求的资源' });
});

// 错误处理
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误', message: err.message });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
});

export default app;
