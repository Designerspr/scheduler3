import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskProgress,
  PeriodicTask,
  TaskStats,
  Subtask,
  CreateSubtaskInput,
  UpdateSubtaskInput,
  PeriodicTaskStats,
  TodayTodos,
  TaskCompletion,
} from '../types/task';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器：添加Token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('api_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器：错误处理
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token无效，清除本地存储
          localStorage.removeItem('api_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // 设置Token
  setToken(token: string) {
    localStorage.setItem('api_token', token);
  }

  // 获取Token
  getToken(): string | null {
    return localStorage.getItem('api_token');
  }

  // 清除Token
  clearToken() {
    localStorage.removeItem('api_token');
  }

  // 任务相关API
  async getTasks(params?: {
    quadrant?: number;
    type?: string;
    date?: string;
    status?: string;
  }): Promise<Task[]> {
    const response = await this.client.get('/tasks', { params });
    return response.data;
  }

  async getTaskById(id: number): Promise<Task> {
    const response = await this.client.get(`/tasks/${id}`);
    return response.data;
  }

  async createTask(task: CreateTaskInput): Promise<Task> {
    const response = await this.client.post('/tasks', task);
    return response.data;
  }

  async updateTask(id: number, task: UpdateTaskInput): Promise<Task> {
    const response = await this.client.put(`/tasks/${id}`, task);
    return response.data;
  }

  async deleteTask(id: number): Promise<void> {
    await this.client.delete(`/tasks/${id}`);
  }

  async getTaskStats(): Promise<TaskStats> {
    const response = await this.client.get('/tasks/stats');
    return response.data;
  }

  async getTasksByQuadrant(quadrant: number): Promise<Task[]> {
    const response = await this.client.get(`/tasks/quadrant/${quadrant}`);
    return response.data;
  }

  async getTasksByType(type: string): Promise<Task[]> {
    const response = await this.client.get(`/tasks/type/${type}`);
    return response.data;
  }

  async getTasksByDate(date: string): Promise<Task[]> {
    const response = await this.client.get(`/tasks/date/${date}`);
    return response.data;
  }

  // 进度相关API
  async createProgress(progress: {
    task_id: number;
    date: string;
    progress_value: number;
    notes?: string;
  }): Promise<TaskProgress> {
    const response = await this.client.post('/progress', progress);
    return response.data;
  }

  async getTaskProgress(taskId: number): Promise<TaskProgress[]> {
    const response = await this.client.get(`/progress/${taskId}`);
    return response.data;
  }

  async getGanttData(taskId: number): Promise<any> {
    const response = await this.client.get(`/progress/gantt/${taskId}`);
    return response.data;
  }

  // 周期任务相关API
  async completePeriodicTask(
    periodic_task_id: number,
    notes?: string,
    completion_value?: number,
    completion_date?: string
  ): Promise<any> {
    const response = await this.client.post('/periodic/complete', {
      periodic_task_id,
      notes,
      completion_value,
      completion_date,
    });
    return response.data;
  }

  async getUpcomingPeriodicTasks(days?: number): Promise<PeriodicTask[]> {
    const response = await this.client.get('/periodic/upcoming', {
      params: { days },
    });
    return response.data;
  }

  async createPeriodicTask(data: {
    task_id: number;
    period_type: string;
    period_value?: number;
    completion_type?: 'boolean' | 'numeric';
    target_value?: number;
    unit?: string;
  }): Promise<PeriodicTask> {
    const response = await this.client.post('/periodic', data);
    return response.data;
  }

  // 更新周期任务配置
  async updatePeriodicTask(
    taskId: number,
    data: {
      period_type?: string;
      period_value?: number;
      completion_type?: 'boolean' | 'numeric';
      target_value?: number;
      unit?: string;
    }
  ): Promise<PeriodicTask> {
    const response = await this.client.put(`/periodic/task/${taskId}`, data);
    return response.data;
  }

  // AI相关API
  async parseNaturalLanguage(input: string): Promise<{ tasks: CreateTaskInput[] }> {
    const response = await this.client.post('/ai/parse', { input });
    return response.data;
  }

  async summarizeTasks(): Promise<{ summary: string }> {
    const response = await this.client.post('/ai/summarize');
    return response.data;
  }

  // 今日TODO相关API
  async getTodayTodos(): Promise<TodayTodos> {
    const response = await this.client.get('/tasks/today');
    return response.data;
  }

  // 子任务相关API
  async getSubtasks(taskId: number): Promise<Subtask[]> {
    const response = await this.client.get(`/subtasks/${taskId}`);
    return response.data;
  }

  async createSubtask(taskId: number, subtask: CreateSubtaskInput): Promise<Subtask> {
    const response = await this.client.post(`/subtasks/${taskId}`, subtask);
    return response.data;
  }

  async updateSubtask(
    taskId: number,
    subtaskId: number,
    subtask: UpdateSubtaskInput
  ): Promise<Subtask> {
    const response = await this.client.put(`/subtasks/${taskId}/${subtaskId}`, subtask);
    return response.data;
  }

  async deleteSubtask(taskId: number, subtaskId: number): Promise<void> {
    await this.client.delete(`/subtasks/${taskId}/${subtaskId}`);
  }

  // 周期任务统计API
  async getPeriodicTaskStats(
    periodicTaskId: number,
    periodStart?: string,
    periodEnd?: string
  ): Promise<PeriodicTaskStats[]> {
    const response = await this.client.get(`/periodic/${periodicTaskId}/stats`, {
      params: { period_start: periodStart, period_end: periodEnd },
    });
    return response.data;
  }

  // 根据任务ID获取周期任务配置
  async getPeriodicTaskByTaskId(taskId: number): Promise<PeriodicTask & { title?: string; description?: string }> {
    const response = await this.client.get(`/periodic/task/${taskId}`);
    return response.data;
  }

  // 获取周期任务打卡记录
  async getPeriodicTaskCompletions(periodicTaskId: number): Promise<TaskCompletion[]> {
    const response = await this.client.get(`/periodic/${periodicTaskId}/completions`);
    return response.data;
  }

  // 更新周期任务打卡记录
  async updatePeriodicTaskCompletion(
    completionId: number,
    data: { completion_value?: number; completion_date?: string; notes?: string }
  ): Promise<TaskCompletion> {
    const response = await this.client.put(`/periodic/completions/${completionId}`, data);
    return response.data;
  }

  // 删除周期任务打卡记录
  async deletePeriodicTaskCompletion(completionId: number): Promise<void> {
    await this.client.delete(`/periodic/completions/${completionId}`);
  }

  // 归档任务API
  async getArchivedTasks(): Promise<Task[]> {
    const response = await this.client.get('/tasks', { params: { archived: 'true' } });
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;
