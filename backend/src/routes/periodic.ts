import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  completePeriodicTask,
  getUpcomingPeriodicTasks,
  createPeriodicTask,
  updatePeriodicTask,
  getPeriodicTaskStats,
  getPeriodicTaskByTaskId,
  getPeriodicTaskCompletions,
  updatePeriodicTaskCompletion,
  deletePeriodicTaskCompletion,
} from '../controllers/periodicController';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

router.post('/complete', completePeriodicTask);
router.post('/', createPeriodicTask);
router.put('/task/:taskId', updatePeriodicTask);
router.get('/upcoming', getUpcomingPeriodicTasks);
router.get('/task/:taskId', getPeriodicTaskByTaskId);
router.get('/:periodic_task_id/stats', getPeriodicTaskStats);
router.get('/:periodic_task_id/completions', getPeriodicTaskCompletions);
router.put('/completions/:completion_id', updatePeriodicTaskCompletion);
router.delete('/completions/:completion_id', deletePeriodicTaskCompletion);

export default router;
