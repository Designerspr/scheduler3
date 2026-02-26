-- 为周期任务统计表添加累计值字段（用于数值型任务）
ALTER TABLE periodic_task_stats 
ADD COLUMN IF NOT EXISTS actual_value NUMERIC(10, 2) DEFAULT 0; -- 实际累计值（数值型任务）

-- 创建索引（如果需要）
-- 注意：由于actual_value是数值字段，通常不需要单独索引
