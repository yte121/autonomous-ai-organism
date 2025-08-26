import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

interface CapabilityEditorProps {
  capabilities: string[];
  setCapabilities: (capabilities: string[]) => void;
  predefinedCapabilities: string[];
  placeholder?: string;
  label?: string;
}

const CapabilityEditor = ({
  capabilities,
  setCapabilities,
  predefinedCapabilities,
  placeholder = "Add capability...",
  label = "Capabilities"
}: CapabilityEditorProps) => {
  const [newCapability, setNewCapability] = useState('');

  const addCapability = () => {
    const trimmedCapability = newCapability.trim();
    if (trimmedCapability && !capabilities.includes(trimmedCapability)) {
      setCapabilities([...capabilities, trimmedCapability]);
      setNewCapability('');
    }
  };

  const removeCapability = (capabilityToRemove: string) => {
    setCapabilities(capabilities.filter(c => c !== capabilityToRemove));
  };

  const togglePredefinedCapability = (capability: string) => {
    if (capabilities.includes(capability)) {
      removeCapability(capability);
    } else {
      setCapabilities([...capabilities, capability]);
    }
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>

      {/* Input for adding new capabilities */}
      <div className="flex space-x-2">
        <Input
          value={newCapability}
          onChange={(e) => setNewCapability(e.target.value)}
          placeholder={placeholder}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCapability();
            }
          }}
        />
        <Button type="button" onClick={addCapability} variant="outline">
          Add
        </Button>
      </div>

      {/* Display currently selected capabilities */}
      <div className="flex flex-wrap gap-2" data-testid="selected-capabilities">
        {capabilities.length > 0 ? (
          capabilities.map((capability) => (
            <Badge key={capability} variant="secondary" className="flex items-center gap-1.5">
              {capability}
              <X
                aria-label={`Remove ${capability}`}
                className="h-3 w-3 cursor-pointer hover:text-red-500"
                onClick={() => removeCapability(capability)}
                role="button"
              />
            </Badge>
          ))
        ) : (
          <p className="text-xs text-gray-500">No capabilities added yet.</p>
        )}
      </div>

      {/* Display predefined capabilities for quick add */}
      <div>
        <Label className="text-sm text-gray-600">Suggestions:</Label>
        <div className="flex flex-wrap gap-1 mt-1" data-testid="suggested-capabilities">
          {predefinedCapabilities.map((capability) => (
            <Badge
              key={capability}
              variant={capabilities.includes(capability) ? "default" : "outline"}
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => togglePredefinedCapability(capability)}
            >
              {capability}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CapabilityEditor;
