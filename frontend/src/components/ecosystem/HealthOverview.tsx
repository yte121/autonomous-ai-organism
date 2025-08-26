import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, Users, Zap } from 'lucide-react';
import type { EcosystemHealth } from '~backend/organism/types';

interface HealthOverviewProps {
  healthData?: EcosystemHealth;
}

const HealthOverview = ({ healthData }: HealthOverviewProps) => {
  const getHealthColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBadgeColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800';
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const overallHealth = healthData?.overall_health_score || 0;
  const successRate = healthData?.performance_trends?.avg_success_rate || 0;
  const activeOrganisms = healthData?.organism_distribution?.active || 0;
  const learningEfficiency = healthData?.performance_trends?.avg_learning_efficiency || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center"><Activity className="h-5 w-5 mr-2 text-blue-600" />Overall Health</CardTitle></CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getHealthColor(overallHealth)}`}>
            {(overallHealth * 100).toFixed(1)}%
          </div>
          <Badge className={getHealthBadgeColor(overallHealth)}>
            {overallHealth >= 0.8 ? 'Excellent' : overallHealth >= 0.6 ? 'Good' : 'Needs Attention'}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center"><TrendingUp className="h-5 w-5 mr-2 text-green-600" />Performance</CardTitle></CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            {(successRate * 100).toFixed(1)}%
          </div>
          <p className="text-sm text-gray-600">Average Success Rate</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center"><Users className="h-5 w-5 mr-2 text-purple-600" />Active Organisms</CardTitle></CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{activeOrganisms}</div>
          <p className="text-sm text-gray-600">Currently Active</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center"><Zap className="h-5 w-5 mr-2 text-orange-600" />Learning Efficiency</CardTitle></CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            {(learningEfficiency * 100).toFixed(1)}%
          </div>
          <p className="text-sm text-gray-600">Average Learning Rate</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default HealthOverview;
