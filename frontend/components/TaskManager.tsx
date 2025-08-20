import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { Plus, ListTodo, Clock, CheckCircle } from 'lucide-react';
import backend from '~backend/client';
import type { Task } from '~backend/organism/types';
import CreateTaskDialog from './CreateTaskDialog';

const TaskManager = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => backend.organism.listTasks(),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'merging': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getComplexityColor = (level: number) => {
    if (level <= 3) return 'bg-green-100 text-green-800';
    if (level <= 6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pendingTasks = tasks?.tasks.filter(t => t.status === 'pending') || [];
  const activeTasks = tasks?.tasks.filter(t => ['assigned', 'in_progress', 'merging'].includes(t.status)) || [];
  const completedTasks = tasks?.tasks.filter(t => t.status === 'completed') || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Task Manager</h1>
          <p className="text-gray-600 mt-2">
            Create and monitor tasks for your AI organisms
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Task
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Clock className="h-5 w-5 mr-2 text-yellow-600" />
              Pending Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {pendingTasks.length}
            </div>
            <p className="text-sm text-gray-600">Awaiting assignment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <ListTodo className="h-5 w-5 mr-2 text-blue-600" />
              Active Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {activeTasks.length}
            </div>
            <p className="text-sm text-gray-600">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              Completed Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {completedTasks.length}
            </div>
            <p className="text-sm text-gray-600">Successfully finished</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {tasks?.tasks.map((task) => (
          <Card key={task.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{task.title}</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge className={getComplexityColor(task.complexity_level)}>
                    Level {task.complexity_level}
                  </Badge>
                  <Badge className={getStatusColor(task.status)}>
                    {task.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">{task.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Assigned Organisms</span>
                    <p className="font-medium">{task.assigned_organisms.length}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Created</span>
                    <p className="font-medium">{formatDate(task.created_at)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Updated</span>
                    <p className="font-medium">{formatDate(task.updated_at)}</p>
                  </div>
                </div>

                {task.status !== 'pending' && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium">
                        {task.progress.completion_percentage}%
                      </span>
                    </div>
                    <Progress value={task.progress.completion_percentage} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">
                      Current phase: {task.progress.current_phase}
                    </p>
                  </div>
                )}

                {task.progress.milestones_completed.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-600">Completed Milestones</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {task.progress.milestones_completed.map((milestone, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {milestone}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {task.progress.issues_encountered.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-600">Issues Encountered</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {task.progress.issues_encountered.map((issue, index) => (
                        <Badge key={index} variant="destructive" className="text-xs">
                          {issue}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CreateTaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
};

export default TaskManager;
