import { useEffect, useState } from 'react';
import apiService from '../services/api';
import AISummary from '../components/AISummary';
import type { TaskStats, PeriodicTask, PeriodicTaskStats } from '../types/task';

export default function StatsPage() {
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [periodicTasks, setPeriodicTasks] = useState<(PeriodicTask & { title?: string })[]>([]);
  const [periodicStats, setPeriodicStats] = useState<Record<number, PeriodicTaskStats[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [statsData, periodicData] = await Promise.all([
        apiService.getTaskStats(),
        apiService.getUpcomingPeriodicTasks(365), // 获取所有周期任务
      ]);
      setStats(statsData);
      setPeriodicTasks(periodicData);

      // 加载每个周期任务的统计
      const statsMap: Record<number, PeriodicTaskStats[]> = {};
      for (const task of periodicData) {
        try {
          const taskStats = await apiService.getPeriodicTaskStats(task.id);
          statsMap[task.id] = taskStats;
        } catch (error) {
          console.error(`加载周期任务 ${task.id} 统计失败:`, error);
        }
      }
      setPeriodicStats(statsMap);
    } catch (error) {
      console.error('加载统计失败:', error);
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

  if (!stats) {
    return <div className="text-center py-12 text-gray-500">无法加载统计信息</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">统计信息</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">总任务数</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">已完成</h3>
          <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">完成率</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.completion_rate.toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">按象限分布</h3>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((quadrant) => (
              <div key={quadrant} className="flex justify-between items-center">
                <span>象限{quadrant}</span>
                <span className="font-semibold">{stats.by_quadrant[quadrant] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">按类型分布</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span>急类型</span>
              <span className="font-semibold">{stats.by_type.urgent || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>慢类型</span>
              <span className="font-semibold">{stats.by_type.slow || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>周期类型</span>
              <span className="font-semibold">{stats.by_type.periodic || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">平均完成度</h3>
        <p className="text-3xl font-bold text-gray-900">{stats.avg_progress.toFixed(1)}%</p>
      </div>

      {/* 周期任务统计 */}
      {periodicTasks.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">周期任务完成情况</h3>
          <div className="space-y-4">
            {periodicTasks.map((task) => {
              const taskStats = periodicStats[task.id] || [];
              const latestStat = taskStats[0]; // 最新的统计
              // 对于数值型任务，使用累计值计算；对于布尔型任务，使用次数计算
              const completionRate = latestStat
                ? task.completion_type === 'numeric' && latestStat.expected_value && latestStat.expected_value > 0
                  ? ((latestStat.actual_value || 0) / latestStat.expected_value) * 100
                  : latestStat.expected_count > 0
                  ? (latestStat.actual_count / latestStat.expected_count) * 100
                  : 0
                : 0;

              return (
                <div key={task.id} className="border-b border-gray-200 pb-4 last:border-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {task.title || '周期任务'}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {task.period_type === 'daily'
                          ? '每天'
                          : task.period_type === 'weekly'
                          ? '每周'
                          : task.period_type === 'monthly'
                          ? '每月'
                          : `每${task.period_value}天`}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-blue-600">
                      {completionRate.toFixed(0)}%
                    </span>
                  </div>
                  {latestStat && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>
                          {task.completion_type === 'numeric' && latestStat.expected_value
                            ? `完成: ${latestStat.actual_value || 0} / ${latestStat.expected_value} ${task.unit || ''}`
                            : `完成: ${latestStat.actual_count} / ${latestStat.expected_count}`}
                        </span>
                        <span>
                          {latestStat.period_start} ~ {latestStat.period_end}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${Math.min(completionRate, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AISummary />
    </div>
  );
}
