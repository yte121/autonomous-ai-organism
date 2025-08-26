import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import backend from '~backend/client';

export const useCreateTask = (onSuccessCallback?: () => void) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [complexityLevel, setComplexityLevel] = useState<number>(1);
  const [minGeneration, setMinGeneration] = useState<number>(1);
  const [requiredCapabilities, setRequiredCapabilities] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => backend.organism.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: 'Task Created',
        description: 'New task has been successfully created.',
      });
      onSuccessCallback?.();
      resetForm();
    },
    onError: (error: any) => {
      console.error('Failed to create task:', error);
      toast({
        title: 'Creation Failed',
        description: error.message || 'Failed to create task. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setComplexityLevel(1);
    setMinGeneration(1);
    setRequiredCapabilities([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    createMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      complexity_level: complexityLevel,
      requirements: {
        min_generation: minGeneration,
        required_capabilities: requiredCapabilities,
        estimated_complexity: complexityLevel,
      },
    });
  };

  return {
    title,
    setTitle,
    description,
    setDescription,
    complexityLevel,
    setComplexityLevel,
    minGeneration,
    setMinGeneration,
    requiredCapabilities,
    setRequiredCapabilities,
    handleSubmit,
    isLoading: createMutation.isPending,
  };
};
