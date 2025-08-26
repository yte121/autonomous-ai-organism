import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import backend from '~backend/client';

export const useCreateOrganism = (onSuccessCallback?: () => void) => {
  const [name, setName] = useState('');
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: { name: string; initial_capabilities?: string[] }) =>
      backend.organism.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisms'] });
      toast({
        title: 'Organism Created',
        description: 'New AI organism has been successfully created.',
      });
      onSuccessCallback?.();
      resetForm();
    },
    onError: (error: any) => {
      console.error('Failed to create organism:', error);
      toast({
        title: 'Creation Failed',
        description: error.message || 'Failed to create organism. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setName('');
    setCapabilities([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createMutation.mutate({
      name: name.trim(),
      initial_capabilities: capabilities.length > 0 ? capabilities : undefined,
    });
  };

  return {
    name,
    setName,
    capabilities,
    setCapabilities,
    handleSubmit,
    isLoading: createMutation.isPending,
  };
};
