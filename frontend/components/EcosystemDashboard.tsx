import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Activity, TrendingUp, Users, Zap, Settings, BarChart3, Shuffle } from 'lucide-react';
import backend from '~backend/client';

const EcosystemDashboard = () => {
  const [optimizationGoals, setOptimizationGoals] = useState<string[]>([]);
  const [allocationStrategy, setAllocationStrategy] = useState<'performance_based' | 'need_based' | 'balanced' | 'experimental'>('balanced');
  const [evolutionPressure, setEvolutionPressure] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: ecosystemHealth } = useQuery({
    queryKey: ['ecosystem-health'],
    queryFn: () => backend.organism.getEcosystemHealth({ include_metrics: true, include_recommendations: true }),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: diversityAnalysis } = useQuery({
    queryKey: ['diversity-analysis'],
    queryFn: () => backend.organism.analyzeDiversity({
      analysis_dimensions: ['capability_diversity', 'generational_diversity', 'performance_diversity'],
      include_recommendations: true
    }),
  });

  const optimizeEcosystemMutation = useMutation({
    mutationFn: (data: any) => backend.organism.optimizeEcosystem(data),
    onSuccess: () => {
      toast({
        title: 'Ecosystem Optimization Complete',
        description: 'Ecosystem has been optimized for better performance.',
      });
      queryClient.invalidateQueries({ queryKey: ['ecosystem-health'] });
      queryClient.invalidateQueries({ queryKey: ['organisms'] });
    },
    onError: (error) => {
      console.error('Ecosystem optimization failed:', error);
      toast({
        title: 'Optimization Failed',
        description: 'Failed to optimize ecosystem.',
        variant: 'destructive',
      });
    },
  });

  const allocateResourcesMutation = useMutation({
    mutationFn: (data: any) => backend.organism.allocateResources(data),
    onSuccess: () => {
      toast({
        title: 'Resource Allocation Complete',
        description: 'Resources have been allocated across organisms.',
      });
      queryClient.invalidateQueries({ queryKey: ['organisms'] });
    },
    onError: (error) => {
      console.error('Resource allocation failed:', error);
      toast({
        title: 'Allocation Failed',
        description: 'Failed to allocate resources.',
        variant: 'destructive',
      });
    },
  });

  const guideEvolutionMutation = useMutation({
    mutationFn: (data: any) => backend.organism.guideEcosystemEvolution(data),
    onSuccess: () => {
      toast({
        title: 'Evolution Guidance Applied',
        description: 'Ecosystem evolution has been guided based on specified pressures.',
      });
      queryClient.invalidateQueries({ queryKey: ['ecosystem-health'] });
      queryClient.invalidateQueries({ queryKey: ['organisms'] });
    },
    onError: (error) => {
      console.error('Evolution guidance failed:', error);
      toast({
        title: 'Evolution Failed',
        description: 'Failed to guide ecosystem evolution.',
        variant: 'destructive',
      });
    },
  });

  const handleOptimizeEcosystem = () => {
    optimizeEcosystemMutation.mutate({
      optimization_goals: optimizationGoals.length > 0 ? optimizationGoals : ['performance_improvement', 'resource_efficiency'],
      constraints: {
        max_organisms: 50,
        preserve_diversity: true
      },
      simulation_mode: false
    });
  };

  const handleAllocateResources = () => {
    allocateResourcesMutation.mutate({
      allocation_strategy: allocationStrategy,
      resource_types: ['cpu_cores', 'memory_gb', 'storage_gb'],
      total_resources: {
        cpu_cores: 100,
        memory_gb: 500,
        storage_gb: 1000
      }
    });
  };

  const handleGuideEvolution = () => {
    guideEvolutionMutation.mutate({
      evolution_pressure: evolutionPressure.length > 0 ? evolutionPressure : ['performance_optimization', 'capability_enhancement'],
      selection_criteria: {
        success_rate: 0.3,
        learning_efficiency: 0.3,
        task_completion: 0.2,
        innovation: 0.2
      },
      mutation_rate: 0.1
    });
  };

  const getHealthColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBadgeColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800';
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Ecosystem Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Monitor and manage the health, diversity, and evolution of your AI organism ecosystem
        </p>
      </div>

      {/* Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Activity className="h-5 w-5 mr-2 text-blue-600" />
              Overall Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(ecosystemHealth?.overall_health_score || 0)}`}>
              {((ecosystemHealth?.overall_health_score || 0) * 100).toFixed(1)}%
            </div>
            <Badge className={getHealthBadgeColor(ecosystemHealth?.overall_health_score || 0)}>
              {(ecosystemHealth?.overall_health_score || 0) >= 0.8 ? 'Excellent' : 
               (ecosystemHealth?.overall_health_score || 0) >= 0.6 ? 'Good' : 'Needs Attention'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {((ecosystemHealth?.performance_trends?.avg_success_rate || 0) * 100).toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600">Average Success Rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Users className="h-5 w-5 mr-2 text-purple-600" />
              Active Organisms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {ecosystemHealth?.organism_distribution?.active || 0}
            </div>
            <p className="text-sm text-gray-600">Currently Active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Zap className="h-5 w-5 mr-2 text-orange-600" />
              Learning Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {((ecosystemHealth?.performance_trends?.avg_learning_efficiency || 0) * 100).toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600">Average Learning Rate</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="health" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="health">Health Monitoring</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="evolution">Evolution</TabsTrigger>
        </TabsList>

        <TabsContent value="health">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Organism Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(ecosystemHealth?.organism_distribution || {}).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      <span className="capitalize">{status.replace('_', ' ')}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Critical Issues</CardTitle>
              </CardHeader>
              <CardContent>
                {ecosystemHealth?.critical_issues?.length ? (
                  <div className="space-y-2">
                    {ecosystemHealth.critical_issues.map((issue, index) => (
                      <Badge key={index} variant="destructive" className="block w-full text-center">
                        {issue}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-green-600 text-center">No critical issues detected</p>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                {ecosystemHealth?.recommendations?.length ? (
                  <div className="space-y-2">
                    {ecosystemHealth.recommendations.map((recommendation, index) => (
                      <div key={index} className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <p className="text-sm text-blue-800">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-center">No recommendations at this time</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="optimization">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2 text-blue-600" />
                Ecosystem Optimization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Optimization Goals</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {[
                    'performance_improvement',
                    'resource_efficiency',
                    'learning_acceleration',
                    'diversity_enhancement',
                    'stability_improvement',
                    'innovation_boost'
                  ].map((goal) => (
                    <label key={goal} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={optimizationGoals.includes(goal)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setOptimizationGoals([...optimizationGoals, goal]);
                          } else {
                            setOptimizationGoals(optimizationGoals.filter(g => g !== goal));
                          }
                        }}
                      />
                      <span className="text-sm capitalize">{goal.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleOptimizeEcosystem}
                disabled={optimizeEcosystemMutation.isPending}
                className="w-full"
              >
                {optimizeEcosystemMutation.isPending ? 'Optimizing...' : 'Optimize Ecosystem'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
                Resource Allocation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Allocation Strategy</label>
                <Select value={allocationStrategy} onValueChange={(value: any) => setAllocationStrategy(value)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="performance_based">Performance Based</SelectItem>
                    <SelectItem value="need_based">Need Based</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="experimental">Experimental</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-lg font-bold">100</div>
                  <p className="text-gray-600">CPU Cores</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">500GB</div>
                  <p className="text-gray-600">Memory</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">1TB</div>
                  <p className="text-gray-600">Storage</p>
                </div>
              </div>

              <Button 
                onClick={handleAllocateResources}
                disabled={allocateResourcesMutation.isPending}
                className="w-full"
              >
                {allocateResourcesMutation.isPending ? 'Allocating...' : 'Allocate Resources'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evolution">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shuffle className="h-5 w-5 mr-2 text-purple-600" />
                Ecosystem Evolution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Evolution Pressures</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {[
                    'performance_optimization',
                    'capability_enhancement',
                    'efficiency_improvement',
                    'adaptability_boost',
                    'innovation_drive',
                    'collaboration_enhancement'
                  ].map((pressure) => (
                    <label key={pressure} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={evolutionPressure.includes(pressure)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEvolutionPressure([...evolutionPressure, pressure]);
                          } else {
                            setEvolutionPressure(evolutionPressure.filter(p => p !== pressure));
                          }
                        }}
                      />
                      <span className="text-sm capitalize">{pressure.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              {diversityAnalysis && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <h4 className="font-medium mb-2">Diversity Analysis</h4>
                  <div className="space-y-2">
                    {Object.entries(diversityAnalysis.diversity_analysis.diversity_scores || {}).map(([dimension, score]) => (
                      <div key={dimension} className="flex justify-between items-center">
                        <span className="text-sm capitalize">{dimension.replace('_', ' ')}</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={(score as number) * 100} className="w-20 h-2" />
                          <span className="text-sm">{((score as number) * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                onClick={handleGuideEvolution}
                disabled={guideEvolutionMutation.isPending}
                className="w-full"
              >
                {guideEvolutionMutation.isPending ? 'Guiding Evolution...' : 'Guide Evolution'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EcosystemDashboard;
