import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/api';
import type { TodayTodos, Task, Subtask, PeriodicTask } from '../types/task';
import { format } from 'date-fns';
import PeriodicTaskCompleteDialog from '../components/PeriodicTaskCompleteDialog';

export default function TodayPage() {
  const [todos, setTodos] = useState<TodayTodos | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'periodic'>('today');
  const [completingTask, setCompletingTask] = useState<PeriodicTask & { title?: string; description?: string } | null>(null);

  useEffect(() => {
    loadTodayTodos();
  }, []);

  const loadTodayTodos = async () => {
    try {
      setLoading(true);
      const data = await apiService.getTodayTodos();
      setTodos(data);
    } catch (error) {
      console.error('加载今日TODO失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompletePeriodic = (task: PeriodicTask & { title?: string; description?: string }) => {
    setCompletingTask(task);
  };

  const handleCompleteSuccess = async () => {
    await loadTodayTodos();
    setCompletingTask(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!todos) {
    return <div className="text-center py-12 text-gray-500">无法加载今日TODO</div>;
  }

  const totalCount =
    todos.urgent_tasks.length +
    todos.periodic_tasks.length +
    todos.slow_tasks.reduce((sum, task) => sum + (task.subtasks?.length || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">今日TODO</h2>
          <p className="text-sm text-gray-500 mt-1">
            {format(new Date(todos.date), 'yyyy年MM月dd日')} · 共 {totalCount} 项
          </p>
        </div>
        <button
          onClick={loadTodayTodos}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
        >
          刷新
        </button>
      </div>

      {/* 选项卡 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('today')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'today'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            今日任务
          </button>
          <button
            onClick={() => setActiveTab('periodic')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'periodic'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            周期任务 ({todos.periodic_tasks.length})
          </button>
        </nav>
      </div>

      {/* 周期任务选项卡内容 */}
      {activeTab === 'periodic' && (
        <div>
          {todos.periodic_tasks.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">暂无周期任务</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todos.periodic_tasks.map((task) => {
                const stats = task.current_stats;
                // 对于数值型任务，使用累计值计算；对于布尔型任务，使用次数计算
                const completionRate = stats
                  ? task.completion_type === 'numeric' && stats.expected_value && stats.expected_value > 0
                    ? (stats.actual_value || 0) / stats.expected_value * 100
                    : stats.expected_count > 0
                    ? (stats.actual_count / stats.expected_count) * 100
                    : 0
                  : 0;

                return (
                  <div
                    key={task.id}
                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <Link
                          to={`/tasks/${task.task_id}/periodic`}
                          className="hover:text-blue-600"
                        >
                          <h4 className="font-semibold text-gray-900">
                            {task.title || '周期任务'}
                          </h4>
                        </Link>
                        {task.description && (
                          <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {task.period_type === 'daily'
                              ? '每天'
                              : task.period_type === 'weekly'
                              ? '每周'
                              : task.period_type === 'monthly'
                              ? '每月'
                              : `每${task.period_value}天`}
                          </span>
                          {task.completion_type === 'numeric' && task.target_value && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                              目标: {task.target_value} {task.unit || ''}
                            </span>
                          )}
                          {task.next_due_date && (
                            <span className="text-xs text-gray-500">
                              到期: {format(new Date(task.next_due_date), 'yyyy-MM-dd')}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCompletePeriodic(task)}
                        className="ml-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                      >
                        打卡
                      </button>
                    </div>

                    {/* 周期窗口内的进度 */}
                    {stats && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>
                            当前周期: {stats.period_start} ~ {stats.period_end}
                          </span>
                          <span>
                            {task.completion_type === 'numeric' && stats.expected_value
                              ? `完成: ${stats.actual_value || 0} / ${stats.expected_value} ${task.unit || ''} (${completionRate.toFixed(0)}%)`
                              : `完成: ${stats.actual_count} / ${stats.expected_count} (${completionRate.toFixed(0)}%)`}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${Math.min(completionRate, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 今日任务选项卡内容 */}
      {activeTab === 'today' && (
        <>

      {/* 未完成的短期任务 */}
      {todos.urgent_tasks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            未完成的短期任务 ({todos.urgent_tasks.length})
          </h3>
          <div className="space-y-2">
            {todos.urgent_tasks.map((task) => (
              <Link
                key={task.id}
                to={`/tasks/${task.id}`}
                className="block bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{task.title}</h4>
                    {task.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          task.priority === 'high'
                            ? 'bg-red-100 text-red-800'
                            : task.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}优先级
                      </span>
                      {task.deadline && (
                        <span
                          className={`text-xs ${
                            new Date(task.deadline) < new Date()
                              ? 'text-red-600 font-semibold'
                              : 'text-gray-500'
                          }`}
                        >
                          DDL: {format(new Date(task.deadline), 'yyyy-MM-dd HH:mm')}
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          task.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : task.status === 'suspended'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {task.status === 'in_progress'
                          ? '进行中'
                          : task.status === 'suspended'
                          ? '挂起'
                          : '待处理'}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}


      {/* 长期任务和进行中的子项 */}
      {todos.slow_tasks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            长期任务 ({todos.slow_tasks.length})
          </h3>
          <div className="space-y-4">
            {todos.slow_tasks.map((task) => (
              <div
                key={task.id}
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
              >
                <Link
                  to={`/tasks/${task.id}`}
                  className="block mb-3 hover:text-blue-600"
                >
                  <h4 className="font-semibold text-gray-900">{task.title}</h4>
                  {task.description && (
                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">
                      完成度: {task.completion_percentage}%
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        task.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : task.status === 'suspended'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {task.status === 'in_progress'
                        ? '进行中'
                        : task.status === 'suspended'
                        ? '挂起'
                        : '待处理'}
                    </span>
                  </div>
                </Link>

                {/* 进行中的子任务 */}
                {task.subtasks && task.subtasks.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">
                      进行中的子任务 ({task.subtasks.length})
                    </h5>
                    <div className="space-y-2">
                      {task.subtasks.map((subtask: Subtask) => (
                        <div
                          key={subtask.id}
                          className="flex items-start gap-2 p-2 bg-gray-50 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={subtask.status === 'completed'}
                            disabled
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm ${
                                  subtask.status === 'completed'
                                    ? 'line-through text-gray-500'
                                    : 'text-gray-900'
                                }`}
                              >
                                {subtask.title}
                              </span>
                              {subtask.tags && subtask.tags.length > 0 && (
                                <div className="flex gap-1">
                                  {subtask.tags.map((tag, idx) => (
                                    <span
                                      key={idx}
                                      className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            {(subtask.start_date || subtask.end_date) && (
                              <div className="text-xs text-gray-500 mt-1">
                                {subtask.start_date && (
                                  <span>开始: {format(new Date(subtask.start_date), 'yyyy-MM-dd')}</span>
                                )}
                                {subtask.start_date && subtask.end_date && ' · '}
                                {subtask.end_date && (
                                  <span>结束: {format(new Date(subtask.end_date), 'yyyy-MM-dd')}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

          {totalCount === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">今日暂无待办事项</p>
            </div>
          )}
        </>
      )}

      {/* 打卡对话框 */}
      {completingTask && (
        <PeriodicTaskCompleteDialog
          periodicTask={completingTask}
          onComplete={handleCompleteSuccess}
          onClose={() => setCompletingTask(null)}
        />
      )}
    </div>
  );
}
