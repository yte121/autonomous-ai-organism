import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateOrganism } from '../hooks/useCreateOrganism';
import CapabilityEditor from './CapabilityEditor';

interface CreateOrganismDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateOrganismDialog = ({ open, onOpenChange }: CreateOrganismDialogProps) => {
  const {
    name,
    setName,
    capabilities,
    setCapabilities,
    handleSubmit,
    isLoading,
  } = useCreateOrganism(() => onOpenChange(false));

  // Same predefined capabilities as before
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
              disabled={isLoading}
            />
          </div>

          <CapabilityEditor
            capabilities={capabilities}
            setCapabilities={setCapabilities}
            predefinedCapabilities={predefinedCapabilities}
            placeholder="Add initial capability"
            label="Initial Capabilities"
          />

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isLoading}>
              {isLoading ? 'Creating...' : 'Create Organism'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOrganismDialog;
