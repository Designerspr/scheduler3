import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/api';
import type { Task } from '../types/task';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns';

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, [currentDate]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const allTasks = await apiService.getTasks({ archived: 'false' });
      setTasks(allTasks);
    } catch (error) {
      console.error('加载任务失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // 获取某一天的任务
  const getTasksForDate = (date: Date): Task[] => {
    return tasks.filter((task) => {
      if (!task.deadline) return false;
      return isSameDay(new Date(task.deadline), date);
    });
  };

  // 获取进行中的任务（用于颜色标记）
  const getInProgressTasks = (): Task[] => {
    return tasks.filter((task) => task.status === 'in_progress' && task.task_type !== 'periodic');
  };

  const inProgressTasks = getInProgressTasks();
  const taskColors: Record<number, string> = {};
  inProgressTasks.forEach((task, index) => {
    // 使用高级灰色系，每个任务不同深浅
    const grayShades = [
      'bg-gray-200',
      'bg-gray-300',
      'bg-gray-400',
      'bg-slate-200',
      'bg-slate-300',
      'bg-zinc-200',
      'bg-zinc-300',
      'bg-neutral-200',
      'bg-neutral-300',
      'bg-stone-200',
    ];
    taskColors[task.id] = grayShades[index % grayShades.length];
  });

  const getTaskColor = (taskId: number): string => {
    return taskColors[taskId] || 'bg-gray-200';
  };

  // 获取星期几的中文
  const getWeekDayName = (day: number): string => {
    const names = ['日', '一', '二', '三', '四', '五', '六'];
    return names[day];
  };

  // 填充月初空白
  const firstDayOfWeek = monthStart.getDay();
  const emptyDays = Array(firstDayOfWeek).fill(null);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">日历视图</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            上个月
          </button>
          <span className="text-lg font-semibold text-gray-700">
            {format(currentDate, 'yyyy年MM月')}
          </span>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            下个月
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            今天
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* 星期标题 */}
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
            <div key={day} className="p-3 text-center font-semibold text-gray-700">
              {day}
            </div>
          ))}
        </div>

        {/* 日历网格 */}
        <div className="grid grid-cols-7">
          {/* 月初空白 */}
          {emptyDays.map((_, index) => (
            <div key={`empty-${index}`} className="min-h-[100px] border-r border-b border-gray-200" />
          ))}

          {/* 日期 */}
          {days.map((day) => {
            const dayTasks = getTasksForDate(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentDate);

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[100px] border-r border-b border-gray-200 p-2 ${
                  isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                } ${isToday ? 'bg-blue-50' : ''}`}
              >
                <div
                  className={`text-sm font-medium mb-1 ${
                    isToday ? 'text-blue-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map((task) => (
                    <Link
                      key={task.id}
                      to={`/tasks/${task.id}`}
                      className={`block px-2 py-1 rounded text-xs truncate ${getTaskColor(task.id)} hover:opacity-80`}
                      title={task.title}
                    >
                      {task.deadline && (
                        <span className="font-medium">
                          {format(new Date(task.deadline), 'HH:mm')}
                        </span>
                      )}{' '}
                      {task.title}
                    </Link>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-gray-500 px-2">
                      +{dayTasks.length - 3} 更多
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 图例 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">图例</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-50 rounded"></div>
            <span className="text-gray-600">今天</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 rounded"></div>
            <span className="text-gray-600">进行中的任务</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
            <span className="text-gray-600">其他日期</span>
          </div>
        </div>
      </div>
    </div>
  );
}
