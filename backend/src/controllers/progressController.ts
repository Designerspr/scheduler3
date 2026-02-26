import { Response } from 'express';
import pool from '../db/connection';
import { AuthRequest } from '../middleware/auth';
import { CreateProgressInput } from '../types/task';

/**
 * 记录每日进度
 */
export async function createProgress(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!;
    const progressData: CreateProgressInput = req.body;

    // 验证任务是否存在且属于当前用户
    const taskResult = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [progressData.task_id, userId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: '任务不存在' });
    }

    // 验证任务类型必须是慢类型
    if (taskResult.rows[0].task_type !== 'slow') {
      return res.status(400).json({ error: '只有慢类型任务可以记录进度' });
    }

    // 插入或更新进度记录
    const result = await pool.query(
      `INSERT INTO task_progress (task_id, date, progress_value, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (task_id, date)
       DO UPDATE SET progress_value = $3, notes = $4
       RETURNING *`,
      [
        progressData.task_id,
        progressData.date,
        progressData.progress_value,
        progressData.notes || null,
      ]
    );

    // 更新任务的完成百分比（取最新日期的进度值）
    const latestProgress = await pool.query(
      `SELECT progress_value FROM task_progress 
       WHERE task_id = $1 
       ORDER BY date DESC LIMIT 1`,
      [progressData.task_id]
    );

    if (latestProgress.rows.length > 0) {
      await pool.query(
        'UPDATE tasks SET completion_percentage = $1 WHERE id = $2',
        [latestProgress.rows[0].progress_value, progressData.task_id]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('创建进度记录错误:', error);
    res.status(500).json({ error: '创建进度记录失败' });
  }
}

/**
 * 获取任务进度历史
 */
export async function getTaskProgress(req: AuthRequest, res: Response) {
  try {
    const { taskId } = req.params;
    const userId = req.userId!;

    // 验证任务是否存在且属于当前用户
    const taskResult = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: '任务不存在' });
    }

    const result = await pool.query(
      'SELECT * FROM task_progress WHERE task_id = $1 ORDER BY date ASC',
      [taskId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('获取进度历史错误:', error);
    res.status(500).json({ error: '获取进度历史失败' });
  }
}

/**
 * 获取甘特图数据
 */
export async function getGanttData(req: AuthRequest, res: Response) {
  try {
    const { taskId } = req.params;
    const userId = req.userId!;

    // 验证任务是否存在且属于当前用户
    const taskResult = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: '任务不存在' });
    }

    const task = taskResult.rows[0];

    // 获取所有进度记录
    const progressResult = await pool.query(
      'SELECT * FROM task_progress WHERE task_id = $1 ORDER BY date ASC',
      [taskId]
    );

    // 构建甘特图数据
    const ganttData = {
      task: {
        id: task.id,
        title: task.title,
        start_date: task.created_at,
        end_date: task.deadline || null,
        completion_percentage: task.completion_percentage,
      },
      progress: progressResult.rows.map((row: any) => ({
        date: row.date,
        progress_value: row.progress_value,
        notes: row.notes,
      })),
    };

    res.json(ganttData);
  } catch (error) {
    console.error('获取甘特图数据错误:', error);
    res.status(500).json({ error: '获取甘特图数据失败' });
  }
}
