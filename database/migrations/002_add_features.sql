-- 添加挂起状态到任务状态
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'suspended'));

-- 子任务表（用于长期事项的子TODO）
CREATE TABLE IF NOT EXISTS subtasks (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'suspended')),
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  tags TEXT[], -- 简单标签数组
  order_index INTEGER DEFAULT 0, -- 排序索引
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 周期任务统计表（用于跟踪周期任务的完成情况）
CREATE TABLE IF NOT EXISTS periodic_task_stats (
  id SERIAL PRIMARY KEY,
  periodic_task_id INTEGER NOT NULL REFERENCES periodic_tasks(id) ON DELETE CASCADE,
  period_start DATE NOT NULL, -- 统计周期开始日期
  period_end DATE NOT NULL, -- 统计周期结束日期
  expected_count INTEGER DEFAULT 0, -- 预期完成次数
  actual_count INTEGER DEFAULT 0, -- 实际完成次数
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(periodic_task_id, period_start, period_end)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_status ON subtasks(status);
CREATE INDEX IF NOT EXISTS idx_periodic_task_stats_periodic_task_id ON periodic_task_stats(periodic_task_id);
CREATE INDEX IF NOT EXISTS idx_periodic_task_stats_period ON periodic_task_stats(period_start, period_end);

-- 为subtasks表创建更新时间触发器（如果不存在）
DROP TRIGGER IF EXISTS update_subtasks_updated_at ON subtasks;
CREATE TRIGGER update_subtasks_updated_at BEFORE UPDATE ON subtasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
