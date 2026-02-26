import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getSubtasks,
  createSubtask,
  updateSubtask,
  deleteSubtask,
} from '../controllers/subtaskController';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

router.get('/:taskId', getSubtasks);
router.post('/:taskId', createSubtask);
router.put('/:taskId/:subtaskId', updateSubtask);
router.delete('/:taskId/:subtaskId', deleteSubtask);

export default router;
