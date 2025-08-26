import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateTask } from '../hooks/useCreateTask';
import CapabilityEditor from './CapabilityEditor';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateTaskDialog = ({ open, onOpenChange }: CreateTaskDialogProps) => {
  const {
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
    isLoading,
  } = useCreateTask(() => onOpenChange(false));

  const predefinedCapabilities = [
    'data_processing', 'pattern_recognition', 'code_analysis', 'optimization',
    'learning', 'communication', 'error_recovery', 'self_healing',
    'task_execution', 'knowledge_synthesis', 'collaborative_processing', 'distributed_computation'
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
              disabled={isLoading}
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
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="complexity">Complexity Level</Label>
              <Select
                value={complexityLevel.toString()}
                onValueChange={(value) => setComplexityLevel(parseInt(value))}
                disabled={isLoading}
              >
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
              <Select
                value={minGeneration.toString()}
                onValueChange={(value) => setMinGeneration(parseInt(value))}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((gen) => (
                    <SelectItem key={gen} value={gen.toString()}>Generation {gen}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <CapabilityEditor
            capabilities={requiredCapabilities}
            setCapabilities={setRequiredCapabilities}
            predefinedCapabilities={predefinedCapabilities}
            placeholder="Add required capability"
            label="Required Capabilities"
          />

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || !description.trim() || isLoading}>
              {isLoading ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTaskDialog;
