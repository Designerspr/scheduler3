import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../services/api';
import type { CreateTaskInput, UpdateTaskInput, TaskType, Quadrant, TaskPriority, PeriodType, CreatePeriodicTaskInput } from '../types/task';

interface TaskFormProps {
  task?: any;
  onSuccess?: () => void;
}

export default function TaskForm({ task, onSuccess }: TaskFormProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id || !!task;

  const [formData, setFormData] = useState<CreateTaskInput>({
    title: task?.title || '',
    description: task?.description || '',
    task_type: task?.task_type || 'urgent',
    priority: task?.priority || 'medium',
    quadrant: task?.quadrant,
    deadline: task?.deadline ? task.deadline.split('T')[0] : '',
    completion_percentage: task?.completion_percentage || 0,
  });

  const [periodicConfig, setPeriodicConfig] = useState<CreatePeriodicTaskInput>({
    task_id: 0,
    period_type: 'daily',
    period_value: undefined,
    completion_type: 'boolean',
    target_value: undefined,
    unit: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [periodicTask, setPeriodicTask] = useState<any>(null);

  useEffect(() => {
    if (id && !task) {
      loadTask();
    }
  }, [id]);

  useEffect(() => {
    // 如果是编辑模式且是周期任务，加载周期任务配置
    // 注意：不要在loadTask执行时重复加载，因为loadTask中已经会调用loadPeriodicConfig
    if ((id || task?.id) && formData.task_type === 'periodic' && !task) {
      // 只有在不是通过loadTask加载的情况下才调用
      loadPeriodicConfig();
    } else if (formData.task_type !== 'periodic') {
      // 如果切换为非周期任务，清空周期任务配置
      setPeriodicTask(null);
      setPeriodicConfig({
        task_id: 0,
        period_type: 'daily',
        period_value: undefined,
        completion_type: 'boolean',
        target_value: undefined,
        unit: '',
      });
    }
  }, [formData.task_type]); // 只监听task_type变化

  const loadTask = async () => {
    try {
      const data = await apiService.getTaskById(Number(id));
      setFormData({
        title: data.title,
        description: data.description || '',
        task_type: data.task_type,
        priority: data.priority,
        quadrant: data.quadrant,
        deadline: data.deadline ? data.deadline.split('T')[0] : '',
        completion_percentage: data.completion_percentage,
      });
      
      // 如果是周期任务，加载周期任务配置
      if (data.task_type === 'periodic') {
        await loadPeriodicConfig();
      }
    } catch (err) {
      setError('加载任务失败');
    }
  };

  const loadPeriodicConfig = async () => {
    try {
      const taskId = Number(id || task?.id);
      const periodicData = await apiService.getPeriodicTaskByTaskId(taskId);
      setPeriodicTask(periodicData);
      setPeriodicConfig({
        task_id: taskId,
        period_type: periodicData.period_type,
        period_value: periodicData.period_value,
        completion_type: periodicData.completion_type || 'boolean',
        target_value: periodicData.target_value,
        unit: periodicData.unit || '',
      });
    } catch (err) {
      // 如果周期任务配置不存在，保持默认值
      setPeriodicTask(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let taskId: number;
      
      if (isEdit) {
        taskId = Number(id || task?.id);
        // 准备更新数据，将空字符串转换为undefined
        const updateData: UpdateTaskInput = {
          ...formData,
          deadline: formData.deadline === '' ? undefined : formData.deadline,
        };
        await apiService.updateTask(taskId, updateData);
        
        // 如果是周期任务，更新或创建周期任务配置
        if (formData.task_type === 'periodic') {
          try {
            if (periodicTask) {
              // 更新现有配置
              // 如果从数值型改为布尔型，需要明确设置target_value为undefined（后端会处理为null）
              const updateData: any = {
                period_type: periodicConfig.period_type,
                period_value: periodicConfig.period_value,
                completion_type: periodicConfig.completion_type,
              };
              
              // 只有数值型任务才需要target_value和unit
              if (periodicConfig.completion_type === 'numeric') {
                updateData.target_value = periodicConfig.target_value;
                updateData.unit = periodicConfig.unit;
              } else {
                // 布尔型任务，明确设置为undefined，让后端设置为null
                updateData.target_value = undefined;
                updateData.unit = undefined;
              }
              
              await apiService.updatePeriodicTask(taskId, updateData);
            } else {
              // 创建新配置
              // 确保使用正确的task_id，不要使用periodicConfig中的task_id
              const { task_id, ...configWithoutTaskId } = periodicConfig;
              await apiService.createPeriodicTask({
                task_id: taskId,
                ...configWithoutTaskId,
              });
            }
          } catch (periodicErr: any) {
            // 如果周期任务配置更新失败，显示具体错误
            const periodicError = periodicErr.response?.data?.error || '更新周期任务配置失败';
            throw new Error(`更新任务成功，但${periodicError}`);
          }
        }
      } else {
        // 创建新任务
        const newTask = await apiService.createTask(formData);
        
        if (!newTask || !newTask.id) {
          throw new Error('创建任务失败：未返回任务ID');
        }
        
        taskId = newTask.id;

        // 如果是周期任务，立即创建周期任务配置
        if (formData.task_type === 'periodic') {
          // 确保使用正确的task_id，不要使用periodicConfig中的task_id（可能是0）
          const { task_id, ...configWithoutTaskId } = periodicConfig;
          await apiService.createPeriodicTask({
            task_id: taskId,
            ...configWithoutTaskId,
          });
        }
      }

      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/');
      }
    } catch (err: any) {
      console.error('保存任务失败:', err);
      const errorMessage = err.message || err.response?.data?.error || '保存失败';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">{isEdit ? '编辑任务' : '新建任务'}</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            标题 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            任务类型 <span className="text-red-500">*</span>
          </label>
            <select
              value={formData.task_type}
              onChange={(e) => setFormData({ ...formData, task_type: e.target.value as TaskType })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="urgent">急类型（短期事项，需要DDL）</option>
              <option value="slow">慢类型（长期事项，需要跟踪进度）</option>
              <option value="periodic">周期任务</option>
            </select>
        </div>

        {formData.task_type === 'urgent' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              截止日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required={formData.task_type === 'urgent'}
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* 周期任务配置 */}
        {formData.task_type === 'periodic' && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold mb-4">周期任务配置</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  周期类型 <span className="text-red-500">*</span>
                </label>
                <select
                  value={periodicConfig.period_type}
                  onChange={(e) =>
                    setPeriodicConfig({ ...periodicConfig, period_type: e.target.value as PeriodType })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="daily">每天</option>
                  <option value="weekly">每周</option>
                  <option value="monthly">每月</option>
                  <option value="custom">自定义</option>
                </select>
              </div>

              {periodicConfig.period_type === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    周期数值（天数） <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required={periodicConfig.period_type === 'custom'}
                    value={periodicConfig.period_value || ''}
                    onChange={(e) =>
                      setPeriodicConfig({
                        ...periodicConfig,
                        period_value: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例如：3（每3天）"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  任务类型 <span className="text-red-500">*</span>
                </label>
                <select
                  value={periodicConfig.completion_type}
                  onChange={(e) =>
                    setPeriodicConfig({
                      ...periodicConfig,
                      completion_type: e.target.value as 'boolean' | 'numeric',
                      target_value: e.target.value === 'numeric' ? periodicConfig.target_value : undefined,
                      unit: e.target.value === 'numeric' ? periodicConfig.unit : '',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="boolean">布尔型（完成/未完成）</option>
                  <option value="numeric">数值累计型（里程、次数等）</option>
                </select>
              </div>

              {periodicConfig.completion_type === 'numeric' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      目标值 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required={periodicConfig.completion_type === 'numeric'}
                      value={periodicConfig.target_value || ''}
                      onChange={(e) =>
                        setPeriodicConfig({
                          ...periodicConfig,
                          target_value: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="例如：5（每天5公里）"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      单位
                    </label>
                    <input
                      type="text"
                      value={periodicConfig.unit}
                      onChange={(e) =>
                        setPeriodicConfig({
                          ...periodicConfig,
                          unit: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="例如：公里、次、分钟等"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">象限（可选）</label>
          <select
            value={formData.quadrant || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                quadrant: e.target.value ? (Number(e.target.value) as Quadrant) : undefined,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">无</option>
            <option value="1">1 - 重要且紧急</option>
            <option value="2">2 - 重要不紧急</option>
            <option value="3">3 - 不重要但紧急</option>
            <option value="4">4 - 不重要不紧急</option>
          </select>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '保存中...' : '保存'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
