import { Response } from 'express';
import pool from '../db/connection';
import { AuthRequest } from '../middleware/auth';
import { CreatePeriodicTaskInput, PeriodType } from '../types/task';

// 缓存字段是否存在，避免每次都查询
let actualValueColumnExists: boolean | null = null;
let expectedValueColumnExists: boolean | null = null;

/**
 * 检查actual_value字段是否存在
 */
async function checkActualValueColumnExists(): Promise<boolean> {
  if (actualValueColumnExists !== null) {
    return actualValueColumnExists;
  }

  try {
    const result = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'periodic_task_stats' 
       AND column_name = 'actual_value'`
    );
    actualValueColumnExists = result.rows.length > 0;
    return actualValueColumnExists;
  } catch (error) {
    console.error('检查字段是否存在时出错:', error);
    return false;
  }
}

/**
 * 检查expected_value字段是否存在
 */
async function checkExpectedValueColumnExists(): Promise<boolean> {
  if (expectedValueColumnExists !== null) {
    return expectedValueColumnExists;
  }

  try {
    const result = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'periodic_task_stats' 
       AND column_name = 'expected_value'`
    );
    expectedValueColumnExists = result.rows.length > 0;
    return expectedValueColumnExists;
  } catch (error) {
    console.error('检查字段是否存在时出错:', error);
    return false;
  }
}

/**
 * 完成周期任务打卡
 */
export async function completePeriodicTask(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!;
    const { periodic_task_id, notes, completion_value, completion_date } = req.body;

    if (!periodic_task_id) {
      return res.status(400).json({ error: '周期任务ID为必填项' });
    }

    // 验证周期任务是否存在且属于当前用户
    const periodicTaskResult = await pool.query(
      `SELECT pt.*, t.user_id 
       FROM periodic_tasks pt
       JOIN tasks t ON pt.task_id = t.id
       WHERE pt.id = $1 AND t.user_id = $2`,
      [periodic_task_id, userId]
    );

    if (periodicTaskResult.rows.length === 0) {
      return res.status(404).json({ error: '周期任务不存在' });
    }

    const periodicTask = periodicTaskResult.rows[0];

    // 如果是数值型任务，验证completion_value
    if (periodicTask.completion_type === 'numeric' && !completion_value) {
      return res.status(400).json({ error: '数值型任务必须填写完成数值' });
    }

    // 使用指定的日期或当前日期
    const targetDate = completion_date || new Date().toISOString().split('T')[0];
    const targetDateObj = new Date(targetDate);

    // 记录完成
    const completionResult = await pool.query(
      `INSERT INTO task_completions (periodic_task_id, notes, completion_value, completion_date) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [periodic_task_id, notes || null, completion_value || null, targetDate]
    );

    // 更新周期任务的下次到期日期（基于完成日期计算）
    const nextDueDate = calculateNextDueDate(
      periodicTask.period_type,
      periodicTask.period_value,
      targetDateObj
    );

    await pool.query(
      'UPDATE periodic_tasks SET last_completed_at = CURRENT_TIMESTAMP, next_due_date = $1 WHERE id = $2',
      [nextDueDate, periodic_task_id]
    );

    // 更新统计信息
    await updatePeriodicStats(periodic_task_id, periodicTask.period_type, periodicTask.period_value);

    res.status(201).json({
      completion: completionResult.rows[0],
      next_due_date: nextDueDate,
    });
  } catch (error) {
    console.error('完成周期任务错误:', error);
    res.status(500).json({ error: '完成周期任务失败' });
  }
}

/**
 * 根据任务ID获取周期任务配置
 */
export async function getPeriodicTaskByTaskId(req: AuthRequest, res: Response) {
  try {
    const { taskId } = req.params;
    const userId = req.userId!;

    const result = await pool.query(
      `SELECT pt.*, t.title, t.description, t.priority, t.quadrant, t.status as task_status
       FROM periodic_tasks pt
       JOIN tasks t ON pt.task_id = t.id
       WHERE pt.task_id = $1 AND t.user_id = $2`,
      [taskId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '周期任务不存在' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('获取周期任务错误:', error);
    res.status(500).json({ error: '获取周期任务失败' });
  }
}

/**
 * 获取周期任务统计
 */
export async function getPeriodicTaskStats(req: AuthRequest, res: Response) {
  try {
    const { periodic_task_id } = req.params;
    const userId = req.userId!;
    const { period_start, period_end } = req.query;

    // 验证周期任务是否存在且属于当前用户
    const periodicTaskResult = await pool.query(
      `SELECT pt.*, t.user_id 
       FROM periodic_tasks pt
       JOIN tasks t ON pt.task_id = t.id
       WHERE pt.id = $1 AND t.user_id = $2`,
      [periodic_task_id, userId]
    );

    if (periodicTaskResult.rows.length === 0) {
      return res.status(404).json({ error: '周期任务不存在' });
    }

    let query = 'SELECT * FROM periodic_task_stats WHERE periodic_task_id = $1';
    const params: any[] = [periodic_task_id];

    if (period_start && period_end) {
      query += ' AND period_start >= $2 AND period_end <= $3';
      params.push(period_start, period_end);
    }

    query += ' ORDER BY period_start DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('获取周期任务统计错误:', error);
    res.status(500).json({ error: '获取周期任务统计失败' });
  }
}

/**
 * 获取即将到期的周期任务
 */
export async function getUpcomingPeriodicTasks(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!;
    const days = parseInt(req.query.days as string) || 7; // 默认查询未来7天

    // 验证days参数的有效性
    if (isNaN(days) || days < 0 || days > 365) {
      return res.status(400).json({ error: 'days参数必须在0-365之间' });
    }

    const result = await pool.query(
      `SELECT pt.*, t.title, t.description, t.priority, t.quadrant
       FROM periodic_tasks pt
       JOIN tasks t ON pt.task_id = t.id
       WHERE t.user_id = $1 
       AND (pt.next_due_date IS NULL OR pt.next_due_date <= CURRENT_DATE + INTERVAL '1 day' * $2)
       AND t.status != 'cancelled'
       ORDER BY pt.next_due_date ASC NULLS LAST`,
      [userId, days]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('获取即将到期任务错误:', error);
    res.status(500).json({ error: '获取即将到期任务失败' });
  }
}

/**
 * 创建周期任务配置
 */
export async function createPeriodicTask(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!;
    const periodicData: CreatePeriodicTaskInput = req.body;

    // 验证任务是否存在且属于当前用户
    const taskResult = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [periodicData.task_id, userId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: '任务不存在' });
    }

    // 验证任务类型必须是周期类型
    if (taskResult.rows[0].task_type !== 'periodic') {
      return res.status(400).json({ error: '任务类型必须是periodic' });
    }

    // 检查是否已存在周期任务配置
    const existingResult = await pool.query(
      'SELECT * FROM periodic_tasks WHERE task_id = $1',
      [periodicData.task_id]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: '该任务已配置周期任务，请使用更新接口' });
    }

    // 计算下次到期日期
    const nextDueDate = calculateNextDueDate(
      periodicData.period_type,
      periodicData.period_value,
      new Date()
    );

    const result = await pool.query(
      `INSERT INTO periodic_tasks (task_id, period_type, period_value, completion_type, target_value, unit, next_due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        periodicData.task_id,
        periodicData.period_type,
        periodicData.period_value || null,
        periodicData.completion_type || 'boolean',
        periodicData.target_value || null,
        periodicData.unit || null,
        nextDueDate,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('创建周期任务错误:', error);
    res.status(500).json({ error: '创建周期任务失败' });
  }
}

/**
 * 更新周期任务配置
 */
export async function updatePeriodicTask(req: AuthRequest, res: Response) {
  try {
    const { taskId } = req.params;
    const userId = req.userId!;
    const periodicData: Partial<CreatePeriodicTaskInput> = req.body;

    // 验证任务是否存在且属于当前用户
    const taskResult = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: '任务不存在' });
    }

    // 验证任务类型必须是周期类型
    if (taskResult.rows[0].task_type !== 'periodic') {
      return res.status(400).json({ error: '任务类型必须是periodic' });
    }

    // 查找现有的周期任务配置
    const existingResult = await pool.query(
      'SELECT * FROM periodic_tasks WHERE task_id = $1',
      [taskId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: '周期任务配置不存在' });
    }

    const existing = existingResult.rows[0];

    // 构建更新字段
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (periodicData.period_type !== undefined) {
      updateFields.push(`period_type = $${paramIndex}`);
      params.push(periodicData.period_type);
      paramIndex++;
    }
    if (periodicData.period_value !== undefined) {
      updateFields.push(`period_value = $${paramIndex}`);
      params.push(periodicData.period_value || null);
      paramIndex++;
    }
    if (periodicData.completion_type !== undefined) {
      updateFields.push(`completion_type = $${paramIndex}`);
      params.push(periodicData.completion_type);
      paramIndex++;
    }
    if (periodicData.target_value !== undefined) {
      updateFields.push(`target_value = $${paramIndex}`);
      // 如果target_value是undefined或null，设置为null；否则使用原值
      params.push(periodicData.target_value === undefined ? null : (periodicData.target_value || null));
      paramIndex++;
    }
    if (periodicData.unit !== undefined) {
      updateFields.push(`unit = $${paramIndex}`);
      // 如果unit是undefined或空字符串，设置为null；否则使用原值
      params.push(periodicData.unit === undefined || periodicData.unit === '' ? null : periodicData.unit);
      paramIndex++;
    }

    // 如果周期类型或周期值发生变化，重新计算下次到期日期
    if (periodicData.period_type !== undefined || periodicData.period_value !== undefined) {
      const newPeriodType = periodicData.period_type || existing.period_type;
      const newPeriodValue = periodicData.period_value !== undefined ? periodicData.period_value : existing.period_value;
      const nextDueDate = calculateNextDueDate(
        newPeriodType,
        newPeriodValue,
        existing.last_completed_at ? new Date(existing.last_completed_at) : new Date()
      );
      updateFields.push(`next_due_date = $${paramIndex}`);
      params.push(nextDueDate);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: '没有要更新的字段' });
    }

    params.push(taskId);
    const query = `UPDATE periodic_tasks SET ${updateFields.join(', ')} 
                   WHERE task_id = $${paramIndex} 
                   RETURNING *`;

    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('更新周期任务错误:', error);
    res.status(500).json({ error: '更新周期任务失败' });
  }
}

/**
 * 计算下次到期日期
 */
function calculateNextDueDate(
  periodType: PeriodType,
  periodValue: number | undefined,
  fromDate: Date
): string {
  const date = new Date(fromDate);

  switch (periodType) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'custom':
      if (periodValue) {
        date.setDate(date.getDate() + periodValue);
      } else {
        date.setDate(date.getDate() + 1);
      }
      break;
    default:
      date.setDate(date.getDate() + 1);
  }

  return date.toISOString().split('T')[0]; // 返回YYYY-MM-DD格式
}

/**
 * 根据指定日期重新计算该日期所在周期的统计
 */
async function recalculatePeriodicStatsForDate(
  periodicTaskId: number,
  targetDate: string,
  periodType: PeriodType,
  periodValue?: number
) {
  try {
    const date = new Date(targetDate);
    let periodStart: Date;
    let periodEnd: Date;

    // 根据周期类型计算统计周期
    switch (periodType) {
      case 'daily':
        periodStart = new Date(date);
        periodEnd = new Date(date);
        break;
      case 'weekly':
        // 该日期所在周的开始（周一）和结束（周日）
        const dayOfWeek = date.getDay();
        const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // 调整为周一
        periodStart = new Date(date.getFullYear(), date.getMonth(), diff);
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 6);
        break;
      case 'monthly':
        periodStart = new Date(date.getFullYear(), date.getMonth(), 1);
        periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        break;
      case 'custom':
        // 自定义周期：找到包含该日期的周期
        const customDays = periodValue || 1;
        // 简化处理：从该日期开始计算周期
        periodStart = new Date(date);
        periodEnd = new Date(date);
        periodEnd.setDate(periodEnd.getDate() + customDays - 1);
        break;
      default:
        periodStart = new Date(date);
        periodEnd = new Date(date);
    }

    // 计算预期完成次数
    let expectedCount = 1;
    const daysDiff = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    if (periodType === 'daily') {
      expectedCount = daysDiff;
    } else if (periodType === 'weekly') {
      expectedCount = 7;
    } else if (periodType === 'monthly') {
      expectedCount = daysDiff;
    } else if (periodType === 'custom' && periodValue) {
      expectedCount = periodValue;
    }

    // 重新计算实际完成次数和累计值
    const completions = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(completion_value), 0) as total_value 
       FROM task_completions 
       WHERE periodic_task_id = $1 
       AND COALESCE(completion_date, completed_at::date) >= $2 
       AND COALESCE(completion_date, completed_at::date) <= $3`,
      [periodicTaskId, periodStart.toISOString().split('T')[0], periodEnd.toISOString().split('T')[0]]
    );

    const actualCount = parseInt(completions.rows[0].count);
    const actualValue = parseFloat(completions.rows[0].total_value) || 0;

    // 获取周期任务信息（用于计算预期累计值）
    const periodicTaskInfo = await pool.query(
      'SELECT completion_type, target_value FROM periodic_tasks WHERE id = $1',
      [periodicTaskId]
    );

    const completionType = periodicTaskInfo.rows[0]?.completion_type || 'boolean';
    const targetValue = periodicTaskInfo.rows[0]?.target_value || null;

    // 计算预期累计值
    // 对于数值型任务：
    // - daily类型：target_value是每天的目标值，所以expected_value = target_value * expected_count（天数）
    // - weekly类型：target_value是每周的目标值，所以expected_value = target_value（不需要乘以次数）
    // - monthly类型：target_value是每月的目标值，所以expected_value = target_value（不需要乘以次数）
    // - custom类型：target_value是每个周期的目标值，所以expected_value = target_value（不需要乘以次数）
    let expectedValue = 0;
    if (completionType === 'numeric' && targetValue) {
      if (periodType === 'daily') {
        // 每天的目标值 × 天数
        expectedValue = targetValue * expectedCount;
      } else {
        // 每周/每月/自定义周期的目标值就是该周期的目标值
        expectedValue = targetValue;
      }
    }

    // 获取或创建统计记录
    const existing = await pool.query(
      `SELECT * FROM periodic_task_stats 
       WHERE periodic_task_id = $1 AND period_start = $2 AND period_end = $3`,
      [periodicTaskId, periodStart.toISOString().split('T')[0], periodEnd.toISOString().split('T')[0]]
    );

    const hasActualValueColumn = await checkActualValueColumnExists();
    const hasExpectedValueColumn = await checkExpectedValueColumnExists();

    if (existing.rows.length > 0) {
      // 更新现有记录
      const updateFields: string[] = [`actual_count = $1`];
      const params: any[] = [actualCount];
      let paramIndex = 2;

      if (hasActualValueColumn) {
        updateFields.push(`actual_value = $${paramIndex}`);
        params.push(actualValue);
        paramIndex++;
      }

      if (hasExpectedValueColumn) {
        updateFields.push(`expected_value = $${paramIndex}`);
        params.push(expectedValue);
        paramIndex++;
      }

      params.push(existing.rows[0].id);
      await pool.query(
        `UPDATE periodic_task_stats 
         SET ${updateFields.join(', ')} 
         WHERE id = $${paramIndex}`,
        params
      );
    } else {
      // 创建新记录
      const insertFields: string[] = [
        'periodic_task_id', 'period_start', 'period_end', 
        'expected_count', 'actual_count'
      ];
      const insertValues: string[] = [];
      const params: any[] = [
        periodicTaskId,
        periodStart.toISOString().split('T')[0],
        periodEnd.toISOString().split('T')[0],
        expectedCount,
        actualCount,
      ];
      let paramIndex = 6;

      if (hasActualValueColumn) {
        insertFields.push('actual_value');
        insertValues.push(`$${paramIndex}`);
        params.push(actualValue);
        paramIndex++;
      }

      if (hasExpectedValueColumn) {
        insertFields.push('expected_value');
        insertValues.push(`$${paramIndex}`);
        params.push(expectedValue);
        paramIndex++;
      }

      const placeholders = Array.from({ length: insertFields.length }, (_, i) => `$${i + 1}`).join(', ');
      await pool.query(
        `INSERT INTO periodic_task_stats (${insertFields.join(', ')})
         VALUES (${placeholders})`,
        params
      );
    }
  } catch (error) {
    console.error('重新计算周期任务统计错误:', error);
    // 不抛出错误，避免影响其他功能
  }
}

/**
 * 更新周期任务统计
 */
async function updatePeriodicStats(periodicTaskId: number, periodType: PeriodType, periodValue?: number) {
  try {
    const today = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    // 根据周期类型计算统计周期
    switch (periodType) {
      case 'daily':
        periodStart = new Date(today);
        periodEnd = new Date(today);
        break;
      case 'weekly':
        // 本周的开始（周一）和结束（周日）
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // 调整为周一
        periodStart = new Date(today.getFullYear(), today.getMonth(), diff);
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 6);
        break;
      case 'monthly':
        periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
        periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'custom':
        // 自定义周期：使用periodValue天作为一个周期
        const customDays = periodValue || 1;
        periodStart = new Date(today);
        periodEnd = new Date(today);
        periodEnd.setDate(periodEnd.getDate() + customDays - 1);
        break;
      default:
        periodStart = new Date(today);
        periodEnd = new Date(today);
    }

    // 计算预期完成次数（基于周期类型和实际天数）
    let expectedCount = 1;
    const daysDiff = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    if (periodType === 'daily') {
      expectedCount = daysDiff; // 每天1次
    } else if (periodType === 'weekly') {
      expectedCount = 7; // 每周7次（每天1次）
    } else if (periodType === 'monthly') {
      expectedCount = daysDiff; // 每月天数（每天1次）
    } else if (periodType === 'custom' && periodValue) {
      // 自定义周期：如果periodValue是N天，则预期N次（每天1次）
      expectedCount = periodValue;
    }

    // 获取或创建统计记录
    const existing = await pool.query(
      `SELECT * FROM periodic_task_stats 
       WHERE periodic_task_id = $1 AND period_start = $2 AND period_end = $3`,
      [periodicTaskId, periodStart.toISOString().split('T')[0], periodEnd.toISOString().split('T')[0]]
    );

    // 获取周期任务信息（用于计算预期累计值）
    const periodicTaskInfo = await pool.query(
      'SELECT completion_type, target_value FROM periodic_tasks WHERE id = $1',
      [periodicTaskId]
    );

    const completionType = periodicTaskInfo.rows[0]?.completion_type || 'boolean';
    const targetValue = periodicTaskInfo.rows[0]?.target_value || null;

    // 重新计算实际完成次数和累计值（基于所有打卡记录）
    const completions = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(completion_value), 0) as total_value 
       FROM task_completions 
       WHERE periodic_task_id = $1 
       AND COALESCE(completion_date, completed_at::date) >= $2 
       AND COALESCE(completion_date, completed_at::date) <= $3`,
      [periodicTaskId, periodStart.toISOString().split('T')[0], periodEnd.toISOString().split('T')[0]]
    );

    const actualCount = parseInt(completions.rows[0].count);
    const actualValue = parseFloat(completions.rows[0].total_value) || 0;

    // 计算预期累计值
    // 对于数值型任务：
    // - daily类型：target_value是每天的目标值，所以expected_value = target_value * expected_count（天数）
    // - weekly类型：target_value是每周的目标值，所以expected_value = target_value（不需要乘以次数）
    // - monthly类型：target_value是每月的目标值，所以expected_value = target_value（不需要乘以次数）
    // - custom类型：target_value是每个周期的目标值，所以expected_value = target_value（不需要乘以次数）
    let expectedValue = 0;
    if (completionType === 'numeric' && targetValue) {
      if (periodType === 'daily') {
        // 每天的目标值 × 天数
        expectedValue = targetValue * expectedCount;
      } else {
        // 每周/每月/自定义周期的目标值就是该周期的目标值
        expectedValue = targetValue;
      }
    }

    const hasActualValueColumn = await checkActualValueColumnExists();
    const hasExpectedValueColumn = await checkExpectedValueColumnExists();

    if (existing.rows.length > 0) {
      // 更新现有记录（重新计算，而不是简单+1）
      const updateFields: string[] = [`actual_count = $1`];
      const params: any[] = [actualCount];
      let paramIndex = 2;

      if (hasActualValueColumn) {
        updateFields.push(`actual_value = $${paramIndex}`);
        params.push(actualValue);
        paramIndex++;
      }

      if (hasExpectedValueColumn) {
        updateFields.push(`expected_value = $${paramIndex}`);
        params.push(expectedValue);
        paramIndex++;
      }

      params.push(existing.rows[0].id);
      await pool.query(
        `UPDATE periodic_task_stats 
         SET ${updateFields.join(', ')} 
         WHERE id = $${paramIndex}`,
        params
      );
    } else {
      // 创建新记录
      const insertFields: string[] = [
        'periodic_task_id', 'period_start', 'period_end', 
        'expected_count', 'actual_count'
      ];
      const insertValues: string[] = [];
      const params: any[] = [
        periodicTaskId,
        periodStart.toISOString().split('T')[0],
        periodEnd.toISOString().split('T')[0],
        expectedCount,
        actualCount,
      ];
      let paramIndex = 6;

      if (hasActualValueColumn) {
        insertFields.push('actual_value');
        insertValues.push(`$${paramIndex}`);
        params.push(actualValue);
        paramIndex++;
      }

      if (hasExpectedValueColumn) {
        insertFields.push('expected_value');
        insertValues.push(`$${paramIndex}`);
        params.push(expectedValue);
        paramIndex++;
      }

      const placeholders = Array.from({ length: insertFields.length }, (_, i) => `$${i + 1}`).join(', ');
      await pool.query(
        `INSERT INTO periodic_task_stats (${insertFields.join(', ')})
         VALUES (${placeholders})`,
        params
      );
    }
  } catch (error) {
    console.error('更新周期任务统计错误:', error);
    // 不抛出错误，避免影响打卡功能
  }
}

/**
 * 获取周期任务的打卡记录
 */
export async function getPeriodicTaskCompletions(req: AuthRequest, res: Response) {
  try {
    const { periodic_task_id } = req.params;
    const userId = req.userId!;

    // 验证周期任务是否存在且属于当前用户
    const periodicTaskResult = await pool.query(
      `SELECT pt.*, t.user_id 
       FROM periodic_tasks pt
       JOIN tasks t ON pt.task_id = t.id
       WHERE pt.id = $1 AND t.user_id = $2`,
      [periodic_task_id, userId]
    );

    if (periodicTaskResult.rows.length === 0) {
      return res.status(404).json({ error: '周期任务不存在' });
    }

    const result = await pool.query(
      `SELECT * FROM task_completions 
       WHERE periodic_task_id = $1 
       ORDER BY COALESCE(completion_date, completed_at::date) DESC, completed_at DESC`,
      [periodic_task_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('获取打卡记录错误:', error);
    res.status(500).json({ error: '获取打卡记录失败' });
  }
}

/**
 * 更新周期任务打卡记录
 */
export async function updatePeriodicTaskCompletion(req: AuthRequest, res: Response) {
  try {
    const { completion_id } = req.params;
    const userId = req.userId!;
    const { completion_value, completion_date, notes } = req.body;

    // 验证打卡记录是否存在且属于当前用户
    const completionResult = await pool.query(
      `SELECT tc.*, pt.task_id, t.user_id
       FROM task_completions tc
       JOIN periodic_tasks pt ON tc.periodic_task_id = pt.id
       JOIN tasks t ON pt.task_id = t.id
       WHERE tc.id = $1 AND t.user_id = $2`,
      [completion_id, userId]
    );

    if (completionResult.rows.length === 0) {
      return res.status(404).json({ error: '打卡记录不存在' });
    }

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (completion_value !== undefined) {
      updateFields.push(`completion_value = $${paramIndex}`);
      params.push(completion_value);
      paramIndex++;
    }
    if (completion_date !== undefined) {
      updateFields.push(`completion_date = $${paramIndex}`);
      params.push(completion_date);
      paramIndex++;
    }
    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`);
      params.push(notes);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: '没有要更新的字段' });
    }

    params.push(completion_id);
    const query = `UPDATE task_completions SET ${updateFields.join(', ')} 
                   WHERE id = $${paramIndex} RETURNING *`;

    const result = await pool.query(query, params);

    // 重新计算统计（如果日期改变了，需要重新计算旧周期和新周期的统计）
    const periodicTask = await pool.query(
      'SELECT * FROM periodic_tasks WHERE id = $1',
      [completionResult.rows[0].periodic_task_id]
    );
    
    if (periodicTask.rows.length > 0) {
      const oldCompletionDate = completionResult.rows[0].completion_date || 
        (completionResult.rows[0].completed_at ? completionResult.rows[0].completed_at.split('T')[0] : null);
      const newCompletionDate = completion_date || oldCompletionDate;
      
      // 如果日期改变了，需要重新计算两个周期
      if (completion_date !== undefined && oldCompletionDate && newCompletionDate !== oldCompletionDate) {
        // 重新计算旧周期
        await recalculatePeriodicStatsForDate(
          periodicTask.rows[0].id,
          oldCompletionDate,
          periodicTask.rows[0].period_type,
          periodicTask.rows[0].period_value
        );
        // 重新计算新周期
        await recalculatePeriodicStatsForDate(
          periodicTask.rows[0].id,
          newCompletionDate,
          periodicTask.rows[0].period_type,
          periodicTask.rows[0].period_value
        );
      } else {
        // 日期没变，只重新计算当前周期
        const targetDate = newCompletionDate || new Date().toISOString().split('T')[0];
        await recalculatePeriodicStatsForDate(
          periodicTask.rows[0].id,
          targetDate,
          periodicTask.rows[0].period_type,
          periodicTask.rows[0].period_value
        );
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('更新打卡记录错误:', error);
    res.status(500).json({ error: '更新打卡记录失败' });
  }
}

/**
 * 删除周期任务打卡记录
 */
export async function deletePeriodicTaskCompletion(req: AuthRequest, res: Response) {
  try {
    const { completion_id } = req.params;
    const userId = req.userId!;

    // 验证打卡记录是否存在且属于当前用户
    const completionResult = await pool.query(
      `SELECT tc.*, pt.task_id, t.user_id
       FROM task_completions tc
       JOIN periodic_tasks pt ON tc.periodic_task_id = pt.id
       JOIN tasks t ON pt.task_id = t.id
       WHERE tc.id = $1 AND t.user_id = $2`,
      [completion_id, userId]
    );

    if (completionResult.rows.length === 0) {
      return res.status(404).json({ error: '打卡记录不存在' });
    }

    const periodicTaskId = completionResult.rows[0].periodic_task_id;
    const oldCompletionDate = completionResult.rows[0].completion_date || 
      (completionResult.rows[0].completed_at ? completionResult.rows[0].completed_at.split('T')[0] : null);

    // 先获取周期任务信息，以便重新计算统计
    const periodicTask = await pool.query(
      'SELECT * FROM periodic_tasks WHERE id = $1',
      [periodicTaskId]
    );

    // 删除打卡记录
    await pool.query('DELETE FROM task_completions WHERE id = $1', [completion_id]);

    // 重新计算所有相关周期的统计（如果删除的打卡记录有日期，重新计算该日期所在的周期）
    if (periodicTask.rows.length > 0 && oldCompletionDate) {
      await recalculatePeriodicStatsForDate(
        periodicTaskId,
        oldCompletionDate,
        periodicTask.rows[0].period_type,
        periodicTask.rows[0].period_value
      );
    } else if (periodicTask.rows.length > 0) {
      // 如果没有日期，重新计算当前周期的统计
      await updatePeriodicStats(periodicTaskId, periodicTask.rows[0].period_type, periodicTask.rows[0].period_value);
    }

    res.json({ message: '打卡记录已删除' });
  } catch (error) {
    console.error('删除打卡记录错误:', error);
    res.status(500).json({ error: '删除打卡记录失败' });
  }
}
