import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiService from '../services/api';
import type { Task, PeriodicTask, PeriodicTaskStats, TaskCompletion, PeriodType } from '../types/task';
import { format } from 'date-fns';
import PeriodicTaskCompleteDialog from '../components/PeriodicTaskCompleteDialog';

export default function PeriodicTaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [periodicTask, setPeriodicTask] = useState<PeriodicTask | null>(null);
  const [stats, setStats] = useState<PeriodicTaskStats[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingCompletion, setEditingCompletion] = useState<TaskCompletion | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    period_type: 'daily' as PeriodType,
    period_value: undefined as number | undefined,
    completion_type: 'boolean' as 'boolean' | 'numeric',
    target_value: undefined as number | undefined,
    unit: '' as string,
  });

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // 先获取任务信息
      const taskData = await apiService.getTaskById(Number(id));
      setTask(taskData);

      // 验证任务类型
      if (taskData.task_type !== 'periodic') {
        setError('该任务不是周期任务');
        setLoading(false);
        return;
      }

      // 获取周期任务配置
      const periodicData = await apiService.getPeriodicTaskByTaskId(Number(id));
      setPeriodicTask(periodicData);
      setConfigForm({
        period_type: periodicData.period_type,
        period_value: periodicData.period_value,
        completion_type: periodicData.completion_type || 'boolean',
        target_value: periodicData.target_value,
        unit: periodicData.unit || '',
      });

      // 获取统计信息
      try {
        const statsData = await apiService.getPeriodicTaskStats(periodicData.id);
        setStats(statsData);
      } catch (err) {
        console.error('加载统计失败:', err);
        setStats([]);
      }

      // 获取打卡记录
      try {
        const completionsData = await apiService.getPeriodicTaskCompletions(periodicData.id);
        setCompletions(completionsData);
      } catch (err) {
        console.error('加载打卡记录失败:', err);
        setCompletions([]);
      }
    } catch (err: any) {
      console.error('加载周期任务失败:', err);
      setError(err.response?.data?.error || '加载周期任务失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompletion = async (completionId: number) => {
    if (!confirm('确定要删除这条打卡记录吗？')) return;

    try {
      await apiService.deletePeriodicTaskCompletion(completionId);
      await loadData();
    } catch (err) {
      console.error('删除失败:', err);
      alert('删除失败，请重试');
    }
  };

  const handleUpdateCompletion = async (completion: TaskCompletion) => {
    try {
      await apiService.updatePeriodicTaskCompletion(completion.id, {
        completion_value: completion.completion_value,
        completion_date: completion.completion_date,
        notes: completion.notes,
      });
      setEditingCompletion(null);
      await loadData();
    } catch (err) {
      console.error('更新失败:', err);
      alert('更新失败，请重试');
    }
  };

  const handleUpdateConfig = async () => {
    if (!periodicTask) return;

    try {
      await apiService.updatePeriodicTask(Number(id), {
        period_type: configForm.period_type,
        period_value: configForm.period_value,
        completion_type: configForm.completion_type,
        target_value: configForm.completion_type === 'numeric' ? configForm.target_value : undefined,
        unit: configForm.completion_type === 'numeric' ? configForm.unit : undefined,
      });
      setEditingConfig(false);
      await loadData();
      alert('配置更新成功！');
    } catch (err) {
      console.error('更新配置失败:', err);
      alert('更新配置失败，请重试');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || '任务不存在'}</p>
        <Link to="/" className="text-blue-600 hover:text-blue-700">
          返回任务列表
        </Link>
      </div>
    );
  }

  if (!periodicTask) {
    return (
      <div className="text-center py-12">
        <p className="text-yellow-600 mb-4">该周期任务尚未配置周期信息</p>
        <div className="flex gap-4 justify-center">
          <Link
            to={`/tasks/${id}`}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            返回任务详情
          </Link>
          <Link
            to={`/tasks/${id}/edit`}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            配置周期任务
          </Link>
        </div>
      </div>
    );
  }

  const getPeriodLabel = () => {
    switch (periodicTask.period_type) {
      case 'daily':
        return '每天';
      case 'weekly':
        return '每周';
      case 'monthly':
        return '每月';
      case 'custom':
        return `每${periodicTask.period_value}天`;
      default:
        return '未知';
    }
  };

  const latestStats = stats[0];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{task.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>创建于 {format(new Date(task.created_at), 'yyyy-MM-dd HH:mm')}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              to={`/tasks/${id}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              编辑
            </Link>
            <Link
              to={`/tasks/${id}`}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              返回
            </Link>
          </div>
        </div>

        {task.description && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">描述</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
          </div>
        )}

        {/* 周期任务配置 */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">周期配置</h3>
            {!editingConfig && (
              <button
                onClick={() => setEditingConfig(true)}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                编辑配置
              </button>
            )}
          </div>

          {editingConfig ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  周期类型 <span className="text-red-500">*</span>
                </label>
                <select
                  value={configForm.period_type}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, period_type: e.target.value as PeriodType })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="daily">每天</option>
                  <option value="weekly">每周</option>
                  <option value="monthly">每月</option>
                  <option value="custom">自定义</option>
                </select>
              </div>

              {configForm.period_type === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    周期数值（天数） <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={configForm.period_value || ''}
                    onChange={(e) =>
                      setConfigForm({
                        ...configForm,
                        period_value: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  任务类型 <span className="text-red-500">*</span>
                </label>
                <select
                  value={configForm.completion_type}
                  onChange={(e) =>
                    setConfigForm({
                      ...configForm,
                      completion_type: e.target.value as 'boolean' | 'numeric',
                      target_value: e.target.value === 'numeric' ? configForm.target_value : undefined,
                      unit: e.target.value === 'numeric' ? configForm.unit : '',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="boolean">布尔型（完成/未完成）</option>
                  <option value="numeric">数值累计型（里程、次数等）</option>
                </select>
              </div>

              {configForm.completion_type === 'numeric' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      目标值 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={configForm.target_value || ''}
                      onChange={(e) =>
                        setConfigForm({
                          ...configForm,
                          target_value: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">单位</label>
                    <input
                      type="text"
                      value={configForm.unit}
                      onChange={(e) =>
                        setConfigForm({
                          ...configForm,
                          unit: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="例如：公里、次、分钟等"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleUpdateConfig}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setEditingConfig(false);
                    // 恢复原始配置
                    if (periodicTask) {
                      setConfigForm({
                        period_type: periodicTask.period_type,
                        period_value: periodicTask.period_value,
                        completion_type: periodicTask.completion_type || 'boolean',
                        target_value: periodicTask.target_value,
                        unit: periodicTask.unit || '',
                      });
                    }
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">周期类型</label>
                  <p className="mt-1 text-gray-900 font-medium">{getPeriodLabel()}</p>
                </div>
                {periodicTask.completion_type === 'numeric' && periodicTask.target_value && (
                  <div>
                    <label className="text-sm text-gray-500">目标值</label>
                    <p className="mt-1 text-gray-900 font-medium">
                      {periodicTask.target_value} {periodicTask.unit || ''}
                    </p>
                  </div>
                )}
                {periodicTask.next_due_date && (
                  <div>
                    <label className="text-sm text-gray-500">下次到期</label>
                    <p className="mt-1 text-gray-900 font-medium">
                      {format(new Date(periodicTask.next_due_date), 'yyyy-MM-dd')}
                    </p>
                  </div>
                )}
                {periodicTask.last_completed_at && (
                  <div>
                    <label className="text-sm text-gray-500">上次完成</label>
                    <p className="mt-1 text-gray-900 font-medium">
                      {format(new Date(periodicTask.last_completed_at), 'yyyy-MM-dd HH:mm')}
                    </p>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowCompleteDialog(true)}
                className="mt-4 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                立即打卡
              </button>
            </>
          )}
        </div>

        {/* 打卡记录 */}
        {completions.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">打卡记录</h3>
            <div className="space-y-2">
              {completions.map((completion) => (
                <div
                  key={completion.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  {editingCompletion?.id === completion.id ? (
                    <div className="space-y-2">
                      {periodicTask?.completion_type === 'numeric' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            完成数值
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={editingCompletion.completion_value || ''}
                            onChange={(e) =>
                              setEditingCompletion({
                                ...editingCompletion,
                                completion_value: e.target.value ? Number(e.target.value) : undefined,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          完成日期
                        </label>
                        <input
                          type="date"
                          value={
                            editingCompletion.completion_date ||
                            format(new Date(editingCompletion.completed_at), 'yyyy-MM-dd')
                          }
                          onChange={(e) =>
                            setEditingCompletion({
                              ...editingCompletion,
                              completion_date: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          备注
                        </label>
                        <textarea
                          value={editingCompletion.notes || ''}
                          onChange={(e) =>
                            setEditingCompletion({
                              ...editingCompletion,
                              notes: e.target.value,
                            })
                          }
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateCompletion(editingCompletion)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingCompletion(null)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {format(
                              new Date(
                                completion.completion_date || completion.completed_at
                              ),
                              'yyyy-MM-dd'
                            )}
                          </span>
                          {periodicTask?.completion_type === 'numeric' &&
                            completion.completion_value && (
                              <span className="text-sm text-gray-600">
                                {completion.completion_value} {periodicTask.unit || ''}
                              </span>
                            )}
                          {completion.notes && (
                            <span className="text-xs text-gray-500">({completion.notes})</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {format(new Date(completion.completed_at), 'HH:mm:ss')}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingCompletion(completion)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteCompletion(completion.id)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 当前周期统计 */}
        {latestStats && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">当前周期统计</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>
                    周期: {latestStats.period_start} ~ {latestStats.period_end}
                  </span>
                  <span>
                    {periodicTask?.completion_type === 'numeric' && latestStats.expected_value
                      ? `完成: ${latestStats.actual_value || 0} / ${latestStats.expected_value} ${periodicTask.unit || ''}`
                      : `完成: ${latestStats.actual_count} / ${latestStats.expected_count}`}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full"
                    style={{
                      width: `${Math.min(
                        periodicTask?.completion_type === 'numeric' && latestStats.expected_value && latestStats.expected_value > 0
                          ? ((latestStats.actual_value || 0) / latestStats.expected_value) * 100
                          : latestStats.expected_count > 0
                          ? (latestStats.actual_count / latestStats.expected_count) * 100
                          : 0,
                        100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  完成率:{' '}
                  {(
                    periodicTask?.completion_type === 'numeric' && latestStats.expected_value && latestStats.expected_value > 0
                      ? ((latestStats.actual_value || 0) / latestStats.expected_value) * 100
                      : latestStats.expected_count > 0
                      ? (latestStats.actual_count / latestStats.expected_count) * 100
                      : 0
                  ).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 历史统计 */}
        {stats.length > 1 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">历史统计</h3>
            <div className="space-y-3">
              {stats.slice(1).map((stat) => (
                <div key={stat.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {stat.period_start} ~ {stat.period_end}
                    </span>
                    <span className="text-sm text-gray-600">
                      {periodicTask?.completion_type === 'numeric' && stat.expected_value
                        ? `${stat.actual_value || 0} / ${stat.expected_value} ${periodicTask.unit || ''} (${(
                            stat.expected_value > 0
                              ? ((stat.actual_value || 0) / stat.expected_value) * 100
                              : 0
                          ).toFixed(0)}%)`
                        : `${stat.actual_count} / ${stat.expected_count} (${(
                            stat.expected_count > 0
                              ? (stat.actual_count / stat.expected_count) * 100
                              : 0
                          ).toFixed(0)}%)`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min(
                          periodicTask?.completion_type === 'numeric' && stat.expected_value && stat.expected_value > 0
                            ? ((stat.actual_value || 0) / stat.expected_value) * 100
                            : stat.expected_count > 0
                            ? (stat.actual_count / stat.expected_count) * 100
                            : 0,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 打卡对话框 */}
        {showCompleteDialog && periodicTask && (
          <PeriodicTaskCompleteDialog
            periodicTask={periodicTask}
            onComplete={async () => {
              setShowCompleteDialog(false);
              await loadData();
            }}
            onClose={() => setShowCompleteDialog(false)}
          />
        )}
      </div>
    </div>
  );
}
