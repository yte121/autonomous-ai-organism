import React from 'react';
import type { Task } from '~backend/organism/types';

interface TaskProgressChartProps {
  tasks: Task[];
}

const TaskProgressChart = ({ tasks }: TaskProgressChartProps) => {
  const statusCounts = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusColors = {
    pending: '#6b7280',
    assigned: '#3b82f6',
    in_progress: '#f59e0b',
    merging: '#8b5cf6',
    completed: '#10b981',
    failed: '#ef4444'
  };

  const total = tasks.length;

  return (
    <div className="space-y-4">
      {Object.entries(statusCounts).map(([status, count]) => {
        const percentage = total > 0 ? (count / total) * 100 : 0;
        const color = statusColors[status as keyof typeof statusColors] || '#6b7280';
        
        return (
          <div key={status} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="capitalize font-medium">{status.replace('_', ' ')}</span>
              <span className="text-gray-600">{count} ({percentage.toFixed(1)}%)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: color
                }}
              />
            </div>
          </div>
        );
      })}
      
      {total === 0 && (
        <div className="text-center text-gray-500 py-8">
          No tasks created yet
        </div>
      )}
    </div>
  );
};

export default TaskProgressChart;
