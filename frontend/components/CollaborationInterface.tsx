import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Users, Zap, Vote, Network, MessageSquare } from 'lucide-react';
import backend from '~backend/client';
import type { Organism } from '~backend/organism/types';

interface CollaborationInterfaceProps {
  organism: Organism;
}

const CollaborationInterface = ({ organism }: CollaborationInterfaceProps) => {
  const [collaborationType, setCollaborationType] = useState<'task_solving' | 'knowledge_sharing' | 'skill_development' | 'research_project'>('task_solving');
  const [objective, setObjective] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [swarmStrategy, setSwarmStrategy] = useState<'distributed' | 'hierarchical' | 'emergent'>('distributed');
  const [coordinationMethod, setCoordinationMethod] = useState<'consensus' | 'leader_follower' | 'democratic'>('consensus');
  const [taskDescription, setTaskDescription] = useState('');
  const [decisionTopic, setDecisionTopic] = useState('');
  const [decisionMethod, setDecisionMethod] = useState<'voting' | 'consensus' | 'weighted_expertise'>('consensus');
  const [decisionOptions, setDecisionOptions] = useState<string[]>(['']);
  const [networkName, setNetworkName] = useState('');
  const [knowledgeDomains, setKnowledgeDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: organisms } = useQuery({
    queryKey: ['organisms'],
    queryFn: () => backend.organism.list(),
  });

  const initiateCollaborationMutation = useMutation({
    mutationFn: (data: any) => backend.organism.initiateCollaboration(data),
    onSuccess: (result) => {
      toast({
        title: 'Collaboration Started',
        description: `Collaboration "${result.collaboration_id}" has been initiated.`,
      });
      queryClient.invalidateQueries({ queryKey: ['organisms'] });
    },
    onError: (error) => {
      console.error('Collaboration failed:', error);
      toast({
        title: 'Collaboration Failed',
        description: 'Failed to initiate collaboration.',
        variant: 'destructive',
      });
    },
  });

  const createSwarmTaskMutation = useMutation({
    mutationFn: (data: any) => backend.organism.createSwarmTask(data),
    onSuccess: (result) => {
      toast({
        title: 'Swarm Task Created',
        description: `Swarm "${result.swarm_id}" has been created with ${Object.keys(result.task_assignments).length} participants.`,
      });
    },
    onError: (error) => {
      console.error('Swarm task creation failed:', error);
      toast({
        title: 'Swarm Creation Failed',
        description: 'Failed to create swarm task.',
        variant: 'destructive',
      });
    },
  });

  const makeCollectiveDecisionMutation = useMutation({
    mutationFn: (data: any) => backend.organism.makeCollectiveDecision(data),
    onSuccess: (result) => {
      toast({
        title: 'Decision Made',
        description: `Collective decision completed: ${result.decision_result.chosen_option}`,
      });
    },
    onError: (error) => {
      console.error('Collective decision failed:', error);
      toast({
        title: 'Decision Failed',
        description: 'Failed to make collective decision.',
        variant: 'destructive',
      });
    },
  });

  const createKnowledgeNetworkMutation = useMutation({
    mutationFn: (data: any) => backend.organism.createKnowledgeNetwork(data),
    onSuccess: (result) => {
      toast({
        title: 'Knowledge Network Created',
        description: `Network "${result.network_id}" has been established.`,
      });
    },
    onError: (error) => {
      console.error('Knowledge network creation failed:', error);
      toast({
        title: 'Network Creation Failed',
        description: 'Failed to create knowledge network.',
        variant: 'destructive',
      });
    },
  });

  const handleInitiateCollaboration = () => {
    if (!objective.trim() || participantIds.length === 0) return;

    initiateCollaborationMutation.mutate({
      initiator_organism_id: organism.id,
      participant_organism_ids: participantIds,
      collaboration_type: collaborationType,
      objective: objective.trim(),
      duration_hours: 24
    });
  };

  const handleCreateSwarmTask = () => {
    if (!taskDescription.trim() || participantIds.length < 2) return;

    createSwarmTaskMutation.mutate({
      task_description: taskDescription.trim(),
      participant_organism_ids: participantIds,
      swarm_strategy: swarmStrategy,
      coordination_method: coordinationMethod
    });
  };

  const handleMakeCollectiveDecision = () => {
    if (!decisionTopic.trim() || participantIds.length === 0) return;

    const validOptions = decisionOptions.filter(opt => opt.trim().length > 0);
    if (validOptions.length < 2) {
      toast({
        title: 'Invalid Options',
        description: 'Please provide at least 2 decision options.',
        variant: 'destructive',
      });
      return;
    }

    makeCollectiveDecisionMutation.mutate({
      decision_topic: decisionTopic.trim(),
      participant_organism_ids: participantIds,
      decision_method: decisionMethod,
      options: validOptions
    });
  };

  const handleCreateKnowledgeNetwork = () => {
    if (!networkName.trim() || participantIds.length === 0 || knowledgeDomains.length === 0) return;

    createKnowledgeNetworkMutation.mutate({
      network_name: networkName.trim(),
      founding_organism_ids: [organism.id, ...participantIds],
      knowledge_domains: knowledgeDomains,
      sharing_protocols: {
        auto_share: true,
        confidence_threshold: 0.7,
        update_frequency: 'real_time'
      }
    });
  };

  const addDomain = () => {
    if (newDomain.trim() && !knowledgeDomains.includes(newDomain.trim())) {
      setKnowledgeDomains([...knowledgeDomains, newDomain.trim()]);
      setNewDomain('');
    }
  };

  const removeDomain = (domain: string) => {
    setKnowledgeDomains(knowledgeDomains.filter(d => d !== domain));
  };

  const addDecisionOption = () => {
    setDecisionOptions([...decisionOptions, '']);
  };

  const updateDecisionOption = (index: number, value: string) => {
    const updated = [...decisionOptions];
    updated[index] = value;
    setDecisionOptions(updated);
  };

  const removeDecisionOption = (index: number) => {
    if (decisionOptions.length > 1) {
      setDecisionOptions(decisionOptions.filter((_, i) => i !== index));
    }
  };

  const availableOrganisms = organisms?.organisms.filter(o => o.id !== organism.id && o.status === 'active') || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-blue-600" />
            Collaboration Interface - {organism.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Facilitate collaboration, swarm intelligence, and collective decision-making between organisms.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="collaboration" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
          <TabsTrigger value="swarm">Swarm Tasks</TabsTrigger>
          <TabsTrigger value="decisions">Decisions</TabsTrigger>
          <TabsTrigger value="networks">Networks</TabsTrigger>
        </TabsList>

        <TabsContent value="collaboration">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-green-600" />
                Initiate Collaboration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="collaboration-type">Collaboration Type</Label>
                  <Select value={collaborationType} onValueChange={(value: any) => setCollaborationType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="task_solving">Task Solving</SelectItem>
                      <SelectItem value="knowledge_sharing">Knowledge Sharing</SelectItem>
                      <SelectItem value="skill_development">Skill Development</SelectItem>
                      <SelectItem value="research_project">Research Project</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="participants">Participant Organisms</Label>
                  <Select 
                    value="" 
                    onValueChange={(value) => {
                      if (value && !participantIds.includes(value)) {
                        setParticipantIds([...participantIds, value]);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Add participants" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableOrganisms.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name} (Gen {org.generation})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {participantIds.map((id) => {
                  const org = availableOrganisms.find(o => o.id === id);
                  return org ? (
                    <Badge key={id} variant="secondary" className="flex items-center gap-1">
                      {org.name}
                      <button 
                        onClick={() => setParticipantIds(participantIds.filter(pid => pid !== id))}
                        className="ml-1 text-xs"
                      >
                        ×
                      </button>
                    </Badge>
                  ) : null;
                })}
              </div>

              <div>
                <Label htmlFor="objective">Collaboration Objective</Label>
                <Textarea
                  id="objective"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Describe the collaboration objective..."
                  rows={3}
                />
              </div>

              <Button 
                onClick={handleInitiateCollaboration}
                disabled={!objective.trim() || participantIds.length === 0 || initiateCollaborationMutation.isPending}
                className="w-full"
              >
                {initiateCollaborationMutation.isPending ? 'Initiating...' : 'Initiate Collaboration'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="swarm">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2 text-purple-600" />
                Swarm Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="task-description">Task Description</Label>
                <Textarea
                  id="task-description"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Describe the task for swarm execution..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="swarm-strategy">Swarm Strategy</Label>
                  <Select value={swarmStrategy} onValueChange={(value: any) => setSwarmStrategy(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="distributed">Distributed</SelectItem>
                      <SelectItem value="hierarchical">Hierarchical</SelectItem>
                      <SelectItem value="emergent">Emergent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="coordination-method">Coordination Method</Label>
                  <Select value={coordinationMethod} onValueChange={(value: any) => setCoordinationMethod(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consensus">Consensus</SelectItem>
                      <SelectItem value="leader_follower">Leader-Follower</SelectItem>
                      <SelectItem value="democratic">Democratic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleCreateSwarmTask}
                disabled={!taskDescription.trim() || participantIds.length < 2 || createSwarmTaskMutation.isPending}
                className="w-full"
              >
                {createSwarmTaskMutation.isPending ? 'Creating Swarm...' : 'Create Swarm Task'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decisions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Vote className="h-5 w-5 mr-2 text-orange-600" />
                Collective Decision Making
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="decision-topic">Decision Topic</Label>
                <Input
                  id="decision-topic"
                  value={decisionTopic}
                  onChange={(e) => setDecisionTopic(e.target.value)}
                  placeholder="What decision needs to be made?"
                />
              </div>

              <div>
                <Label htmlFor="decision-method">Decision Method</Label>
                <Select value={decisionMethod} onValueChange={(value: any) => setDecisionMethod(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="voting">Voting</SelectItem>
                    <SelectItem value="consensus">Consensus</SelectItem>
                    <SelectItem value="weighted_expertise">Weighted Expertise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Decision Options</Label>
                <div className="space-y-2">
                  {decisionOptions.map((option, index) => (
                    <div key={index} className="flex space-x-2">
                      <Input
                        value={option}
                        onChange={(e) => updateDecisionOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                      />
                      {decisionOptions.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeDecisionOption(index)}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addDecisionOption}>
                    Add Option
                  </Button>
                </div>
              </div>

              <Button 
                onClick={handleMakeCollectiveDecision}
                disabled={!decisionTopic.trim() || participantIds.length === 0 || makeCollectiveDecisionMutation.isPending}
                className="w-full"
              >
                {makeCollectiveDecisionMutation.isPending ? 'Making Decision...' : 'Make Collective Decision'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="networks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Network className="h-5 w-5 mr-2 text-indigo-600" />
                Knowledge Networks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="network-name">Network Name</Label>
                <Input
                  id="network-name"
                  value={networkName}
                  onChange={(e) => setNetworkName(e.target.value)}
                  placeholder="Enter network name"
                />
              </div>

              <div>
                <Label>Knowledge Domains</Label>
                <div className="flex space-x-2 mt-2">
                  <Input
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="Add knowledge domain"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDomain())}
                  />
                  <Button type="button" onClick={addDomain} variant="outline">
                    Add
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-3">
                  {knowledgeDomains.map((domain) => (
                    <Badge key={domain} variant="secondary" className="flex items-center gap-1">
                      {domain}
                      <button onClick={() => removeDomain(domain)} className="ml-1 text-xs">×</button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3">
                <p className="text-sm text-indigo-800">
                  <strong>Network Benefits:</strong> Enables continuous knowledge sharing, 
                  collaborative learning, and collective intelligence across organisms.
                </p>
              </div>

              <Button 
                onClick={handleCreateKnowledgeNetwork}
                disabled={!networkName.trim() || participantIds.length === 0 || knowledgeDomains.length === 0 || createKnowledgeNetworkMutation.isPending}
                className="w-full"
              >
                {createKnowledgeNetworkMutation.isPending ? 'Creating Network...' : 'Create Knowledge Network'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CollaborationInterface;
