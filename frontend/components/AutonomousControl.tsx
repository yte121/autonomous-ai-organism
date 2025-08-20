import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Brain, Zap, Settings, Play, Pause, Square } from 'lucide-react';
import backend from '~backend/client';
import type { Organism } from '~backend/organism/types';

interface AutonomousControlProps {
  organism: Organism;
}

const AutonomousControl = ({ organism }: AutonomousControlProps) => {
  const [userCommand, setUserCommand] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [operationType, setOperationType] = useState<'file_system' | 'network' | 'process' | 'system_info' | 'automation'>('system_info');
  const [operationDetails, setOperationDetails] = useState('{}');
  const [replicationPurpose, setReplicationPurpose] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const executeAutonomousMutation = useMutation({
    mutationFn: (data: any) => backend.organism.executeAutonomous(data),
    onSuccess: (result) => {
      toast({
        title: 'Autonomous Execution Started',
        description: `Created ${result.created_tasks.length} tasks and ${result.spawned_organisms.length} organisms.`,
      });
      setIsExecuting(true);
      queryClient.invalidateQueries({ queryKey: ['organisms'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error) => {
      console.error('Autonomous execution failed:', error);
      toast({
        title: 'Execution Failed',
        description: 'Failed to execute autonomous command.',
        variant: 'destructive',
      });
    },
  });

  const selfReplicateMutation = useMutation({
    mutationFn: (data: any) => backend.organism.selfReplicate(data),
    onSuccess: (result) => {
      toast({
        title: 'Self-Replication Successful',
        description: `Created ${result.replicated_organisms.length} replica organisms.`,
      });
      queryClient.invalidateQueries({ queryKey: ['organisms'] });
    },
    onError: (error) => {
      console.error('Self-replication failed:', error);
      toast({
        title: 'Replication Failed',
        description: 'Failed to replicate organism.',
        variant: 'destructive',
      });
    },
  });

  const computerOperationMutation = useMutation({
    mutationFn: (data: any) => backend.organism.operateComputer(data),
    onSuccess: (result) => {
      toast({
        title: 'Computer Operation Completed',
        description: 'Operation executed successfully.',
      });
    },
    onError: (error) => {
      console.error('Computer operation failed:', error);
      toast({
        title: 'Operation Failed',
        description: 'Failed to execute computer operation.',
        variant: 'destructive',
      });
    },
  });

  const handleAutonomousExecution = () => {
    if (!userCommand.trim()) return;

    executeAutonomousMutation.mutate({
      organism_id: organism.id,
      user_command: userCommand.trim(),
      priority,
      context: {
        timestamp: new Date(),
        user_initiated: true
      }
    });
  };

  const handleSelfReplication = () => {
    if (!replicationPurpose.trim()) return;

    selfReplicateMutation.mutate({
      organism_id: organism.id,
      replication_purpose: replicationPurpose.trim(),
      target_improvements: ['enhanced_processing', 'improved_learning'],
      resource_allocation: {
        cpu_cores: 2,
        memory_gb: 4
      }
    });
  };

  const handleComputerOperation = () => {
    try {
      const details = JSON.parse(operationDetails);
      computerOperationMutation.mutate({
        organism_id: organism.id,
        operation_type: operationType,
        operation_details: details,
        safety_constraints: ['no_system_modification', 'read_only_access']
      });
    } catch (error) {
      toast({
        title: 'Invalid Operation Details',
        description: 'Please provide valid JSON for operation details.',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'evolving': return 'bg-blue-100 text-blue-800';
      case 'merging': return 'bg-purple-100 text-purple-800';
      case 'healing': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2 text-blue-600" />
            Autonomous Control Panel - {organism.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <Badge className={getStatusColor(organism.status)}>
                {organism.status}
              </Badge>
              <p className="text-sm text-gray-600 mt-1">Status</p>
            </div>
            <div className="text-center">
              <span className="text-lg font-bold text-gray-900">Gen {organism.generation}</span>
              <p className="text-sm text-gray-600">Generation</p>
            </div>
            <div className="text-center">
              <span className="text-lg font-bold text-gray-900">{organism.capabilities.length}</span>
              <p className="text-sm text-gray-600">Capabilities</p>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-4">
            <Button
              variant={isExecuting ? "destructive" : "default"}
              onClick={() => setIsExecuting(!isExecuting)}
              className="flex items-center"
            >
              {isExecuting ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsExecuting(false)}
              className="flex items-center"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2 text-orange-600" />
              Autonomous Command Execution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="command">User Command</Label>
              <Textarea
                id="command"
                value={userCommand}
                onChange={(e) => setUserCommand(e.target.value)}
                placeholder="Enter your command for autonomous execution..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="priority">Priority Level</Label>
              <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="critical">Critical Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleAutonomousExecution}
              disabled={!userCommand.trim() || executeAutonomousMutation.isPending}
              className="w-full"
            >
              {executeAutonomousMutation.isPending ? 'Executing...' : 'Execute Command'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2 text-purple-600" />
              Self-Replication Control
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="replication-purpose">Replication Purpose</Label>
              <Input
                id="replication-purpose"
                value={replicationPurpose}
                onChange={(e) => setReplicationPurpose(e.target.value)}
                placeholder="e.g., Handle complex parallel tasks"
              />
            </div>

            <div className="text-sm text-gray-600">
              <p><strong>Target Improvements:</strong></p>
              <ul className="list-disc list-inside mt-1">
                <li>Enhanced processing capabilities</li>
                <li>Improved learning efficiency</li>
                <li>Specialized task handling</li>
              </ul>
            </div>

            <Button 
              onClick={handleSelfReplication}
              disabled={!replicationPurpose.trim() || selfReplicateMutation.isPending}
              className="w-full"
            >
              {selfReplicateMutation.isPending ? 'Replicating...' : 'Self-Replicate'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Computer Operation Control</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="operation-type">Operation Type</Label>
              <Select value={operationType} onValueChange={(value: any) => setOperationType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="file_system">File System</SelectItem>
                  <SelectItem value="network">Network</SelectItem>
                  <SelectItem value="process">Process Management</SelectItem>
                  <SelectItem value="system_info">System Information</SelectItem>
                  <SelectItem value="automation">Automation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="operation-details">Operation Details (JSON)</Label>
              <Textarea
                id="operation-details"
                value={operationDetails}
                onChange={(e) => setOperationDetails(e.target.value)}
                placeholder='{"action": "list", "path": "/home"}'
                rows={2}
              />
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">
              <strong>Safety Notice:</strong> All computer operations are executed with safety constraints. 
              System-modifying operations are restricted.
            </p>
          </div>

          <Button 
            onClick={handleComputerOperation}
            disabled={computerOperationMutation.isPending}
            className="w-full"
          >
            {computerOperationMutation.isPending ? 'Executing...' : 'Execute Operation'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutonomousControl;
