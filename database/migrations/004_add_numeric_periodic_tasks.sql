-- 为周期任务添加数值累计型支持
ALTER TABLE periodic_tasks 
ADD COLUMN IF NOT EXISTS completion_type VARCHAR(50) DEFAULT 'boolean' CHECK (completion_type IN ('boolean', 'numeric')),
ADD COLUMN IF NOT EXISTS target_value NUMERIC(10, 2), -- 目标值（如每天5公里）
ADD COLUMN IF NOT EXISTS unit VARCHAR(50); -- 单位（如：公里、次、分钟等）

-- 为周期任务完成记录添加数值字段
ALTER TABLE task_completions
ADD COLUMN IF NOT EXISTS completion_value NUMERIC(10, 2), -- 完成时的数值
ADD COLUMN IF NOT EXISTS completion_date DATE; -- 完成日期（用于回溯）

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_task_completions_completion_date ON task_completions(completion_date);
CREATE INDEX IF NOT EXISTS idx_task_completions_periodic_task_date ON task_completions(periodic_task_id, completion_date);
