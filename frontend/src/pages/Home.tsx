import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/api';
import AIInput from '../components/AIInput';
import type { Task, TodayTodos, PeriodicTask } from '../types/task';
import TaskCard from '../components/TaskCard';
import PeriodicTaskCompleteDialog from '../components/PeriodicTaskCompleteDialog';
import { format } from 'date-fns';

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [todayTodos, setTodayTodos] = useState<TodayTodos | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayTab, setTodayTab] = useState<'today' | 'periodic'>('today');
  const [allTasksTab, setAllTasksTab] = useState<'non-periodic' | 'periodic'>('non-periodic');
  const [showAIInput, setShowAIInput] = useState(false);
  const [completingTask, setCompletingTask] = useState<PeriodicTask & { title?: string; description?: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksData, todayData] = await Promise.all([
        apiService.getTasks({ archived: 'false' }),
        apiService.getTodayTodos(),
      ]);
      setTasks(tasksData);
      setTodayTodos(todayData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompletePeriodic = (task: PeriodicTask & { title?: string; description?: string }) => {
    setCompletingTask(task);
  };

  const handleCompleteSuccess = async () => {
    await loadData();
    setCompletingTask(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  const todayCount =
    (todayTodos?.urgent_tasks.length || 0) +
    (todayTodos?.periodic_tasks.length || 0) +
    (todayTodos?.slow_tasks?.reduce((sum, task) => sum + (task.subtasks?.length || 0), 0) || 0);

  // 分离周期任务和非周期任务
  const periodicTasks = tasks.filter((task) => task.task_type === 'periodic');
  const nonPeriodicTasks = tasks.filter((task) => task.task_type !== 'periodic');

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">任务管理</h2>
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setShowAIInput(!showAIInput)}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 text-sm"
            >
              🤖 AI输入
            </button>
            {showAIInput && (
              <>
                <div
                  className="fixed inset-0 bg-black bg-opacity-25 z-40"
                  onClick={() => setShowAIInput(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-4">
                  <AIInput onTasksCreated={() => {
                    loadData();
                    setShowAIInput(false);
                  }} />
                </div>
              </>
            )}
          </div>
          <Link
            to="/tasks/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            + 新建任务
          </Link>
        </div>
      </div>

      {/* 今日TODO区域 */}
      {todayTodos && todayCount > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">今日TODO</h3>
              <p className="text-sm text-gray-600 mt-1">
                {format(new Date(todayTodos.date), 'yyyy年MM月dd日')} · 共 {todayCount} 项
              </p>
            </div>
            <button
              onClick={loadData}
              className="px-3 py-1 bg-white text-gray-700 rounded-md hover:bg-gray-100 text-sm"
            >
              刷新
            </button>
          </div>

          {/* 今日TODO选项卡 */}
          <div className="border-b border-blue-200 mb-4">
            <nav className="-mb-px flex space-x-4">
              <button
                onClick={() => setTodayTab('today')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  todayTab === 'today'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                今日任务
              </button>
              <button
                onClick={() => setTodayTab('periodic')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  todayTab === 'periodic'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                周期任务 ({todayTodos.periodic_tasks.length})
              </button>
            </nav>
          </div>

          {/* 今日任务选项卡内容 */}
          {todayTab === 'today' && (
            <div className="space-y-2">
              {/* 急类型任务 */}
              {todayTodos.urgent_tasks.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    短期任务 ({todayTodos.urgent_tasks.length})
                  </h4>
                  <div className="space-y-2">
                    {todayTodos.urgent_tasks.map((task) => (
                      <Link
                        key={task.id}
                        to={`/tasks/${task.id}`}
                        className="block bg-white p-3 rounded-md shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">{task.title}</span>
                          {task.deadline && (
                            <span className="text-xs text-gray-500">
                              {format(new Date(task.deadline), 'HH:mm')}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 长期任务和子任务 */}
              {todayTodos.slow_tasks.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">长期任务</h4>
                  <div className="space-y-2">
                    {todayTodos.slow_tasks.map((task) => (
                      <div key={task.id} className="bg-white p-3 rounded-md shadow-sm">
                        <Link
                          to={`/tasks/${task.id}`}
                          className="block font-medium text-gray-900 hover:text-blue-600 mb-2"
                        >
                          {task.title}
                        </Link>
                        {task.subtasks && task.subtasks.length > 0 && (
                          <div className="space-y-1 ml-4">
                            {task.subtasks.map((subtask) => (
                              <div
                                key={subtask.id}
                                className="flex items-center gap-2 text-sm text-gray-600"
                              >
                                <input
                                  type="checkbox"
                                  checked={subtask.status === 'completed'}
                                  disabled
                                  className="rounded"
                                />
                                <span
                                  className={
                                    subtask.status === 'completed'
                                      ? 'line-through text-gray-400'
                                      : ''
                                  }
                                >
                                  {subtask.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {todayTodos.urgent_tasks.length === 0 && todayTodos.slow_tasks.length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  今日暂无待办任务
                </div>
              )}
            </div>
          )}

          {/* 周期任务选项卡内容 */}
          {todayTab === 'periodic' && (
            <div className="space-y-2">
              {todayTodos.periodic_tasks.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  今日暂无周期任务
                </div>
              ) : (
                todayTodos.periodic_tasks.map((task) => {
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
                      className="bg-white p-4 rounded-md shadow-sm border border-gray-200"
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
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* 所有任务区域 */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700">所有任务</h3>
        </div>

        {/* 所有任务选项卡 */}
        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex space-x-4">
            <button
              onClick={() => setAllTasksTab('non-periodic')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                allTasksTab === 'non-periodic'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              非周期任务 ({nonPeriodicTasks.length})
            </button>
            <button
              onClick={() => setAllTasksTab('periodic')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                allTasksTab === 'periodic'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              周期任务 ({periodicTasks.length})
            </button>
          </nav>
        </div>

        {/* 非周期任务选项卡内容 */}
        {allTasksTab === 'non-periodic' && (
          <div>
            {nonPeriodicTasks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">还没有非周期任务</p>
                <Link to="/tasks/new" className="text-blue-600 hover:text-blue-700">
                  创建第一个任务
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {nonPeriodicTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 周期任务选项卡内容 */}
        {allTasksTab === 'periodic' && (
          <div>
            {periodicTasks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">还没有周期任务</p>
                <Link to="/tasks/new" className="text-blue-600 hover:text-blue-700">
                  创建第一个周期任务
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {periodicTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

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
