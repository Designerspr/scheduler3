import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getTaskStats,
  getTodayTodos,
} from '../controllers/taskController';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

// 任务CRUD路由
router.get('/', getTasks);
router.get('/today', getTodayTodos);
router.get('/stats', getTaskStats);
router.get('/:id', getTaskById);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

// 分类视图路由
router.get('/quadrant/:quadrant', async (req, res, next) => {
  req.query.quadrant = req.params.quadrant;
  return getTasks(req as any, res);
});

router.get('/type/:type', async (req, res, next) => {
  req.query.type = req.params.type;
  return getTasks(req as any, res);
});

router.get('/date/:date', async (req, res, next) => {
  req.query.date = req.params.date;
  return getTasks(req as any, res);
});

export default router;
