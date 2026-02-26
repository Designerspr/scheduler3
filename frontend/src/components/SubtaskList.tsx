import { useEffect, useState } from 'react';
import apiService from '../services/api';
import type { Subtask, CreateSubtaskInput, UpdateSubtaskInput } from '../types/task';
import { format } from 'date-fns';

interface SubtaskListProps {
  taskId: number;
}

export default function SubtaskList({ taskId }: SubtaskListProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<Subtask | null>(null);
  const [newSubtask, setNewSubtask] = useState<CreateSubtaskInput>({
    title: '',
    description: '',
    priority: 'medium',
    tags: [],
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    loadSubtasks();
  }, [taskId]);

  const loadSubtasks = async () => {
    try {
      setLoading(true);
      const data = await apiService.getSubtasks(taskId);
      setSubtasks(data);
    } catch (error) {
      console.error('加载子任务失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newSubtask.title.trim()) return;

    try {
      await apiService.createSubtask(taskId, newSubtask);
      setNewSubtask({
        title: '',
        description: '',
        priority: 'medium',
        tags: [],
        start_date: '',
        end_date: '',
      });
      setShowForm(false);
      await loadSubtasks();
    } catch (error) {
      console.error('创建子任务失败:', error);
    }
  };

  const handleUpdate = async (subtaskId: number, updates: UpdateSubtaskInput) => {
    try {
      await apiService.updateSubtask(taskId, subtaskId, updates);
      await loadSubtasks();
    } catch (error) {
      console.error('更新子任务失败:', error);
    }
  };

  const handleDelete = async (subtaskId: number) => {
    if (!confirm('确定要删除这个子任务吗？')) return;

    try {
      await apiService.deleteSubtask(taskId, subtaskId);
      await loadSubtasks();
    } catch (error) {
      console.error('删除子任务失败:', error);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">加载中...</div>;
  }

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-semibold text-gray-700">子任务 ({subtasks.length})</h4>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {showForm ? '取消' : '+ 添加子任务'}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <input
            type="text"
            placeholder="子任务标题"
            value={newSubtask.title}
            onChange={(e) => setNewSubtask({ ...newSubtask, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2 text-sm"
          />
          <textarea
            placeholder="描述（可选）"
            value={newSubtask.description}
            onChange={(e) => setNewSubtask({ ...newSubtask, description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">开始日期</label>
              <input
                type="date"
                value={newSubtask.start_date}
                onChange={(e) =>
                  setNewSubtask({ ...newSubtask, start_date: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">结束日期</label>
              <input
                type="date"
                value={newSubtask.end_date}
                onChange={(e) =>
                  setNewSubtask({ ...newSubtask, end_date: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              创建
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className="p-3 bg-gray-50 rounded-lg border border-gray-200"
          >
            {editingSubtask?.id === subtask.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editingSubtask.title}
                  onChange={(e) =>
                    setEditingSubtask({ ...editingSubtask, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">开始日期</label>
                    <input
                      type="date"
                      value={editingSubtask.start_date || ''}
                      onChange={(e) =>
                        setEditingSubtask({ ...editingSubtask, start_date: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">结束日期</label>
                    <input
                      type="date"
                      value={editingSubtask.end_date || ''}
                      onChange={(e) =>
                        setEditingSubtask({ ...editingSubtask, end_date: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">状态</label>
                  <select
                    value={editingSubtask.status}
                    onChange={(e) =>
                      setEditingSubtask({
                        ...editingSubtask,
                        status: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="pending">待处理</option>
                    <option value="in_progress">进行中</option>
                    <option value="completed">已完成</option>
                    <option value="suspended">挂起</option>
                    <option value="cancelled">已取消</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      await handleUpdate(editingSubtask.id, {
                        title: editingSubtask.title,
                        start_date: editingSubtask.start_date,
                        end_date: editingSubtask.end_date,
                        status: editingSubtask.status,
                      });
                      setEditingSubtask(null);
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setEditingSubtask(null)}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={subtask.status === 'completed'}
                  onChange={(e) =>
                    handleUpdate(subtask.id, {
                      status: e.target.checked ? 'completed' : 'pending',
                    })
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm ${
                        subtask.status === 'completed'
                          ? 'line-through text-gray-500'
                          : 'text-gray-900'
                      }`}
                    >
                      {subtask.title}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        subtask.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : subtask.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : subtask.status === 'suspended'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {subtask.status === 'in_progress'
                        ? '进行中'
                        : subtask.status === 'completed'
                        ? '已完成'
                        : subtask.status === 'suspended'
                        ? '挂起'
                        : '待处理'}
                    </span>
                    {subtask.tags && subtask.tags.length > 0 && (
                      <div className="flex gap-1">
                        {subtask.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {subtask.description && (
                    <p className="text-xs text-gray-600 mt-1">{subtask.description}</p>
                  )}
                  {(subtask.start_date || subtask.end_date) && (
                    <div className="text-xs text-gray-500 mt-1">
                      {subtask.start_date && (
                        <span>开始: {format(new Date(subtask.start_date), 'yyyy-MM-dd')}</span>
                      )}
                      {subtask.start_date && subtask.end_date && ' · '}
                      {subtask.end_date && (
                        <span>结束: {format(new Date(subtask.end_date), 'yyyy-MM-dd')}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingSubtask(subtask)}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(subtask.id)}
                    className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                  >
                    删除
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {subtasks.length === 0 && !showForm && (
        <p className="text-sm text-gray-500 text-center py-4">暂无子任务</p>
      )}
    </div>
  );
}
