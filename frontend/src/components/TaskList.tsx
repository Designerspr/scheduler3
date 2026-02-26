import { useEffect, useState } from 'react';
import TaskCard from './TaskCard';
import apiService from '../services/api';
import type { Task } from '../types/task';

interface TaskListProps {
  filter?: {
    quadrant?: number;
    type?: string;
    date?: string;
    status?: string;
  };
}

export default function TaskList({ filter }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTasks();
  }, [filter]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await apiService.getTasks(filter);
      setTasks(data);
    } catch (err) {
      setError('加载任务失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadTasks}
          className="text-blue-600 hover:text-blue-700"
        >
          重试
        </button>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">没有找到任务</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}
