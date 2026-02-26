import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/api';
import type { Task } from '../types/task';
import TaskCard from '../components/TaskCard';
import { format } from 'date-fns';

export default function ArchivePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArchivedTasks();
  }, []);

  const loadArchivedTasks = async () => {
    try {
      setLoading(true);
      const data = await apiService.getArchivedTasks();
      setTasks(data);
    } catch (error) {
      console.error('加载归档任务失败:', error);
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

  // 按完成时间分组
  const groupedTasks = tasks.reduce((acc, task) => {
    const date = task.updated_at.split('T')[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const sortedDates = Object.keys(groupedTasks).sort((a, b) => b.localeCompare(a));

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">已完成任务归档</h2>
          <p className="text-sm text-gray-500 mt-1">共 {tasks.length} 项已完成任务</p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">暂无已完成的任务</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">
                {format(new Date(date), 'yyyy年MM月dd日')} ({groupedTasks[date].length} 项)
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedTasks[date].map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
