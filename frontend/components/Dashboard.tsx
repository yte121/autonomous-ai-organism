import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Activity, Zap, TrendingUp } from 'lucide-react';
import backend from '~backend/client';
import OrganismStatusChart from './OrganismStatusChart';
import TaskProgressChart from './TaskProgressChart';

const Dashboard = () => {
  const { data: organisms } = useQuery({
    queryKey: ['organisms'],
    queryFn: () => backend.organism.list(),
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => backend.organism.listTasks(),
  });

  const activeOrganisms = organisms?.organisms.filter(o => o.status === 'active') || [];
  const completedTasks = tasks?.tasks.filter(t => t.status === 'completed') || [];
  const avgGeneration = activeOrganisms.length > 0 
    ? activeOrganisms.reduce((sum, o) => sum + o.generation, 0) / activeOrganisms.length 
    : 0;

  const stats = [
    {
      title: 'Active Organisms',
      value: activeOrganisms.length,
      icon: Brain,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Completed Tasks',
      value: completedTasks.length,
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Average Generation',
      value: avgGeneration.toFixed(1),
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'System Health',
      value: '98%',
      icon: Zap,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Organism Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Monitor and manage your autonomous AI organism ecosystem
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Organism Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <OrganismStatusChart organisms={organisms?.organisms || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Progress Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskProgressChart tasks={tasks?.tasks || []} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeOrganisms.slice(0, 5).map((organism) => (
              <div key={organism.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Brain className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">{organism.name}</p>
                    <p className="text-sm text-gray-600">Generation {organism.generation}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">
                    {organism.capabilities.length} capabilities
                  </Badge>
                  <Badge 
                    variant={organism.status === 'active' ? 'default' : 'secondary'}
                  >
                    {organism.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
