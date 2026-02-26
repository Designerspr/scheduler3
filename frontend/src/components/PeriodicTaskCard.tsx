import { useState } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/api';
import type { PeriodicTask } from '../types/task';
import { format } from 'date-fns';
import PeriodicTaskCompleteDialog from './PeriodicTaskCompleteDialog';

interface PeriodicTaskCardProps {
  periodicTask: PeriodicTask & { title?: string; description?: string };
  onComplete?: () => void;
}

export default function PeriodicTaskCard({ periodicTask, onComplete }: PeriodicTaskCardProps) {
  const [showDialog, setShowDialog] = useState(false);

  const handleCompleteSuccess = () => {
    if (onComplete) {
      onComplete();
    }
    setShowDialog(false);
  };

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

  const isOverdue = periodicTask.next_due_date
    ? new Date(periodicTask.next_due_date) < new Date()
    : false;

  return (
    <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <Link
            to={`/tasks/${periodicTask.task_id}/periodic`}
            className="hover:text-blue-600"
          >
            <h3 className="font-semibold text-lg">{periodicTask.title || '周期任务'}</h3>
          </Link>
          {periodicTask.description && (
            <p className="text-gray-600 text-sm mt-1">{periodicTask.description}</p>
          )}
        </div>
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
          {getPeriodLabel()}
        </span>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          {periodicTask.next_due_date ? (
            <div>
              <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                下次到期: {format(new Date(periodicTask.next_due_date), 'yyyy-MM-dd')}
              </span>
              {isOverdue && <span className="ml-2 text-red-600">(已逾期)</span>}
            </div>
          ) : (
            <span>未设置到期日期</span>
          )}
          {periodicTask.last_completed_at && (
            <div className="text-xs text-gray-500 mt-1">
              上次完成: {format(new Date(periodicTask.last_completed_at), 'yyyy-MM-dd HH:mm')}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowDialog(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          打卡
        </button>
      </div>

      {showDialog && (
        <PeriodicTaskCompleteDialog
          periodicTask={periodicTask}
          onComplete={handleCompleteSuccess}
          onClose={() => setShowDialog(false)}
        />
      )}
    </div>
  );
}
