import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Settings } from 'lucide-react';
import backend from '~backend/client';

const OPTIMIZATION_GOALS = [
  'performance_improvement',
  'resource_efficiency',
  'learning_acceleration',
  'diversity_enhancement',
  'stability_improvement',
  'innovation_boost'
];

const OptimizationTab = () => {
  const [optimizationGoals, setOptimizationGoals] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const optimizeEcosystemMutation = useMutation({
    mutationFn: (data: { optimization_goals: string[] }) => backend.organism.optimizeEcosystem(data),
    onSuccess: () => {
      toast({
        title: 'Ecosystem Optimization Started',
        description: 'Ecosystem optimization process has been initiated.',
      });
      queryClient.invalidateQueries({ queryKey: ['ecosystem-health'] });
      queryClient.invalidateQueries({ queryKey: ['organisms'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Optimization Failed',
        description: error.message || 'Failed to start ecosystem optimization.',
        variant: 'destructive',
      });
    },
  });

  const handleGoalChange = (goal: string, checked: boolean) => {
    setOptimizationGoals(prev =>
      checked ? [...prev, goal] : prev.filter(g => g !== goal)
    );
  };

  const handleOptimizeEcosystem = () => {
    optimizeEcosystemMutation.mutate({
      optimization_goals: optimizationGoals.length > 0 ? optimizationGoals : ['performance_improvement', 'resource_efficiency'],
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="h-5 w-5 mr-2 text-blue-600" />
          Ecosystem Optimization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Optimization Goals</label>
          <p className="text-xs text-gray-500 mb-2">Select goals to guide the optimization process. Default goals will be used if none are selected.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
            {OPTIMIZATION_GOALS.map((goal) => (
              <label key={goal} className="flex items-center space-x-2 p-2 rounded-md bg-gray-50 dark:bg-gray-800/50">
                <input
                  type="checkbox"
                  checked={optimizationGoals.includes(goal)}
                  onChange={(e) => handleGoalChange(goal, e.target.checked)}
                />
                <span className="text-sm capitalize">{goal.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        <Button
          onClick={handleOptimizeEcosystem}
          disabled={optimizeEcosystemMutation.isPending}
          className="w-full"
        >
          {optimizeEcosystemMutation.isPending ? 'Optimizing...' : 'Optimize Ecosystem'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default OptimizationTab;
