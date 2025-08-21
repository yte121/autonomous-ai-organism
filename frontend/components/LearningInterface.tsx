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
import { BookOpen, Code, Users, TrendingUp, Globe, Brain } from 'lucide-react';
import backend from '~backend/client';
import type { Organism } from '~backend/organism/types';

interface LearningInterfaceProps {
  organism: Organism;
}

const LearningInterface = ({ organism }: LearningInterfaceProps) => {
  const [learningType, setLearningType] = useState<'codebase_analysis' | 'internet_research' | 'peer_learning' | 'experiential_learning'>('codebase_analysis');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [analysisFocus, setAnalysisFocus] = useState<string[]>([]);
  const [newFocus, setNewFocus] = useState('');
  const [extractionDepth, setExtractionDepth] = useState<'shallow' | 'medium' | 'deep'>('medium');
  const [learningObjectives, setLearningObjectives] = useState<string[]>([]);
  const [newObjective, setNewObjective] = useState('');
  const [depthLevel, setDepthLevel] = useState<'surface' | 'deep' | 'comprehensive'>('deep');
  const [teacherOrganisms, setTeacherOrganisms] = useState<string[]>([]);
  const [collaborationMode, setCollaborationMode] = useState<'knowledge_transfer' | 'collaborative_problem_solving' | 'skill_sharing'>('knowledge_transfer');
  const [learningTopics, setLearningTopics] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: organisms } = useQuery({
    queryKey: ['organisms'],
    queryFn: () => backend.organism.list(),
  });

  const advancedLearningMutation = useMutation({
    mutationFn: (data: any) => backend.organism.advancedLearning(data),
    onSuccess: (result) => {
      toast({
        title: 'Learning Session Complete',
        description: `Acquired ${result.knowledge_acquired.length} knowledge entries and ${result.new_capabilities.length} new capabilities.`,
      });
      queryClient.invalidateQueries({ queryKey: ['organisms'] });
    },
    onError: (error) => {
      console.error('Advanced learning failed:', error);
      toast({
        title: 'Learning Failed',
        description: 'Failed to complete learning session.',
        variant: 'destructive',
      });
    },
  });

  const analyzeCodebaseMutation = useMutation({
    mutationFn: (data: any) => backend.organism.analyzeCodebase(data),
    onSuccess: () => {
      toast({
        title: 'Codebase Analysis Complete',
        description: 'Repository has been analyzed and knowledge extracted.',
      });
      queryClient.invalidateQueries({ queryKey: ['organisms'] });
    },
    onError: (error) => {
      console.error('Codebase analysis failed:', error);
      toast({
        title: 'Analysis Failed',
        description: 'Failed to analyze codebase.',
        variant: 'destructive',
      });
    },
  });

  const peerLearningMutation = useMutation({
    mutationFn: (data: any) => backend.organism.peerLearning(data),
    onSuccess: () => {
      toast({
        title: 'Peer Learning Complete',
        description: 'Knowledge has been successfully shared between organisms.',
      });
      queryClient.invalidateQueries({ queryKey: ['organisms'] });
    },
    onError: (error) => {
      console.error('Peer learning failed:', error);
      toast({
        title: 'Peer Learning Failed',
        description: 'Failed to facilitate peer learning.',
        variant: 'destructive',
      });
    },
  });

  const addFocus = () => {
    if (newFocus.trim() && !analysisFocus.includes(newFocus.trim())) {
      setAnalysisFocus([...analysisFocus, newFocus.trim()]);
      setNewFocus('');
    }
  };

  const removeFocus = (focus: string) => {
    setAnalysisFocus(analysisFocus.filter(f => f !== focus));
  };

  const addObjective = () => {
    if (newObjective.trim() && !learningObjectives.includes(newObjective.trim())) {
      setLearningObjectives([...learningObjectives, newObjective.trim()]);
      setNewObjective('');
    }
  };

  const removeObjective = (objective: string) => {
    setLearningObjectives(learningObjectives.filter(o => o !== objective));
  };

  const addTopic = () => {
    if (newTopic.trim() && !learningTopics.includes(newTopic.trim())) {
      setLearningTopics([...learningTopics, newTopic.trim()]);
      setNewTopic('');
    }
  };

  const removeTopic = (topic: string) => {
    setLearningTopics(learningTopics.filter(t => t !== topic));
  };

  const handleAdvancedLearning = () => {
    const sourceData: Record<string, any> = {};
    
    if (learningType === 'codebase_analysis') {
      sourceData.repository_url = repositoryUrl;
      sourceData.analysis_focus = analysisFocus;
      sourceData.extraction_depth = extractionDepth;
    } else if (learningType === 'peer_learning') {
      sourceData.teacher_organisms = teacherOrganisms;
      sourceData.collaboration_mode = collaborationMode;
      sourceData.learning_topics = learningTopics;
    }

    advancedLearningMutation.mutate({
      organism_id: organism.id,
      learning_type: learningType,
      source_data: sourceData,
      learning_objectives: learningObjectives,
      depth_level: depthLevel
    });
  };

  const handleCodebaseAnalysis = () => {
    if (!repositoryUrl.trim() || analysisFocus.length === 0) return;

    analyzeCodebaseMutation.mutate({
      organism_id: organism.id,
      repository_url: repositoryUrl.trim(),
      analysis_focus: analysisFocus,
      extraction_depth: extractionDepth
    });
  };

  const handlePeerLearning = () => {
    if (teacherOrganisms.length === 0 || learningTopics.length === 0) return;

    peerLearningMutation.mutate({
      learner_organism_id: organism.id,
      teacher_organism_ids: teacherOrganisms,
      learning_topics: learningTopics,
      collaboration_mode: collaborationMode
    });
  };

  const availableOrganisms = organisms?.organisms.filter(o => o.id !== organism.id && o.status === 'active') || [];

  const predefinedFocus = [
    'architecture_patterns',
    'performance_optimization',
    'error_handling',
    'testing_strategies',
    'code_quality',
    'security_practices',
    'scalability_patterns',
    'documentation_standards'
  ];

  const predefinedObjectives = [
    'improve_code_quality',
    'learn_new_patterns',
    'enhance_performance',
    'understand_architecture',
    'master_best_practices',
    'develop_expertise',
    'expand_knowledge_base',
    'acquire_new_skills'
  ];

  const predefinedTopics = [
    'design_patterns',
    'algorithms',
    'data_structures',
    'system_design',
    'performance_tuning',
    'debugging_techniques',
    'testing_methodologies',
    'code_review_practices'
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2 text-blue-600" />
            Advanced Learning System - {organism.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Comprehensive learning interface for knowledge acquisition, skill development, and capability enhancement.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="advanced" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="advanced">Advanced Learning</TabsTrigger>
          <TabsTrigger value="codebase">Codebase Analysis</TabsTrigger>
          <TabsTrigger value="peer">Peer Learning</TabsTrigger>
        </TabsList>

        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                Advanced Learning Session
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="learning-type">Learning Type</Label>
                  <Select value={learningType} onValueChange={(value: any) => setLearningType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="codebase_analysis">Codebase Analysis</SelectItem>
                      <SelectItem value="internet_research">Internet Research</SelectItem>
                      <SelectItem value="peer_learning">Peer Learning</SelectItem>
                      <SelectItem value="experiential_learning">Experiential Learning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="depth-level">Learning Depth</Label>
                  <Select value={depthLevel} onValueChange={(value: any) => setDepthLevel(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="surface">Surface Level</SelectItem>
                      <SelectItem value="deep">Deep Learning</SelectItem>
                      <SelectItem value="comprehensive">Comprehensive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Learning Objectives</Label>
                <div className="flex space-x-2 mt-2">
                  <Input
                    value={newObjective}
                    onChange={(e) => setNewObjective(e.target.value)}
                    placeholder="Add learning objective"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addObjective())}
                  />
                  <Button type="button" onClick={addObjective} variant="outline">
                    Add
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-3">
                  {learningObjectives.map((objective) => (
                    <Badge key={objective} variant="secondary" className="flex items-center gap-1">
                      {objective}
                      <button onClick={() => removeObjective(objective)} className="ml-1 text-xs">×</button>
                    </Badge>
                  ))}
                </div>

                <div className="mt-3">
                  <Label className="text-sm text-gray-600">Quick Add:</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {predefinedObjectives.map((objective) => (
                      <Badge
                        key={objective}
                        variant="outline"
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          if (!learningObjectives.includes(objective)) {
                            setLearningObjectives([...learningObjectives, objective]);
                          }
                        }}
                      >
                        {objective}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleAdvancedLearning}
                disabled={learningObjectives.length === 0 || advancedLearningMutation.isPending}
                className="w-full"
              >
                {advancedLearningMutation.isPending ? 'Learning...' : 'Start Advanced Learning'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="codebase">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Code className="h-5 w-5 mr-2 text-purple-600" />
                Codebase Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="repository-url">Repository URL</Label>
                <Input
                  id="repository-url"
                  value={repositoryUrl}
                  onChange={(e) => setRepositoryUrl(e.target.value)}
                  placeholder="https://github.com/user/repository"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="extraction-depth">Extraction Depth</Label>
                  <Select value={extractionDepth} onValueChange={(value: any) => setExtractionDepth(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shallow">Shallow Analysis</SelectItem>
                      <SelectItem value="medium">Medium Depth</SelectItem>
                      <SelectItem value="deep">Deep Analysis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Analysis Focus Areas</Label>
                <div className="flex space-x-2 mt-2">
                  <Input
                    value={newFocus}
                    onChange={(e) => setNewFocus(e.target.value)}
                    placeholder="Add focus area"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFocus())}
                  />
                  <Button type="button" onClick={addFocus} variant="outline">
                    Add
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-3">
                  {analysisFocus.map((focus) => (
                    <Badge key={focus} variant="secondary" className="flex items-center gap-1">
                      {focus}
                      <button onClick={() => removeFocus(focus)} className="ml-1 text-xs">×</button>
                    </Badge>
                  ))}
                </div>

                <div className="mt-3">
                  <Label className="text-sm text-gray-600">Quick Add:</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {predefinedFocus.map((focus) => (
                      <Badge
                        key={focus}
                        variant="outline"
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          if (!analysisFocus.includes(focus)) {
                            setAnalysisFocus([...analysisFocus, focus]);
                          }
                        }}
                      >
                        {focus}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleCodebaseAnalysis}
                disabled={!repositoryUrl.trim() || analysisFocus.length === 0 || analyzeCodebaseMutation.isPending}
                className="w-full"
              >
                {analyzeCodebaseMutation.isPending ? 'Analyzing...' : 'Analyze Codebase'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="peer">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-orange-600" />
                Peer Learning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="teacher-organisms">Teacher Organisms</Label>
                <Select 
                  value="" 
                  onValueChange={(value) => {
                    if (value && !teacherOrganisms.includes(value)) {
                      setTeacherOrganisms([...teacherOrganisms, value]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select teacher organisms" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableOrganisms.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name} (Gen {org.generation})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex flex-wrap gap-2 mt-3">
                  {teacherOrganisms.map((teacherId) => {
                    const teacher = availableOrganisms.find(o => o.id === teacherId);
                    return teacher ? (
                      <Badge key={teacherId} variant="secondary" className="flex items-center gap-1">
                        {teacher.name}
                        <button 
                          onClick={() => setTeacherOrganisms(teacherOrganisms.filter(id => id !== teacherId))} 
                          className="ml-1 text-xs"
                        >
                          ×
                        </button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>

              <div>
                <Label htmlFor="collaboration-mode">Collaboration Mode</Label>
                <Select value={collaborationMode} onValueChange={(value: any) => setCollaborationMode(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="knowledge_transfer">Knowledge Transfer</SelectItem>
                    <SelectItem value="collaborative_problem_solving">Collaborative Problem Solving</SelectItem>
                    <SelectItem value="skill_sharing">Skill Sharing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Learning Topics</Label>
                <div className="flex space-x-2 mt-2">
                  <Input
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    placeholder="Add learning topic"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic())}
                  />
                  <Button type="button" onClick={addTopic} variant="outline">
                    Add
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-3">
                  {learningTopics.map((topic) => (
                    <Badge key={topic} variant="secondary" className="flex items-center gap-1">
                      {topic}
                      <button onClick={() => removeTopic(topic)} className="ml-1 text-xs">×</button>
                    </Badge>
                  ))}
                </div>

                <div className="mt-3">
                  <Label className="text-sm text-gray-600">Quick Add:</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {predefinedTopics.map((topic) => (
                      <Badge
                        key={topic}
                        variant="outline"
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          if (!learningTopics.includes(topic)) {
                            setLearningTopics([...learningTopics, topic]);
                          }
                        }}
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <Button 
                onClick={handlePeerLearning}
                disabled={teacherOrganisms.length === 0 || learningTopics.length === 0 || peerLearningMutation.isPending}
                className="w-full"
              >
                {peerLearningMutation.isPending ? 'Learning...' : 'Start Peer Learning'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LearningInterface;
