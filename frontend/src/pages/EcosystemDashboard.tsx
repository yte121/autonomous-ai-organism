import React from 'react';
import { useQuery } from '@tanstack/react-query';
import backend from '~backend/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ErrorState from '@/components/ErrorState';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import HealthOverview from '@/components/ecosystem/HealthOverview';
import HealthMonitoringTab from '@/components/ecosystem/HealthMonitoringTab';
import OptimizationTab from '@/components/ecosystem/OptimizationTab';
import ResourcesTab from '@/components/ecosystem/ResourcesTab';
import EvolutionTab from '@/components/ecosystem/EvolutionTab';

const EcosystemDashboardSkeleton = () => (
  <div className="space-y-6">
    {/* Title Skeleton */}
    <div>
      <LoadingSkeleton className="h-8 w-1/2" />
      <LoadingSkeleton className="h-4 w-3/4 mt-2" />
    </div>
    {/* Health Overview Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <LoadingSkeleton className="h-28" />
      <LoadingSkeleton className="h-28" />
      <LoadingSkeleton className="h-28" />
      <LoadingSkeleton className="h-28" />
    </div>
    {/* Tabs Skeleton */}
    <div className="space-y-4">
      <LoadingSkeleton className="h-10 w-full" />
      <LoadingSkeleton className="h-96 w-full" />
    </div>
  </div>
);

const EcosystemDashboard = () => {
  const {
    data: healthData,
    isLoading: healthLoading,
    isError: healthError,
    error: healthErrorObj,
    refetch: refetchHealth
  } = useQuery({
    queryKey: ['ecosystem-health'],
    queryFn: () => backend.organism.getEcosystemHealth({ include_metrics: true, include_recommendations: true }),
    refetchInterval: 30000,
  });

  const {
    data: diversityData,
    isLoading: diversityLoading,
    isError: diversityError,
    error: diversityErrorObj,
    refetch: refetchDiversity
  } = useQuery({
    queryKey: ['diversity-analysis'],
    queryFn: () => backend.organism.analyzeDiversity({
      analysis_dimensions: ['capability_diversity', 'generational_diversity', 'performance_diversity'],
      include_recommendations: true
    }),
  });

  if (healthLoading || diversityLoading) {
    return <EcosystemDashboardSkeleton />;
  }

  if (healthError || diversityError) {
    const error = (healthError ? healthErrorObj : diversityErrorObj) as Error | null;
    return (
      <ErrorState
        title="Failed to load ecosystem data"
        message={error?.message || 'An unexpected error occurred.'}
        onRetry={() => {
          if (healthError) refetchHealth();
          if (diversityError) refetchDiversity();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Ecosystem Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Monitor and manage the health, diversity, and evolution of your AI organism ecosystem
        </p>
      </div>

      <HealthOverview healthData={healthData?.health} />

      <Tabs defaultValue="health" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="health">Health Monitoring</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="evolution">Evolution</TabsTrigger>
        </TabsList>

        <TabsContent value="health">
          <HealthMonitoringTab healthData={healthData?.health} />
        </TabsContent>
        <TabsContent value="optimization">
          <OptimizationTab />
        </TabsContent>
        <TabsContent value="resources">
          <ResourcesTab />
        </TabsContent>
        <TabsContent value="evolution">
          <EvolutionTab diversityAnalysis={diversityData?.analysis} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EcosystemDashboard;
