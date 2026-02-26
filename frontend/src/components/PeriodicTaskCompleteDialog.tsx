import { useState } from 'react';
import apiService from '../services/api';
import type { PeriodicTask } from '../types/task';
import { format } from 'date-fns';

interface PeriodicTaskCompleteDialogProps {
  periodicTask: PeriodicTask & { title?: string; description?: string };
  onComplete?: () => void;
  onClose: () => void;
}

export default function PeriodicTaskCompleteDialog({
  periodicTask,
  onComplete,
  onClose,
}: PeriodicTaskCompleteDialogProps) {
  const [completing, setCompleting] = useState(false);
  const [completionValue, setCompletionValue] = useState<string>('');
  const [completionDate, setCompletionDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [notes, setNotes] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (periodicTask.completion_type === 'numeric' && !completionValue) {
      alert('请填写完成数值');
      return;
    }

    try {
      setCompleting(true);
      await apiService.completePeriodicTask(
        periodicTask.id,
        notes || undefined,
        periodicTask.completion_type === 'numeric' ? Number(completionValue) : undefined,
        completionDate !== format(new Date(), 'yyyy-MM-dd') ? completionDate : undefined
      );
      if (onComplete) {
        onComplete();
      }
      onClose();
    } catch (error) {
      console.error('打卡失败:', error);
      alert('打卡失败，请重试');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">打卡 - {periodicTask.title || '周期任务'}</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {periodicTask.completion_type === 'numeric' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                完成数值 <span className="text-red-500">*</span>
                {periodicTask.target_value && (
                  <span className="text-gray-500 ml-2">
                    (目标: {periodicTask.target_value} {periodicTask.unit || ''})
                  </span>
                )}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={completionValue}
                onChange={(e) => setCompletionValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`请输入完成数值${periodicTask.unit ? `（单位：${periodicTask.unit}）` : ''}`}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              完成日期
            </label>
            <input
              type="date"
              value={completionDate}
              onChange={(e) => setCompletionDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">可以选择过去的日期进行回溯打卡</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              备注（可选）
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="添加备注..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={completing}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {completing ? '打卡中...' : '确认打卡'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
