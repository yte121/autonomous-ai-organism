import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/EmptyState';
import { ShieldAlert, ListChecks } from 'lucide-react';
import type { EcosystemHealth } from '~backend/organism/types';

interface HealthMonitoringTabProps {
  healthData?: EcosystemHealth;
}

const HealthMonitoringTab = ({ healthData }: HealthMonitoringTabProps) => {
  const distribution = healthData?.organism_distribution;
  const issues = healthData?.critical_issues || [];
  const recommendations = healthData?.recommendations || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle>Organism Distribution</CardTitle></CardHeader>
        <CardContent>
          {distribution && Object.keys(distribution).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(distribution).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <span className="capitalize">{status.replace('_', ' ')}</span>
                  <Badge variant="outline">{count as number}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center">No distribution data available.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Critical Issues</CardTitle></CardHeader>
        <CardContent>
          {issues.length > 0 ? (
            <div className="space-y-2">
              {issues.map((issue, index) => (
                <Badge key={index} variant="destructive" className="block w-full text-center whitespace-normal">
                  {issue}
                </Badge>
              ))}
            </div>
          ) : (
            <EmptyState Icon={ShieldAlert} title="No Critical Issues" description="The ecosystem is currently stable and has no critical issues." />
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Recommendations</CardTitle></CardHeader>
        <CardContent>
          {recommendations.length > 0 ? (
            <div className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <div key={index} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">{recommendation}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState Icon={ListChecks} title="No Recommendations" description="No specific recommendations at this time. The system is operating within normal parameters." />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HealthMonitoringTab;
