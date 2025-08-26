import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { Shuffle } from 'lucide-react';
import backend from '~backend/client';
import type { DiversityAnalysis } from '~backend/organism/types';

const EVOLUTION_PRESSURES = [
  'performance_optimization', 'capability_enhancement', 'efficiency_improvement',
  'adaptability_boost', 'innovation_drive', 'collaboration_enhancement'
];

interface EvolutionTabProps {
  diversityAnalysis?: DiversityAnalysis;
}

const EvolutionTab = ({ diversityAnalysis }: EvolutionTabProps) => {
  const [evolutionPressure, setEvolutionPressure] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const guideEvolutionMutation = useMutation({
    mutationFn: (data: { evolution_pressure: string[] }) => backend.organism.guideEcosystemEvolution(data),
    onSuccess: () => {
      toast({
        title: 'Evolution Guidance Applied',
        description: 'Ecosystem evolution has been guided based on specified pressures.',
      });
      queryClient.invalidateQueries({ queryKey: ['ecosystem-health'] });
      queryClient.invalidateQueries({ queryKey: ['organisms'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Evolution Failed',
        description: error.message || 'Failed to guide ecosystem evolution.',
        variant: 'destructive',
      });
    },
  });

  const handlePressureChange = (pressure: string, checked: boolean) => {
    setEvolutionPressure(prev =>
      checked ? [...prev, pressure] : prev.filter(p => p !== pressure)
    );
  };

  const handleGuideEvolution = () => {
    guideEvolutionMutation.mutate({
      evolution_pressure: evolutionPressure.length > 0 ? evolutionPressure : ['performance_optimization', 'capability_enhancement'],
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shuffle className="h-5 w-5 mr-2 text-purple-600" />
          Ecosystem Evolution
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Evolution Pressures</label>
          <p className="text-xs text-gray-500 mb-2">Select pressures to guide the evolution process.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
            {EVOLUTION_PRESSURES.map((pressure) => (
              <label key={pressure} className="flex items-center space-x-2 p-2 rounded-md bg-gray-50 dark:bg-gray-800/50">
                <input
                  type="checkbox"
                  checked={evolutionPressure.includes(pressure)}
                  onChange={(e) => handlePressureChange(pressure, e.target.checked)}
                />
                <span className="text-sm capitalize">{pressure.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        {diversityAnalysis && (
          <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-md">
            <h4 className="font-medium mb-2">Diversity Analysis</h4>
            <div className="space-y-2">
              {Object.entries(diversityAnalysis.diversity_scores || {}).map(([dimension, score]) => (
                <div key={dimension} className="flex justify-between items-center">
                  <span className="text-sm capitalize">{dimension.replace(/_/g, ' ')}</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={(score as number) * 100} className="w-20 h-2" />
                    <span className="text-sm font-medium">{((score as number) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={handleGuideEvolution}
          disabled={guideEvolutionMutation.isPending}
          className="w-full"
        >
          {guideEvolutionMutation.isPending ? 'Guiding Evolution...' : 'Guide Evolution'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default EvolutionTab;
