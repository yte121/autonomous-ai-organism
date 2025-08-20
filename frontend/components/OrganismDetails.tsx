import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Brain, Zap, TrendingUp, Clock } from 'lucide-react';
import type { Organism } from '~backend/organism/types';

interface OrganismDetailsProps {
  organism: Organism;
  onClose: () => void;
}

const OrganismDetails = ({ organism, onClose }: OrganismDetailsProps) => {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'evolving': return 'bg-blue-100 text-blue-800';
      case 'merging': return 'bg-purple-100 text-purple-800';
      case 'healing': return 'bg-yellow-100 text-yellow-800';
      case 'deprecated': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2 text-blue-600" />
            {organism.name}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Status</span>
          <Badge className={getStatusColor(organism.status)}>
            {organism.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Generation</span>
            <p className="font-medium">{organism.generation}</p>
          </div>
          <div>
            <span className="text-gray-600">Capabilities</span>
            <p className="font-medium">{organism.capabilities.length}</p>
          </div>
        </div>

        <div>
          <span className="text-sm text-gray-600">Performance Metrics</span>
          <div className="mt-2 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Tasks Completed</span>
              <span className="font-medium">{organism.performance_metrics.tasks_completed}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Success Rate</span>
              <span className="font-medium">
                {(organism.performance_metrics.success_rate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Error Recovery</span>
              <span className="font-medium">
                {(organism.performance_metrics.error_recovery_rate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Learning Efficiency</span>
              <span className="font-medium">
                {(organism.performance_metrics.learning_efficiency * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div>
          <span className="text-sm text-gray-600">Capabilities</span>
          <div className="flex flex-wrap gap-1 mt-2">
            {organism.capabilities.map((capability) => (
              <Badge key={capability} variant="outline" className="text-xs">
                {capability}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <span className="text-sm text-gray-600">Learned Technologies</span>
          <div className="flex flex-wrap gap-1 mt-2">
            {organism.learned_technologies.length > 0 ? (
              organism.learned_technologies.map((tech) => (
                <Badge key={tech} variant="secondary" className="text-xs">
                  {tech}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-gray-400">No technologies learned yet</span>
            )}
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center text-xs text-gray-500 mb-1">
            <Clock className="h-3 w-3 mr-1" />
            Timeline
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Created</span>
              <span>{formatDate(organism.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Updated</span>
              <span>{formatDate(organism.updated_at)}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Active</span>
              <span>{formatDate(organism.last_active)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrganismDetails;
