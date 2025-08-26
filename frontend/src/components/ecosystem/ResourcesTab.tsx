import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { BarChart3 } from 'lucide-react';
import backend from '~backend/client';

type AllocationStrategy = 'performance_based' | 'need_based' | 'balanced' | 'experimental';

const ResourcesTab = () => {
  const [allocationStrategy, setAllocationStrategy] = useState<AllocationStrategy>('balanced');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const allocateResourcesMutation = useMutation({
    mutationFn: (data: { allocation_strategy: AllocationStrategy }) => backend.organism.allocateResources(data),
    onSuccess: () => {
      toast({
        title: 'Resource Allocation Complete',
        description: 'Resources have been allocated across organisms.',
      });
      queryClient.invalidateQueries({ queryKey: ['organisms'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Allocation Failed',
        description: error.message || 'Failed to allocate resources.',
        variant: 'destructive',
      });
    },
  });

  const handleAllocateResources = () => {
    allocateResourcesMutation.mutate({ allocation_strategy: allocationStrategy });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
          Resource Allocation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Allocation Strategy</label>
          <Select value={allocationStrategy} onValueChange={(value: AllocationStrategy) => setAllocationStrategy(value)}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="performance_based">Performance Based</SelectItem>
              <SelectItem value="need_based">Need Based</SelectItem>
              <SelectItem value="balanced">Balanced</SelectItem>
              <SelectItem value="experimental">Experimental</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm p-4 bg-gray-50 dark:bg-gray-800/50 rounded-md">
          <div className="text-center">
            <div className="text-lg font-bold">100</div>
            <p className="text-gray-600 dark:text-gray-400">CPU Cores</p>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">500GB</div>
            <p className="text-gray-600 dark:text-gray-400">Memory</p>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">1TB</div>
            <p className="text-gray-600 dark:text-gray-400">Storage</p>
          </div>
        </div>

        <Button
          onClick={handleAllocateResources}
          disabled={allocateResourcesMutation.isPending}
          className="w-full"
        >
          {allocateResourcesMutation.isPending ? 'Allocating...' : 'Allocate Resources'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ResourcesTab;
