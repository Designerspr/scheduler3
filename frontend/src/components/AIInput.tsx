import { useState } from 'react';
import apiService from '../services/api';
import type { CreateTaskInput } from '../types/task';

interface AIInputProps {
  onTasksCreated?: () => void;
}

export default function AIInput({ onTasksCreated }: AIInputProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedTasks, setParsedTasks] = useState<CreateTaskInput[]>([]);
  const [error, setError] = useState('');

  const handleParse = async () => {
    if (!input.trim()) {
      setError('请输入内容');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const result = await apiService.parseNaturalLanguage(input);
      setParsedTasks(result.tasks);
    } catch (err: any) {
      setError(err.response?.data?.error || '解析失败，请重试');
      setParsedTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTasks = async () => {
    try {
      setLoading(true);
      for (const task of parsedTasks) {
        await apiService.createTask(task);
      }
      setInput('');
      setParsedTasks([]);
      if (onTasksCreated) {
        onTasksCreated();
      }
      alert(`成功创建 ${parsedTasks.length} 个任务！`);
    } catch (err) {
      setError('创建任务失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">AI 自然语言输入</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            用自然语言描述你的任务
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例如：明天下午3点前完成项目报告（高优先级），每周一锻炼身体，每天学习英语30分钟"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={handleParse}
          disabled={loading || !input.trim()}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '解析中...' : '解析任务'}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {parsedTasks.length > 0 && (
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold mb-3">解析结果（{parsedTasks.length} 个任务）</h4>
            <div className="space-y-2 mb-4">
              {parsedTasks.map((task, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded">
                  <div className="font-medium">{task.title}</div>
                  {task.description && (
                    <div className="text-sm text-gray-600 mt-1">{task.description}</div>
                  )}
                  <div className="flex gap-2 mt-2 text-xs">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {task.task_type === 'urgent' ? '急类型' : task.task_type === 'slow' ? '慢类型' : '周期'}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">
                      {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}优先级
                    </span>
                    {task.deadline && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                        {task.deadline}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateTasks}
                disabled={loading}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? '创建中...' : '创建所有任务'}
              </button>
              <button
                onClick={() => setParsedTasks([])}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                清除
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
