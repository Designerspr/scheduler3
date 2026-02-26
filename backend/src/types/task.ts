export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'suspended';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskType = 'urgent' | 'slow' | 'periodic';
export type Quadrant = 1 | 2 | 3 | 4;
export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface Task {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  quadrant?: Quadrant;
  task_type: TaskType;
  deadline?: string; // ISO date string
  completion_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface TaskProgress {
  id: number;
  task_id: number;
  date: string; // ISO date string
  progress_value: number;
  notes?: string;
  created_at: string;
}

export interface PeriodicTask {
  id: number;
  task_id: number;
  period_type: PeriodType;
  period_value?: number; // 自定义周期数值
  completion_type?: 'boolean' | 'numeric'; // 完成类型：布尔型或数值型
  target_value?: number; // 目标值（数值型任务）
  unit?: string; // 单位（如：公里、次、分钟等）
  last_completed_at?: string;
  next_due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskCompletion {
  id: number;
  periodic_task_id: number;
  completed_at: string;
  completion_value?: number; // 完成时的数值（数值型任务）
  completion_date?: string; // 完成日期（用于回溯）
  notes?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  quadrant?: Quadrant;
  task_type: TaskType;
  deadline?: string;
  completion_percentage?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  quadrant?: Quadrant;
  task_type?: TaskType;
  deadline?: string;
  completion_percentage?: number;
}

export interface CreateProgressInput {
  task_id: number;
  date: string;
  progress_value: number;
  notes?: string;
}

export interface CreatePeriodicTaskInput {
  task_id: number;
  period_type: PeriodType;
  period_value?: number;
  completion_type?: 'boolean' | 'numeric';
  target_value?: number;
  unit?: string;
}

export interface Subtask {
  id: number;
  task_id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags?: string[];
  order_index: number;
  start_date?: string; // ISO date string
  end_date?: string; // ISO date string
  created_at: string;
  updated_at: string;
}

export interface CreateSubtaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  tags?: string[];
  order_index?: number;
  start_date?: string;
  end_date?: string;
}

export interface UpdateSubtaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];
  order_index?: number;
  start_date?: string;
  end_date?: string;
}

export interface PeriodicTaskStats {
  id: number;
  periodic_task_id: number;
  period_start: string;
  period_end: string;
  expected_count: number;
  actual_count: number;
  expected_value?: number; // 预期累计值（数值型任务）
  actual_value?: number; // 实际累计值（数值型任务）
  created_at: string;
}
