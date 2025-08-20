import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { X } from 'lucide-react';
import backend from '~backend/client';

interface CreateOrganismDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateOrganismDialog = ({ open, onOpenChange }: CreateOrganismDialogProps) => {
  const [name, setName] = useState('');
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [newCapability, setNewCapability] = useState('');
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
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Failed to create organism:', error);
      toast({
        title: 'Creation Failed',
        description: 'Failed to create organism. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setName('');
    setCapabilities([]);
    setNewCapability('');
  };

  const addCapability = () => {
    if (newCapability.trim() && !capabilities.includes(newCapability.trim())) {
      setCapabilities([...capabilities, newCapability.trim()]);
      setNewCapability('');
    }
  };

  const removeCapability = (capability: string) => {
    setCapabilities(capabilities.filter(c => c !== capability));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createMutation.mutate({
      name: name.trim(),
      initial_capabilities: capabilities.length > 0 ? capabilities : undefined,
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
    'knowledge_synthesis'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New AI Organism</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Organism Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter organism name"
              required
            />
          </div>

          <div>
            <Label>Initial Capabilities</Label>
            <div className="flex space-x-2 mt-2">
              <Input
                value={newCapability}
                onChange={(e) => setNewCapability(e.target.value)}
                placeholder="Add capability"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCapability())}
              />
              <Button type="button" onClick={addCapability} variant="outline">
                Add
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-3">
              {capabilities.map((capability) => (
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
                      if (!capabilities.includes(capability)) {
                        setCapabilities([...capabilities, capability]);
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
            <Button type="submit" disabled={!name.trim() || createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Organism'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOrganismDialog;
