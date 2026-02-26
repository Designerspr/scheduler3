import { useEffect, useState } from 'react';
import apiService from '../services/api';
import PeriodicTaskCard from '../components/PeriodicTaskCard';
import type { PeriodicTask } from '../types/task';

export default function PeriodicTasksPage() {
  const [tasks, setTasks] = useState<(PeriodicTask & { title?: string; description?: string })[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await apiService.getUpcomingPeriodicTasks(30);
      setTasks(data);
    } catch (error) {
      console.error('加载周期任务失败:', error);
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

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">周期任务</h2>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">还没有周期任务</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <PeriodicTaskCard
              key={task.id}
              periodicTask={task}
              onComplete={loadTasks}
            />
          ))}
        </div>
      )}
    </div>
  );
}
