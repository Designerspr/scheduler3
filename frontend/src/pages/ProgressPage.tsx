import { useParams } from 'react-router-dom';
import GanttChart from '../components/GanttChart';
import DailyProgress from '../components/DailyProgress';

export default function ProgressPage() {
  const { id } = useParams();
  const taskId = Number(id);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">任务进度跟踪</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DailyProgress taskId={taskId} />
        <GanttChart taskId={taskId} />
      </div>
    </div>
  );
}
