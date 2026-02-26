import { useState, useEffect } from 'react';
import apiService from '../services/api';
import type { TaskProgress } from '../types/task';
import { format } from 'date-fns';

interface DailyProgressProps {
  taskId: number;
}

export default function DailyProgress({ taskId }: DailyProgressProps) {
  const [progress, setProgress] = useState<TaskProgress[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [progressValue, setProgressValue] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProgress();
  }, [taskId]);

  useEffect(() => {
    // 当选择日期改变时，加载该日期的进度
    const existing = progress.find((p) => p.date === selectedDate);
    if (existing) {
      setProgressValue(existing.progress_value);
      setNotes(existing.notes || '');
    } else {
      setProgressValue(0);
      setNotes('');
    }
  }, [selectedDate, progress]);

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

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiService.createProgress({
        task_id: taskId,
        date: selectedDate,
        progress_value: progressValue,
        notes: notes || undefined,
      });
      await loadProgress();
      alert('保存成功！');
    } catch (error) {
      console.error('保存进度失败:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-gray-500">加载中...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">每日进度记录</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            选择日期
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            完成度 ({progressValue}%)
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={progressValue}
            onChange={(e) => setProgressValue(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            备注
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="记录今日进展..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存进度'}
        </button>
      </div>

      {/* 最近记录 */}
      {progress.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">最近记录</h4>
          <div className="space-y-2">
            {progress
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 5)
              .map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center p-2 bg-gray-50 rounded"
                >
                  <div>
                    <span className="text-sm font-medium">
                      {format(new Date(p.date), 'yyyy-MM-dd')}
                    </span>
                    {p.notes && (
                      <span className="text-xs text-gray-500 ml-2">{p.notes}</span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-blue-600">
                    {p.progress_value}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
