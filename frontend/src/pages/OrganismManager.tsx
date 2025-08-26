import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Brain, Plus, Zap, Sparkles, Settings, Search, Database, Activity, Users } from 'lucide-react';
import backend from '~backend/client';
import type { Organism } from '~backend/organism/types';
import CreateOrganismDialog from './CreateOrganismDialog';
import OrganismDetails from './OrganismDetails';
import AutonomousControl from './AutonomousControl';
import RAGInterface from './RAGInterface';
import MemoryManager from './MemoryManager';
import LearningInterface from './LearningInterface';
import CollaborationInterface from './CollaborationInterface';
import EcosystemDashboard from './EcosystemDashboard';
import ErrorBoundary from './ErrorBoundary';

const OrganismManager = () => {
  const [selectedOrganism, setSelectedOrganism] = useState<Organism | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [viewMode, setViewMode] = useState<'organisms' | 'ecosystem'>('organisms');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: organisms, isLoading } = useQuery({
    queryKey: ['organisms'],
    queryFn: () => backend.organism.list(),
  });

  const evolveMutation = useMutation({
    mutationFn: (organismId: string) => 
      backend.organism.evolve({
        organism_id: organismId,
        evolution_triggers: ['performance_optimization', 'capability_enhancement'],
        target_improvements: ['processing_speed', 'error_recovery', 'learning_efficiency']
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisms'] });
      toast({
        title: 'Evolution Successful',
        description: 'Organism has evolved to a new generation.',
      });
    },
    onError: (error) => {
      console.error('Evolution failed:', error);
      toast({
        title: 'Evolution Failed',
        description: 'Failed to evolve organism. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const healMutation = useMutation({
    mutationFn: (organismId: string) =>
      backend.organism.heal({
        organism_id: organismId,
        error_context: { error_type: 'general_maintenance' },
        recovery_strategy: 'auto_heal'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisms'] });
      toast({
        title: 'Healing Complete',
        description: 'Organism has been healed and restored.',
      });
    },
    onError: (error) => {
      console.error('Healing failed:', error);
      toast({
        title: 'Healing Failed',
        description: 'Failed to heal organism. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: (organismId: string) =>
      backend.organism.upgradeOrganism({
        organism_id: organismId,
        upgrade_type: 'performance',
        upgrade_source: 'self_analysis'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisms'] });
      toast({
        title: 'Upgrade Initiated',
        description: 'Organism upgrade process has been started.',
      });
    },
    onError: (error) => {
      console.error('Upgrade failed:', error);
      toast({
        title: 'Upgrade Failed',
        description: 'Failed to initiate organism upgrade.',
        variant: 'destructive',
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'evolving': return 'bg-blue-100 text-blue-800';
      case 'merging': return 'bg-purple-100 text-purple-800';
      case 'healing': return 'bg-yellow-100 text-yellow-800';
      case 'deprecated': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (viewMode === 'ecosystem') {
    return (
      <ErrorBoundary>
        <EcosystemDashboard />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Organism Manager</h1>
            <p className="text-gray-600 mt-2">
              Create, evolve, and manage your autonomous AI organisms
            </p>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant={viewMode === 'organisms' ? 'default' : 'outline'}
              onClick={() => setViewMode('organisms')}
            >
              <Brain className="h-4 w-4 mr-2" />
              Organisms
            </Button>
            <Button 
              variant={viewMode === 'ecosystem' ? 'default' : 'outline'}
              onClick={() => setViewMode('ecosystem')}
            >
              <Activity className="h-4 w-4 mr-2" />
              Ecosystem
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Organism
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {organisms?.organisms.map((organism) => (
                <Card 
                  key={organism.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedOrganism(organism)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center">
                        <Brain className="h-5 w-5 mr-2 text-blue-600" />
                        {organism.name}
                      </CardTitle>
                      <Badge className={getStatusColor(organism.status)}>
                        {organism.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Generation:</span>
                        <span className="font-medium">{organism.generation}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Capabilities:</span>
                        <span className="font-medium">{organism.capabilities.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Success Rate:</span>
                        <span className="font-medium">
                          {(organism.performance_metrics.success_rate * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Memory Size:</span>
                        <span className="font-medium">
                          {JSON.stringify(organism.memory).length} bytes
                        </span>
                      </div>
                      
                      <div className="flex space-x-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            evolveMutation.mutate(organism.id);
                          }}
                          disabled={organism.status !== 'active'}
                        >
                          <Sparkles className="h-3 w-3 mr-1" />
                          Evolve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            healMutation.mutate(organism.id);
                          }}
                          disabled={organism.status === 'healing'}
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          Heal
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            upgradeMutation.mutate(organism.id);
                          }}
                          disabled={organism.status !== 'active'}
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          Upgrade
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="lg:col-span-1">
            {selectedOrganism ? (
              <ErrorBoundary>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="control">Control</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="mt-4">
                    <OrganismDetails 
                      organism={selectedOrganism} 
                      onClose={() => setSelectedOrganism(null)}
                    />
                  </TabsContent>
                  
                  <TabsContent value="control" className="mt-4">
                    <Tabs defaultValue="autonomous">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="autonomous">Autonomous</TabsTrigger>
                        <TabsTrigger value="rag">RAG</TabsTrigger>
                        <TabsTrigger value="collaboration">Collaborate</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="autonomous" className="mt-4">
                        <AutonomousControl organism={selectedOrganism} />
                      </TabsContent>
                      
                      <TabsContent value="rag" className="mt-4">
                        <RAGInterface organism={selectedOrganism} />
                      </TabsContent>
                      
                      <TabsContent value="collaboration" className="mt-4">
                        <CollaborationInterface organism={selectedOrganism} />
                      </TabsContent>
                    </Tabs>
                  </TabsContent>
                  
                  <TabsContent value="advanced" className="mt-4">
                    <Tabs defaultValue="memory">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="memory">Memory</TabsTrigger>
                        <TabsTrigger value="learning">Learning</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="memory" className="mt-4">
                        <MemoryManager organism={selectedOrganism} />
                      </TabsContent>
                      
                      <TabsContent value="learning" className="mt-4">
                        <LearningInterface organism={selectedOrganism} />
                      </TabsContent>
                    </Tabs>
                  </TabsContent>
                </Tabs>
              </ErrorBoundary>
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Select an organism to view details and controls</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <CreateOrganismDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
        />
      </div>
    </ErrorBoundary>
  );
};

export default OrganismManager;
