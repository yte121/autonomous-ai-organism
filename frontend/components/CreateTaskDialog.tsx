import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { X } from 'lucide-react';
import backend from '~backend/client';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateTaskDialog = ({ open, onOpenChange }: CreateTaskDialogProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [complexityLevel, setComplexityLevel] = useState<number>(1);
  const [minGeneration, setMinGeneration] = useState<number>(1);
  const [requiredCapabilities, setRequiredCapabilities] = useState<string[]>([]);
  const [newCapability, setNewCapability] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => backend.organism.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: 'Task Created',
        description: 'New task has been successfully created and will be assigned to suitable organisms.',
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Failed to create task:', error);
      toast({
        title: 'Creation Failed',
        description: 'Failed to create task. Please try again.',
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
    setNewCapability('');
  };

  const addCapability = () => {
    if (newCapability.trim() && !requiredCapabilities.includes(newCapability.trim())) {
      setRequiredCapabilities([...requiredCapabilities, newCapability.trim()]);
      setNewCapability('');
    }
  };

  const removeCapability = (capability: string) => {
    setRequiredCapabilities(requiredCapabilities.filter(c => c !== capability));
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

  const predefinedCapabilities = [
    'data_processing',
    'pattern_recognition',
    'code_analysis',
    'optimization',
    'learning',
    'communication',
    'error_recovery',
    'self_healing',
    'task_execution',
    'knowledge_synthesis',
    'collaborative_processing',
    'distributed_computation'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this task should accomplish"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="complexity">Complexity Level</Label>
              <Select value={complexityLevel.toString()} onValueChange={(value) => setComplexityLevel(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                    <SelectItem key={level} value={level.toString()}>
                      Level {level} {level <= 3 ? '(Simple)' : level <= 6 ? '(Medium)' : '(Complex)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="generation">Min Generation</Label>
              <Select value={minGeneration.toString()} onValueChange={(value) => setMinGeneration(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((gen) => (
                    <SelectItem key={gen} value={gen.toString()}>
                      Generation {gen}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Required Capabilities</Label>
            <div className="flex space-x-2 mt-2">
              <Input
                value={newCapability}
                onChange={(e) => setNewCapability(e.target.value)}
                placeholder="Add required capability"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCapability())}
              />
              <Button type="button" onClick={addCapability} variant="outline">
                Add
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-3">
              {requiredCapabilities.map((capability) => (
                <Badge key={capability} variant="secondary" className="flex items-center gap-1">
                  {capability}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeCapability(capability)}
                  />
                </Badge>
              ))}
            </div>

            <div className="mt-3">
              <Label className="text-sm text-gray-600">Quick Add:</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {predefinedCapabilities.map((capability) => (
                  <Badge
                    key={capability}
                    variant="outline"
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (!requiredCapabilities.includes(capability)) {
                        setRequiredCapabilities([...requiredCapabilities, capability]);
                      }
                    }}
                  >
                    {capability}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || !description.trim() || createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTaskDialog;
