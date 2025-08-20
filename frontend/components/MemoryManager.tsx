import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Brain, Database, Minimize2, Share, History, TrendingUp, Archive, RefreshCw } from 'lucide-react';
import backend from '~backend/client';
import type { Organism } from '~backend/organism/types';

interface MemoryManagerProps {
  organism: Organism;
}

const MemoryManager = ({ organism }: MemoryManagerProps) => {
  const [compressionStrategy, setCompressionStrategy] = useState<'temporal' | 'importance' | 'frequency' | 'hybrid'>('hybrid');
  const [persistenceLevel, setPersistenceLevel] = useState<'session' | 'permanent' | 'critical_only'>('permanent');
  const [transferTarget, setTransferTarget] = useState('');
  const [transferType, setTransferType] = useState<'critical_only' | 'recent_learnings' | 'domain_specific' | 'full_transfer'>('critical_only');
  const [analysisType, setAnalysisType] = useState<'usage_patterns' | 'knowledge_gaps' | 'memory_efficiency' | 'learning_trends'>('memory_efficiency');
  const [memoryStats, setMemoryStats] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: organisms } = useQuery({
    queryKey: ['organisms'],
    queryFn: () => backend.organism.list(),
  });

  const compressMemoriesMutation = useMutation({
    mutationFn: (data: any) => backend.organism.compressMemories(data),
    onSuccess: (result) => {
      toast({
        title: 'Memory Compression Complete',
        description: `Compressed ${result.compressed_memories} memories, ${result.memory_reduction_percentage.toFixed(1)}% reduction.`,
      });
      queryClient.invalidateQueries({ queryKey: ['organisms'] });
    },
    onError: (error) => {
      console.error('Memory compression failed:', error);
      toast({
        title: 'Compression Failed',
        description: 'Failed to compress memories.',
        variant: 'destructive',
      });
    },
  });

  const persistMemoriesMutation = useMutation({
    mutationFn: (data: any) => backend.organism.persistMemories(data),
    onSuccess: () => {
      toast({
        title: 'Memories Persisted',
        description: 'Organism memories have been successfully persisted.',
      });
    },
    onError: (error) => {
      console.error('Memory persistence failed:', error);
      toast({
        title: 'Persistence Failed',
        description: 'Failed to persist memories.',
        variant: 'destructive',
      });
    },
  });

  const transferKnowledgeMutation = useMutation({
    mutationFn: (data: any) => backend.organism.transferKnowledge(data),
    onSuccess: (result) => {
      toast({
        title: 'Knowledge Transfer Complete',
        description: `Transferred ${result.transferred_items} knowledge items.`,
      });
    },
    onError: (error) => {
      console.error('Knowledge transfer failed:', error);
      toast({
        title: 'Transfer Failed',
        description: 'Failed to transfer knowledge.',
        variant: 'destructive',
      });
    },
  });

  const analyzeMemoryMutation = useMutation({
    mutationFn: (data: any) => backend.organism.analyzeMemoryPatterns(data),
    onSuccess: (result) => {
      setMemoryStats(result.analysis_result);
      toast({
        title: 'Memory Analysis Complete',
        description: 'Memory patterns have been analyzed.',
      });
    },
    onError: (error) => {
      console.error('Memory analysis failed:', error);
      toast({
        title: 'Analysis Failed',
        description: 'Failed to analyze memory patterns.',
        variant: 'destructive',
      });
    },
  });

  const optimizeMemoryMutation = useMutation({
    mutationFn: (data: any) => backend.organism.optimizeMemoryStructure(data),
    onSuccess: () => {
      toast({
        title: 'Memory Optimization Complete',
        description: 'Memory structure has been optimized.',
      });
      queryClient.invalidateQueries({ queryKey: ['organisms'] });
    },
    onError: (error) => {
      console.error('Memory optimization failed:', error);
      toast({
        title: 'Optimization Failed',
        description: 'Failed to optimize memory structure.',
        variant: 'destructive',
      });
    },
  });

  const inheritMemoriesMutation = useMutation({
    mutationFn: (data: any) => backend.organism.inheritMemories(data),
    onSuccess: (result) => {
      toast({
        title: 'Memory Inheritance Complete',
        description: `Inherited ${result.inherited_memories} memories and ${result.inherited_knowledge} knowledge items.`,
      });
      queryClient.invalidateQueries({ queryKey: ['organisms'] });
    },
    onError: (error) => {
      console.error('Memory inheritance failed:', error);
      toast({
        title: 'Inheritance Failed',
        description: 'Failed to inherit memories.',
        variant: 'destructive',
      });
    },
  });

  const handleCompressMemories = () => {
    compressMemoriesMutation.mutate({
      organism_id: organism.id,
      compression_strategy: compressionStrategy,
      retention_threshold: 0.7,
      max_memory_size: 10000
    });
  };

  const handlePersistMemories = () => {
    persistMemoriesMutation.mutate({
      organism_id: organism.id,
      persistence_level: persistenceLevel,
      backup_location: 'default'
    });
  };

  const handleTransferKnowledge = () => {
    if (!transferTarget) return;

    transferKnowledgeMutation.mutate({
      source_organism_id: organism.id,
      target_organism_id: transferTarget,
      transfer_type: transferType,
      importance_threshold: 0.6
    });
  };

  const handleAnalyzeMemory = () => {
    analyzeMemoryMutation.mutate({
      organism_id: organism.id,
      analysis_type: analysisType
    });
  };

  const handleOptimizeMemory = () => {
    optimizeMemoryMutation.mutate({
      organism_id: organism.id,
      optimization_goals: ['access_speed', 'memory_efficiency', 'learning_enhancement'],
      constraints: { max_memory_size: 15000 }
    });
  };

  const handleInheritFromParent = () => {
    if (!organism.parent_id) {
      toast({
        title: 'No Parent Found',
        description: 'This organism has no parent to inherit from.',
        variant: 'destructive',
      });
      return;
    }

    inheritMemoriesMutation.mutate({
      parent_organism_id: organism.parent_id,
      child_organism_id: organism.id,
      inheritance_strategy: 'adaptive',
      inheritance_ratio: 0.3
    });
  };

  const getMemorySize = () => {
    return JSON.stringify(organism.memory).length;
  };

  const getMemoryComplexity = () => {
    const memoryKeys = Object.keys(organism.memory);
    return memoryKeys.length;
  };

  const availableOrganisms = organisms?.organisms.filter(o => o.id !== organism.id) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2 text-blue-600" />
            Memory Management - {organism.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{getMemorySize()}</div>
              <p className="text-sm text-gray-600">Memory Size (bytes)</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{getMemoryComplexity()}</div>
              <p className="text-sm text-gray-600">Memory Categories</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{organism.memory_version || 1}</div>
              <p className="text-sm text-gray-600">Memory Version</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {((organism.memory_optimization_score || 0.5) * 100).toFixed(0)}%
              </div>
              <p className="text-sm text-gray-600">Optimization Score</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="compression" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="compression">Compression</TabsTrigger>
          <TabsTrigger value="persistence">Persistence</TabsTrigger>
          <TabsTrigger value="transfer">Transfer</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="inheritance">Inheritance</TabsTrigger>
        </TabsList>

        <TabsContent value="compression">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Minimize2 className="h-5 w-5 mr-2 text-purple-600" />
                Memory Compression
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="compression-strategy">Compression Strategy</Label>
                <Select value={compressionStrategy} onValueChange={(value: any) => setCompressionStrategy(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="temporal">Temporal (Keep Recent)</SelectItem>
                    <SelectItem value="importance">Importance (Keep Critical)</SelectItem>
                    <SelectItem value="frequency">Frequency (Keep Accessed)</SelectItem>
                    <SelectItem value="hybrid">Hybrid (Balanced)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>Compression Benefits:</strong> Reduces memory overhead, improves access speed, 
                  and maintains critical learnings while removing redundant information.
                </p>
              </div>

              <Button 
                onClick={handleCompressMemories}
                disabled={compressMemoriesMutation.isPending}
                className="w-full"
              >
                {compressMemoriesMutation.isPending ? 'Compressing...' : 'Compress Memories'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="persistence">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Archive className="h-5 w-5 mr-2 text-green-600" />
                Memory Persistence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="persistence-level">Persistence Level</Label>
                <Select value={persistenceLevel} onValueChange={(value: any) => setPersistenceLevel(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="session">Session Only</SelectItem>
                    <SelectItem value="permanent">Permanent Storage</SelectItem>
                    <SelectItem value="critical_only">Critical Memories Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <p className="text-sm text-green-800">
                  <strong>Persistence Ensures:</strong> Memories survive system restarts, organism evolution, 
                  and can be restored when needed. Critical memories are always preserved.
                </p>
              </div>

              <Button 
                onClick={handlePersistMemories}
                disabled={persistMemoriesMutation.isPending}
                className="w-full"
              >
                {persistMemoriesMutation.isPending ? 'Persisting...' : 'Persist Memories'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfer">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Share className="h-5 w-5 mr-2 text-orange-600" />
                Knowledge Transfer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="transfer-target">Target Organism</Label>
                <Select value={transferTarget} onValueChange={setTransferTarget}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target organism" />
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

              <div>
                <Label htmlFor="transfer-type">Transfer Type</Label>
                <Select value={transferType} onValueChange={(value: any) => setTransferType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical_only">Critical Knowledge Only</SelectItem>
                    <SelectItem value="recent_learnings">Recent Learnings</SelectItem>
                    <SelectItem value="domain_specific">Domain Specific</SelectItem>
                    <SelectItem value="full_transfer">Full Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                <p className="text-sm text-orange-800">
                  <strong>Transfer Impact:</strong> Shares valuable knowledge with other organisms, 
                  accelerating their learning and improving collective intelligence.
                </p>
              </div>

              <Button 
                onClick={handleTransferKnowledge}
                disabled={!transferTarget || transferKnowledgeMutation.isPending}
                className="w-full"
              >
                {transferKnowledgeMutation.isPending ? 'Transferring...' : 'Transfer Knowledge'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-red-600" />
                Memory Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="analysis-type">Analysis Type</Label>
                <Select value={analysisType} onValueChange={(value: any) => setAnalysisType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usage_patterns">Usage Patterns</SelectItem>
                    <SelectItem value="knowledge_gaps">Knowledge Gaps</SelectItem>
                    <SelectItem value="memory_efficiency">Memory Efficiency</SelectItem>
                    <SelectItem value="learning_trends">Learning Trends</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleAnalyzeMemory}
                disabled={analyzeMemoryMutation.isPending}
                className="w-full"
              >
                {analyzeMemoryMutation.isPending ? 'Analyzing...' : 'Analyze Memory Patterns'}
              </Button>

              {memoryStats && (
                <div className="mt-4 space-y-3">
                  <h4 className="font-medium">Analysis Results</h4>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm mb-2"><strong>Summary:</strong> {memoryStats.analysis_summary}</p>
                    
                    {memoryStats.insights && (
                      <div className="mb-2">
                        <p className="text-sm font-medium">Key Insights:</p>
                        <ul className="text-xs list-disc list-inside">
                          {memoryStats.insights.map((insight: string, index: number) => (
                            <li key={index}>{insight}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {memoryStats.recommendations && (
                      <div>
                        <p className="text-sm font-medium">Recommendations:</p>
                        <ul className="text-xs list-disc list-inside">
                          {memoryStats.recommendations.map((rec: string, index: number) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Button 
                  onClick={handleOptimizeMemory}
                  disabled={optimizeMemoryMutation.isPending}
                  variant="outline"
                  className="w-full"
                >
                  {optimizeMemoryMutation.isPending ? 'Optimizing...' : 'Optimize Memory Structure'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inheritance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="h-5 w-5 mr-2 text-indigo-600" />
                Memory Inheritance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Parent Organism:</span>
                  <p className="font-medium">
                    {organism.parent_id ? 'Available' : 'No Parent'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Generation:</span>
                  <p className="font-medium">{organism.generation}</p>
                </div>
              </div>

              {organism.parent_id && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3">
                  <p className="text-sm text-indigo-800">
                    <strong>Inheritance Available:</strong> This organism can inherit critical memories 
                    and knowledge from its parent to accelerate learning and avoid repeating mistakes.
                  </p>
                </div>
              )}

              <Button 
                onClick={handleInheritFromParent}
                disabled={!organism.parent_id || inheritMemoriesMutation.isPending}
                className="w-full"
              >
                {inheritMemoriesMutation.isPending ? 'Inheriting...' : 'Inherit from Parent'}
              </Button>

              {organism.memory.inheritance_history && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Inheritance History</h4>
                  <div className="space-y-2">
                    {organism.memory.inheritance_history.map((inheritance: any, index: number) => (
                      <div key={index} className="bg-gray-50 p-2 rounded text-xs">
                        <p><strong>Strategy:</strong> {inheritance.strategy}</p>
                        <p><strong>Date:</strong> {new Date(inheritance.inherited_at).toLocaleDateString()}</p>
                        <p><strong>Items:</strong> {inheritance.inherited_keys?.length || 0}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MemoryManager;
