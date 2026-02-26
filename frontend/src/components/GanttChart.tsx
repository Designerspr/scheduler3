import { useEffect, useState } from 'react';
import apiService from '../services/api';
import type { TaskProgress } from '../types/task';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';

interface GanttChartProps {
  taskId: number;
}

export default function GanttChart({ taskId }: GanttChartProps) {
  const [progress, setProgress] = useState<TaskProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, [taskId]);

  const loadProgress = async () => {
    try {
      setLoading(true);
      const data = await apiService.getTaskProgress(taskId);
      setProgress(data);
    } catch (error) {
      console.error('加载进度失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-gray-500">加载中...</div>;
  }

  // 获取最近4周的数据
  const today = new Date();
  const weeks = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = startOfWeek(new Date(today.getTime() - i * 7 * 24 * 60 * 60 * 1000));
    const weekEnd = endOfWeek(weekStart);
    weeks.push({ start: weekStart, end: weekEnd });
  }

  const getProgressForDate = (date: Date): number => {
    const progressEntry = progress.find((p) => isSameDay(new Date(p.date), date));
    return progressEntry?.progress_value || 0;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">进度甘特图（最近4周）</h3>
      
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {weeks.map((week, weekIndex) => {
            const days = eachDayOfInterval({ start: week.start, end: week.end });
            
            return (
              <div key={weekIndex} className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  第{weekIndex + 1}周 ({format(week.start, 'MM/dd')} - {format(week.end, 'MM/dd')})
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {days.map((day, dayIndex) => {
                    const progressValue = getProgressForDate(day);
                    const isToday = isSameDay(day, today);
                    
                    return (
                      <div
                        key={dayIndex}
                        className={`border rounded p-2 ${
                          isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="text-xs text-gray-600 mb-1">
                          {format(day, 'MM/dd')}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${progressValue}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500">{progressValue}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
