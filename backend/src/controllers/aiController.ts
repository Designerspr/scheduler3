import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { parseNaturalLanguage, generateTaskSummary } from '../services/aiService';

/**
 * 解析自然语言输入为任务
 */
export async function parseInput(req: AuthRequest, res: Response) {
  try {
    const { input } = req.body;

    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: '输入内容不能为空' });
    }

    const tasks = await parseNaturalLanguage(input);
    res.json({ tasks });
  } catch (error: any) {
    console.error('解析输入错误:', error);
    res.status(500).json({ error: error.message || '解析输入失败' });
  }
}

/**
 * 生成任务总结
 */
export async function summarizeTasks(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!;
    const summary = await generateTaskSummary(userId);
    res.json({ summary });
  } catch (error: any) {
    console.error('生成总结错误:', error);
    res.status(500).json({ error: error.message || '生成总结失败' });
  }
}
