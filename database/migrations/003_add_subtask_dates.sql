-- 为子任务添加起止时间字段
ALTER TABLE subtasks 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_subtasks_start_date ON subtasks(start_date);
CREATE INDEX IF NOT EXISTS idx_subtasks_end_date ON subtasks(end_date);
