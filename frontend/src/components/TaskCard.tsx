import { Link } from 'react-router-dom';
import type { Task } from '../types/task';
import { format } from 'date-fns';

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'suspended':
        return 'bg-orange-100 text-orange-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Link
      to={`/tasks/${task.id}`}
      className="block bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg text-gray-900 flex-1">{task.title}</h3>
        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
          {task.status === 'completed'
            ? '已完成'
            : task.status === 'in_progress'
            ? '进行中'
            : task.status === 'suspended'
            ? '挂起'
            : task.status === 'cancelled'
            ? '已取消'
            : '待处理'}
        </span>
      </div>

      {task.description && (
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <span className={`font-medium ${getPriorityColor(task.priority)}`}>
            {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}优先级
          </span>
          {task.quadrant && (
            <span className="text-gray-500">
              象限{task.quadrant}
            </span>
          )}
        </div>
        {task.deadline && (
          <span className="text-gray-500">
            {format(new Date(task.deadline), 'yyyy-MM-dd')}
          </span>
        )}
      </div>

      {task.task_type === 'slow' && task.completion_percentage > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>完成度</span>
            <span>{task.completion_percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${task.completion_percentage}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  );
}
