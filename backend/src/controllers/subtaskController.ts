import { Response } from 'express';
import pool from '../db/connection';
import { AuthRequest } from '../middleware/auth';
import { CreateSubtaskInput, UpdateSubtaskInput } from '../types/task';

/**
 * 获取任务的所有子任务
 */
export async function getSubtasks(req: AuthRequest, res: Response) {
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
      'SELECT * FROM subtasks WHERE task_id = $1 ORDER BY order_index ASC, created_at ASC',
      [taskId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('获取子任务错误:', error);
    res.status(500).json({ error: '获取子任务失败' });
  }
}

/**
 * 创建子任务
 */
export async function createSubtask(req: AuthRequest, res: Response) {
  try {
    const { taskId } = req.params;
    const userId = req.userId!;
    const subtaskData: CreateSubtaskInput = req.body;

    // 验证任务是否存在且属于当前用户
    const taskResult = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: '任务不存在' });
    }

    const result = await pool.query(
      `INSERT INTO subtasks (task_id, title, description, status, priority, tags, order_index, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        taskId,
        subtaskData.title,
        subtaskData.description || null,
        'pending',
        subtaskData.priority || 'medium',
        subtaskData.tags || [],
        subtaskData.order_index || 0,
        subtaskData.start_date || null,
        subtaskData.end_date || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('创建子任务错误:', error);
    res.status(500).json({ error: '创建子任务失败' });
  }
}

/**
 * 更新子任务
 */
export async function updateSubtask(req: AuthRequest, res: Response) {
  try {
    const { taskId, subtaskId } = req.params;
    const userId = req.userId!;
    const subtaskData: UpdateSubtaskInput = req.body;

    // 验证任务和子任务是否存在且属于当前用户
    const taskResult = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: '任务不存在' });
    }

    // 构建更新字段
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (subtaskData.title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      params.push(subtaskData.title);
      paramIndex++;
    }
    if (subtaskData.description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      params.push(subtaskData.description);
      paramIndex++;
    }
    if (subtaskData.status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      params.push(subtaskData.status);
      paramIndex++;
    }
    if (subtaskData.priority !== undefined) {
      updateFields.push(`priority = $${paramIndex}`);
      params.push(subtaskData.priority);
      paramIndex++;
    }
    if (subtaskData.tags !== undefined) {
      updateFields.push(`tags = $${paramIndex}`);
      params.push(subtaskData.tags);
      paramIndex++;
    }
    if (subtaskData.order_index !== undefined) {
      updateFields.push(`order_index = $${paramIndex}`);
      params.push(subtaskData.order_index);
      paramIndex++;
    }
    if (subtaskData.start_date !== undefined) {
      updateFields.push(`start_date = $${paramIndex}`);
      params.push(subtaskData.start_date);
      paramIndex++;
    }
    if (subtaskData.end_date !== undefined) {
      updateFields.push(`end_date = $${paramIndex}`);
      params.push(subtaskData.end_date);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: '没有要更新的字段' });
    }

    params.push(subtaskId, taskId);
    const query = `UPDATE subtasks SET ${updateFields.join(', ')} 
                   WHERE id = $${paramIndex} AND task_id = $${paramIndex + 1} 
                   RETURNING *`;

    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('更新子任务错误:', error);
    res.status(500).json({ error: '更新子任务失败' });
  }
}

/**
 * 删除子任务
 */
export async function deleteSubtask(req: AuthRequest, res: Response) {
  try {
    const { taskId, subtaskId } = req.params;
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
      'DELETE FROM subtasks WHERE id = $1 AND task_id = $2 RETURNING *',
      [subtaskId, taskId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '子任务不存在' });
    }

    res.json({ message: '子任务已删除', subtask: result.rows[0] });
  } catch (error) {
    console.error('删除子任务错误:', error);
    res.status(500).json({ error: '删除子任务失败' });
  }
}
