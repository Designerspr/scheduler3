import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createProgress,
  getTaskProgress,
  getGanttData,
} from '../controllers/progressController';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

router.post('/', createProgress);
router.get('/:taskId', getTaskProgress);
router.get('/gantt/:taskId', getGanttData);

export default router;
