import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import type { PeriodType } from '../types/task';

interface PeriodicTaskFormProps {
  taskId: number;
  onSuccess?: () => void;
}

export default function PeriodicTaskForm({ taskId, onSuccess }: PeriodicTaskFormProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    period_type: 'daily' as PeriodType,
    period_value: undefined as number | undefined,
    completion_type: 'boolean' as 'boolean' | 'numeric',
    target_value: undefined as number | undefined,
    unit: '' as string,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await apiService.createPeriodicTask({
        task_id: taskId,
        period_type: formData.period_type,
        period_value: formData.period_value,
        completion_type: formData.completion_type,
        target_value: formData.completion_type === 'numeric' ? formData.target_value : undefined,
        unit: formData.completion_type === 'numeric' ? formData.unit : undefined,
      });

      if (onSuccess) {
        onSuccess();
      } else {
        navigate(`/tasks/${taskId}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">配置周期任务</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            周期类型 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.period_type}
            onChange={(e) =>
              setFormData({ ...formData, period_type: e.target.value as PeriodType })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="daily">每天</option>
            <option value="weekly">每周</option>
            <option value="monthly">每月</option>
            <option value="custom">自定义</option>
          </select>
        </div>

        {formData.period_type === 'custom' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              周期数值（天数） <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              required={formData.period_type === 'custom'}
              value={formData.period_value || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
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
            value={formData.completion_type}
            onChange={(e) =>
              setFormData({
                ...formData,
                completion_type: e.target.value as 'boolean' | 'numeric',
                target_value: e.target.value === 'numeric' ? formData.target_value : undefined,
                unit: e.target.value === 'numeric' ? formData.unit : '',
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="boolean">布尔型（完成/未完成）</option>
            <option value="numeric">数值累计型（里程、次数等）</option>
          </select>
        </div>

        {formData.completion_type === 'numeric' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                目标值 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required={formData.completion_type === 'numeric'}
                value={formData.target_value || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
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
                value={formData.unit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    unit: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如：公里、次、分钟等"
              />
            </div>
          </>
        )}

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
