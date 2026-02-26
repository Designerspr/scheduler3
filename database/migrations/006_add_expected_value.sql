-- 为周期任务统计表添加预期累计值字段（用于数值型任务）
ALTER TABLE periodic_task_stats 
ADD COLUMN IF NOT EXISTS expected_value NUMERIC(10, 2) DEFAULT 0; -- 预期累计值（数值型任务：target_value * expected_count）
