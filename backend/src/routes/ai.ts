import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { parseInput, summarizeTasks } from '../controllers/aiController';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

router.post('/parse', parseInput);
router.post('/summarize', summarizeTasks);

export default router;
