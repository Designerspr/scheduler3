import { Response } from 'express';
import pool from '../db/connection';
import { AuthRequest } from '../middleware/auth';
import { CreateTaskInput, UpdateTaskInput, Task } from '../types/task';

/**
 * 获取任务列表
 * 支持按象限、类型、日期筛选
 */
export async function getTasks(req: AuthRequest, res: Response) {
  try {
    const { quadrant, type, date, status, archived } = req.query;
    const userId = req.userId!;

    let query = 'SELECT * FROM tasks WHERE user_id = $1';
    const params: any[] = [userId];
    let paramIndex = 2;

    if (quadrant) {
      query += ` AND quadrant = $${paramIndex}`;
      params.push(parseInt(quadrant as string));
      paramIndex++;
    }

    if (type) {
      query += ` AND task_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (date) {
      query += ` AND DATE(deadline) = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // 归档筛选：archived=true 只返回已完成的任务，archived=false 排除已完成的任务
    if (archived === 'true') {
      query += ` AND status = 'completed'`;
    } else if (archived === 'false') {
      query += ` AND status != 'completed'`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('获取任务列表错误:', error);
    res.status(500).json({ error: '获取任务列表失败' });
  }
}

/**
 * 获取单个任务详情
 */
export async function getTaskById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const result = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '任务不存在' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('获取任务详情错误:', error);
    res.status(500).json({ error: '获取任务详情失败' });
  }
}

/**
 * 创建任务
 */
export async function createTask(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!;
    const taskData: CreateTaskInput = req.body;

    // 验证必填字段
    if (!taskData.title || !taskData.task_type) {
      return res.status(400).json({ error: '标题和任务类型为必填项' });
    }

    // 验证急类型任务必须有DDL
    if (taskData.task_type === 'urgent' && !taskData.deadline) {
      return res.status(400).json({ error: '急类型任务必须设置截止日期' });
    }

    // 验证完成百分比仅对slow类型任务有效
    if (taskData.completion_percentage !== undefined && taskData.task_type !== 'slow') {
      return res.status(400).json({ error: '只有慢类型任务可以设置完成百分比' });
    }
    // 验证完成百分比范围
    if (taskData.completion_percentage !== undefined && 
        (taskData.completion_percentage < 0 || taskData.completion_percentage > 100)) {
      return res.status(400).json({ error: '完成百分比必须在0-100之间' });
    }

    const result = await pool.query(
      `INSERT INTO tasks (
        user_id, title, description, status, priority, quadrant, 
        task_type, deadline, completion_percentage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING *`,
      [
        userId,
        taskData.title,
        taskData.description || null,
        'pending',
        taskData.priority || 'medium',
        taskData.quadrant || null,
        taskData.task_type,
        taskData.deadline || null,
        taskData.completion_percentage !== undefined ? taskData.completion_percentage : (taskData.task_type === 'slow' ? 0 : 0),
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('创建任务错误:', error);
    res.status(500).json({ error: '创建任务失败' });
  }
}

/**
 * 更新任务
 */
export async function updateTask(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.userId!;
    const taskData: UpdateTaskInput = req.body;

    // 检查任务是否存在
    const existingTask = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingTask.rows.length === 0) {
      return res.status(404).json({ error: '任务不存在' });
    }

    // 构建更新字段
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (taskData.title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      params.push(taskData.title);
      paramIndex++;
    }
    if (taskData.description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      params.push(taskData.description);
      paramIndex++;
    }
    if (taskData.status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      params.push(taskData.status);
      paramIndex++;
    }
    if (taskData.priority !== undefined) {
      updateFields.push(`priority = $${paramIndex}`);
      params.push(taskData.priority);
      paramIndex++;
    }
    if (taskData.quadrant !== undefined) {
      updateFields.push(`quadrant = $${paramIndex}`);
      params.push(taskData.quadrant);
      paramIndex++;
    }
    if (taskData.task_type !== undefined) {
      updateFields.push(`task_type = $${paramIndex}`);
      params.push(taskData.task_type);
      paramIndex++;
    }
    if (taskData.deadline !== undefined) {
      updateFields.push(`deadline = $${paramIndex}`);
      // 如果deadline是空字符串，转换为null
      params.push(taskData.deadline === '' || taskData.deadline === null ? null : taskData.deadline);
      paramIndex++;
    }
    // 确定最终的任务类型（如果更新了task_type，使用新类型；否则使用原类型）
    const finalTaskType = taskData.task_type !== undefined ? taskData.task_type : existingTask.rows[0].task_type;
    
    if (taskData.completion_percentage !== undefined) {
      // 验证完成百分比仅对slow类型任务有效
      if (finalTaskType !== 'slow') {
        return res.status(400).json({ error: '只有慢类型任务可以设置完成百分比' });
      }
      // 验证完成百分比范围
      if (taskData.completion_percentage < 0 || taskData.completion_percentage > 100) {
        return res.status(400).json({ error: '完成百分比必须在0-100之间' });
      }
      updateFields.push(`completion_percentage = $${paramIndex}`);
      params.push(taskData.completion_percentage);
      paramIndex++;
    } else if (taskData.task_type !== undefined && taskData.task_type !== 'slow' && existingTask.rows[0].task_type === 'slow') {
      // 如果从slow类型改为其他类型，将completion_percentage重置为0
      updateFields.push(`completion_percentage = $${paramIndex}`);
      params.push(0);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: '没有要更新的字段' });
    }

    params.push(id, userId);
    const query = `UPDATE tasks SET ${updateFields.join(', ')} 
                   WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} 
                   RETURNING *`;

    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('更新任务错误:', error);
    res.status(500).json({ error: '更新任务失败' });
  }
}

/**
 * 删除任务
 */
export async function deleteTask(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '任务不存在' });
    }

    res.json({ message: '任务已删除', task: result.rows[0] });
  } catch (error) {
    console.error('删除任务错误:', error);
    res.status(500).json({ error: '删除任务失败' });
  }
}

/**
 * 获取今日TODO（包括周期任务和非周期任务）
 */
export async function getTodayTodos(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!;
    const today = new Date().toISOString().split('T')[0];

    // 1. 获取所有未完成的短期任务（urgent类型）
    const urgentTasks = await pool.query(
      `SELECT * FROM tasks 
       WHERE user_id = $1 
       AND task_type = 'urgent'
       AND status NOT IN ('completed', 'cancelled')
       ORDER BY 
         CASE WHEN deadline::date = $2 THEN 0 ELSE 1 END,
         priority DESC, 
         created_at ASC`,
      [userId, today]
    );

    // 2. 获取进行中的周期任务（包括周期窗口内的进度）
    const periodicTasksResult = await pool.query(
      `SELECT pt.*, t.title, t.description, t.priority, t.quadrant, t.status as task_status
       FROM periodic_tasks pt
       JOIN tasks t ON pt.task_id = t.id
       WHERE t.user_id = $1
       AND t.status = 'in_progress'
       AND (pt.next_due_date IS NULL OR pt.next_due_date <= $2)
       ORDER BY pt.next_due_date ASC NULLS LAST, t.priority DESC`,
      [userId, today]
    );

    // 获取周期任务的统计信息
    const periodicTasksWithStats = await Promise.all(
      periodicTasksResult.rows.map(async (task) => {
        // 获取当前周期的统计
        const statsResult = await pool.query(
          `SELECT * FROM periodic_task_stats 
           WHERE periodic_task_id = $1 
           ORDER BY period_start DESC LIMIT 1`,
          [task.id]
        );

        return {
          ...task,
          current_stats: statsResult.rows[0] || null,
        };
      })
    );

    // 3. 获取长期任务（slow类型）和进行中的子项
    const slowTasks = await pool.query(
      `SELECT * FROM tasks 
       WHERE user_id = $1 
       AND task_type = 'slow'
       AND status NOT IN ('completed', 'cancelled')
       ORDER BY priority DESC, created_at ASC`,
      [userId]
    );

    // 获取每个长期任务的子任务
    const slowTasksWithSubtasks = await Promise.all(
      slowTasks.rows.map(async (task) => {
        // 获取进行中的子任务
        const subtasksResult = await pool.query(
          `SELECT * FROM subtasks 
           WHERE task_id = $1 
           AND status IN ('pending', 'in_progress')
           AND (end_date IS NULL OR end_date >= $2)
           ORDER BY order_index ASC, created_at ASC`,
          [task.id, today]
        );

        return {
          ...task,
          subtasks: subtasksResult.rows,
        };
      })
    );

    res.json({
      urgent_tasks: urgentTasks.rows,
      periodic_tasks: periodicTasksWithStats,
      slow_tasks: slowTasksWithSubtasks,
      date: today,
    });
  } catch (error) {
    console.error('获取今日TODO错误:', error);
    res.status(500).json({ error: '获取今日TODO失败' });
  }
}

/**
 * 获取任务统计信息
 */
export async function getTaskStats(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!;

    // 总任务数
    const totalResult = await pool.query(
      'SELECT COUNT(*) as total FROM tasks WHERE user_id = $1',
      [userId]
    );

    // 已完成任务数
    const completedResult = await pool.query(
      "SELECT COUNT(*) as completed FROM tasks WHERE user_id = $1 AND status = 'completed'",
      [userId]
    );

    // 按象限统计
    const quadrantResult = await pool.query(
      'SELECT quadrant, COUNT(*) as count FROM tasks WHERE user_id = $1 AND quadrant IS NOT NULL GROUP BY quadrant',
      [userId]
    );

    // 按类型统计
    const typeResult = await pool.query(
      'SELECT task_type, COUNT(*) as count FROM tasks WHERE user_id = $1 GROUP BY task_type',
      [userId]
    );

    // 平均完成度
    const avgProgressResult = await pool.query(
      'SELECT AVG(completion_percentage) as avg_progress FROM tasks WHERE user_id = $1',
      [userId]
    );

    const total = parseInt(totalResult.rows[0].total);
    const completed = parseInt(completedResult.rows[0].completed);
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    res.json({
      total,
      completed,
      completion_rate: Math.round(completionRate * 100) / 100,
      by_quadrant: quadrantResult.rows.reduce((acc: any, row: any) => {
        acc[row.quadrant] = parseInt(row.count);
        return acc;
      }, {}),
      by_type: typeResult.rows.reduce((acc: any, row: any) => {
        acc[row.task_type] = parseInt(row.count);
        return acc;
      }, {}),
      avg_progress: Math.round((avgProgressResult.rows[0].avg_progress || 0) * 100) / 100,
    });
  } catch (error) {
    console.error('获取统计信息错误:', error);
    res.status(500).json({ error: '获取统计信息失败' });
  }
}
