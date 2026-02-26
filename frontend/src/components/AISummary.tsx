import { useState } from 'react';
import apiService from '../services/api';

export default function AISummary() {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await apiService.summarizeTasks();
      setSummary(result.summary);
    } catch (err: any) {
      setError(err.response?.data?.error || '生成总结失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">AI 任务总结</h3>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '生成中...' : '生成总结'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {summary && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="prose max-w-none whitespace-pre-wrap text-gray-700">
            {summary}
          </div>
        </div>
      )}

      {!summary && !loading && (
        <div className="text-center py-8 text-gray-500">
          <p>点击"生成总结"按钮获取AI分析的任务总结</p>
        </div>
      )}
    </div>
  );
}
