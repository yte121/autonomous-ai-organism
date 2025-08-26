import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, Activity, Zap, TrendingUp } from 'lucide-react';
import type { Organism, Task } from '~backend/organism/types';

interface DashboardStatsProps {
  organisms: Organism[];
  tasks: Task[];
}

const DashboardStats = ({ organisms, tasks }: DashboardStatsProps) => {
  const activeOrganisms = organisms.filter(o => o.status === 'active');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const avgGeneration = activeOrganisms.length > 0
    ? activeOrganisms.reduce((sum, o) => sum + o.generation, 0) / activeOrganisms.length
    : 0;

  const stats = [
    { title: 'Active Organisms', value: activeOrganisms.length, icon: Brain, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { title: 'Completed Tasks', value: completedTasks.length, icon: Activity, color: 'text-green-600', bgColor: 'bg-green-100' },
    { title: 'Average Generation', value: avgGeneration.toFixed(1), icon: TrendingUp, color: 'text-purple-600', bgColor: 'bg-purple-100' },
    { title: 'System Health', value: '98%', icon: Zap, color: 'text-orange-600', bgColor: 'bg-orange-100' }, // Note: System Health is still a mock value
  ];

  return (
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
  );
};

export default DashboardStats;
