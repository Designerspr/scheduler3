import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import type { DropResult } from 'react-beautiful-dnd';
import apiService from '../services/api';
import type { Task, Quadrant } from '../types/task';
import TaskCard from '../components/TaskCard';

const quadrantLabels = {
  1: { title: '重要且紧急', color: 'bg-red-50 border-red-200' },
  2: { title: '重要不紧急', color: 'bg-yellow-50 border-yellow-200' },
  3: { title: '不重要但紧急', color: 'bg-orange-50 border-orange-200' },
  4: { title: '不重要不紧急', color: 'bg-gray-50 border-gray-200' },
};

export default function QuadrantView() {
  const [tasks, setTasks] = useState<Record<number, Task[]>>({
    1: [],
    2: [],
    3: [],
    4: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const allTasks = await apiService.getTasks();
      
      // 按象限分组
      const grouped: Record<number, Task[]> = { 1: [], 2: [], 3: [], 4: [] };
      allTasks.forEach((task) => {
        if (task.quadrant) {
          grouped[task.quadrant].push(task);
        }
      });

      setTasks(grouped);
    } catch (error) {
      console.error('加载任务失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const sourceQuadrant = parseInt(result.source.droppableId) as Quadrant;
    const destQuadrant = parseInt(result.destination.droppableId) as Quadrant;
    const taskId = parseInt(result.draggableId);

    // 如果象限相同，只是重新排序（这里简化处理，不实现排序）
    if (sourceQuadrant === destQuadrant) return;

    // 更新任务象限
    try {
      await apiService.updateTask(taskId, { quadrant: destQuadrant });
      
      // 更新本地状态
      const task = tasks[sourceQuadrant].find((t) => t.id === taskId);
      if (task) {
        setTasks((prev) => {
          const newTasks = { ...prev };
          newTasks[sourceQuadrant] = prev[sourceQuadrant].filter((t) => t.id !== taskId);
          newTasks[destQuadrant] = [...prev[destQuadrant], { ...task, quadrant: destQuadrant }];
          return newTasks;
        });
      }
    } catch (error) {
      console.error('更新任务象限失败:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">4象限视图</h2>
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((quadrant) => (
            <div
              key={quadrant}
              className={`${quadrantLabels[quadrant as Quadrant].color} border-2 rounded-lg p-4 min-h-[400px]`}
            >
              <h3 className="text-lg font-semibold mb-4">
                {quadrantLabels[quadrant as Quadrant].title}
              </h3>
              
              <Droppable droppableId={quadrant.toString()}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[300px] ${
                      snapshot.isDraggingOver ? 'bg-white bg-opacity-50' : ''
                    }`}
                  >
                    {tasks[quadrant].map((task, index) => (
                      <Draggable
                        key={task.id}
                        draggableId={task.id.toString()}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`mb-2 ${
                              snapshot.isDragging ? 'opacity-50' : ''
                            }`}
                          >
                            <div className="bg-white rounded-lg shadow p-3">
                              <h4 className="font-semibold">{task.title}</h4>
                              {task.deadline && (
                                <p className="text-sm text-gray-500 mt-1">
                                  {new Date(task.deadline).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
