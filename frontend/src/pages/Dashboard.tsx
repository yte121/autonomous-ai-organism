import React from 'react';
import { useQuery } from '@tanstack/react-query';
import backend from '~backend/client';

import OrganismStatusChart from '@/components/OrganismStatusChart';
import TaskProgressChart from '@/components/TaskProgressChart';
import ErrorState from '@/src/components/ErrorState';
import LoadingSkeleton from '@/src/components/LoadingSkeleton';
import DashboardStats from '@/src/components/dashboard/DashboardStats';
import RecentActivity from '@/src/components/dashboard/RecentActivity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// A skeleton loader specific to the Dashboard page
const DashboardSkeleton = () => (
  <div className="space-y-6" data-testid="dashboard-skeleton">
    {/* Title Skeleton */}
    <div>
      <LoadingSkeleton className="h-8 w-1/2" />
      <LoadingSkeleton className="h-4 w-3/4 mt-2" />
    </div>
    {/* Stats Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <LoadingSkeleton className="h-24" />
      <LoadingSkeleton className="h-24" />
      <LoadingSkeleton className="h-24" />
      <LoadingSkeleton className="h-24" />
    </div>
    {/* Charts Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <LoadingSkeleton className="h-64" />
      <LoadingSkeleton className="h-64" />
    </div>
    {/* Recent Activity Skeleton */}
    <LoadingSkeleton className="h-48" />
  </div>
);

const Dashboard = () => {
  const {
    data: organismsData,
    isLoading: organismsLoading,
    isError: organismsError,
    error: organismsErrorObj,
    refetch: refetchOrganisms
  } = useQuery({
    queryKey: ['organisms'],
    queryFn: () => backend.organism.list(),
  });

  const {
    data: tasksData,
    isLoading: tasksLoading,
    isError: tasksError,
    error: tasksErrorObj,
    refetch: refetchTasks
  } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => backend.organism.listTasks(),
  });

  if (organismsLoading || tasksLoading) {
    return <DashboardSkeleton />;
  }

  if (organismsError || tasksError) {
    const error = (organismsError ? organismsErrorObj : tasksErrorObj) as Error | null;
    return (
      <ErrorState
        title="Failed to load dashboard data"
        message={error?.message || 'An unexpected error occurred.'}
        onRetry={() => {
          if (organismsError) refetchOrganisms();
          if (tasksError) refetchTasks();
        }}
      />
    );
  }

  const organisms = organismsData?.organisms || [];
  const tasks = tasksData?.tasks || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">AI Organism Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Monitor and manage your autonomous AI organism ecosystem
        </p>
      </div>

      <DashboardStats organisms={organisms} tasks={tasks} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Organism Status Distribution</CardTitle></CardHeader>
          <CardContent>
            <OrganismStatusChart organisms={organisms} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Task Progress Overview</CardTitle></CardHeader>
          <CardContent>
            <TaskProgressChart tasks={tasks} />
          </CardContent>
        </Card>
      </div>

      <RecentActivity organisms={organisms} />
    </div>
  );
};

export default Dashboard;
