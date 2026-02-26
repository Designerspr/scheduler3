-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  api_token VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 任务主表
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  quadrant INTEGER CHECK (quadrant IN (1, 2, 3, 4)), -- 1:重要紧急, 2:重要不紧急, 3:不重要紧急, 4:不重要不紧急
  task_type VARCHAR(50) NOT NULL CHECK (task_type IN ('urgent', 'slow', 'periodic')),
  deadline TIMESTAMP, -- DDL，用于急类型任务
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 慢类型任务进度跟踪表
CREATE TABLE IF NOT EXISTS task_progress (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  progress_value INTEGER DEFAULT 0 CHECK (progress_value >= 0 AND progress_value <= 100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, date)
);

-- 周期任务配置表
CREATE TABLE IF NOT EXISTS periodic_tasks (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  period_type VARCHAR(50) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'custom')),
  period_value INTEGER, -- 自定义周期数值（如每3天、每2周等）
  last_completed_at TIMESTAMP,
  next_due_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 周期任务完成记录表
CREATE TABLE IF NOT EXISTS task_completions (
  id SERIAL PRIMARY KEY,
  periodic_task_id INTEGER NOT NULL REFERENCES periodic_tasks(id) ON DELETE CASCADE,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_quadrant ON tasks(quadrant);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_task_progress_task_id ON task_progress(task_id);
CREATE INDEX IF NOT EXISTS idx_task_progress_date ON task_progress(date);
CREATE INDEX IF NOT EXISTS idx_periodic_tasks_task_id ON periodic_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_periodic_tasks_next_due_date ON periodic_tasks(next_due_date);
CREATE INDEX IF NOT EXISTS idx_task_completions_periodic_task_id ON task_completions(periodic_task_id);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 为tasks表创建更新时间触发器（如果不存在）
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 为periodic_tasks表创建更新时间触发器（如果不存在）
DROP TRIGGER IF EXISTS update_periodic_tasks_updated_at ON periodic_tasks;
CREATE TRIGGER update_periodic_tasks_updated_at BEFORE UPDATE ON periodic_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
