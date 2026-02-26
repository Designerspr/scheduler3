import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiService from '../services/api';
import type { Task, PeriodicTask } from '../types/task';
import { format } from 'date-fns';
import SubtaskList from './SubtaskList';
import PeriodicTaskForm from './PeriodicTaskForm';

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [periodicTask, setPeriodicTask] = useState<PeriodicTask | null>(null);
  const [showPeriodicForm, setShowPeriodicForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadTask();
    }
  }, [id]);

  const loadTask = async () => {
    try {
      setLoading(true);
      const data = await apiService.getTaskById(Number(id));
      setTask(data);

      // 如果是周期任务，尝试加载周期任务配置
      if (data.task_type === 'periodic') {
        try {
          const periodicData = await apiService.getPeriodicTaskByTaskId(Number(id));
          setPeriodicTask(periodicData);
        } catch (err) {
          // 周期任务配置不存在，这是正常的（新创建的周期任务可能还没有配置）
          setPeriodicTask(null);
        }
      }
    } catch (err) {
      setError('加载任务失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这个任务吗？')) return;

    try {
      await apiService.deleteTask(Number(id));
      navigate('/');
    } catch (err) {
      setError('删除失败');
    }
  };

  const handleStatusChange = async (newStatus: Task['status']) => {
    try {
      const updated = await apiService.updateTask(Number(id), { status: newStatus });
      setTask(updated);
    } catch (err) {
      setError('更新状态失败');
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

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{task.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>创建于 {format(new Date(task.created_at), 'yyyy-MM-dd HH:mm')}</span>
              {task.updated_at !== task.created_at && (
                <span>更新于 {format(new Date(task.updated_at), 'yyyy-MM-dd HH:mm')}</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              to={`/tasks/${id}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              编辑
            </Link>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              删除
            </button>
          </div>
        </div>

        {task.description && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">描述</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="text-sm text-gray-500">状态</label>
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value as Task['status'])}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pending">待处理</option>
              <option value="in_progress">进行中</option>
              <option value="suspended">挂起</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-500">优先级</label>
            <p className="mt-1 text-gray-900 font-medium">
              {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
            </p>
          </div>

          <div>
            <label className="text-sm text-gray-500">类型</label>
            <p className="mt-1 text-gray-900 font-medium">
              {task.task_type === 'urgent' ? '急类型' : task.task_type === 'slow' ? '慢类型' : '周期'}
            </p>
          </div>

          {task.quadrant && (
            <div>
              <label className="text-sm text-gray-500">象限</label>
              <p className="mt-1 text-gray-900 font-medium">象限{task.quadrant}</p>
            </div>
          )}
        </div>

        {task.deadline && (
          <div className="mb-6">
            <label className="text-sm text-gray-500">截止日期</label>
            <p className="mt-1 text-gray-900 font-medium">
              {format(new Date(task.deadline), 'yyyy-MM-dd')}
            </p>
          </div>
        )}

        {task.task_type === 'slow' && (
          <div className="mb-6">
            <label className="text-sm text-gray-500">完成度</label>
            <div className="mt-2">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{task.completion_percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full"
                  style={{ width: `${task.completion_percentage}%` }}
                />
              </div>
            </div>
            <Link
              to={`/tasks/${id}/progress`}
              className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
            >
              查看进度详情 →
            </Link>
          </div>
        )}

        {task.task_type === 'periodic' && (
          <div className="mb-6">
            {periodicTask ? (
              <Link
                to={`/tasks/${id}/periodic`}
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                查看周期任务详情 →
              </Link>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 mb-3">
                  该周期任务尚未配置周期信息，请先配置周期类型。
                </p>
                {showPeriodicForm ? (
                  <PeriodicTaskForm
                    taskId={task.id}
                    onSuccess={() => {
                      setShowPeriodicForm(false);
                      loadTask();
                    }}
                  />
                ) : (
                  <button
                    onClick={() => setShowPeriodicForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    配置周期任务
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 长期事项显示子任务 */}
        {task.task_type === 'slow' && (
          <div className="mb-6">
            <SubtaskList taskId={task.id} />
          </div>
        )}
      </div>
    </div>
  );
}
