import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Search, Database, Brain, BookOpen } from 'lucide-react';
import backend from '~backend/client';
import type { Organism } from '~backend/organism/types';

interface RAGInterfaceProps {
  organism: Organism;
}

const RAGInterface = ({ organism }: RAGInterfaceProps) => {
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'semantic' | 'keyword' | 'hybrid'>('hybrid');
  const [knowledgeContent, setKnowledgeContent] = useState('');
  const [contentType, setContentType] = useState<'text' | 'code' | 'documentation' | 'research'>('text');
  const [source, setSource] = useState('');
  const [ragResult, setRagResult] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const { toast } = useToast();

  const ragQueryMutation = useMutation({
    mutationFn: (data: any) => backend.organism.ragQuery(data),
    onSuccess: (result) => {
      setRagResult(result);
      toast({
        title: 'RAG Query Completed',
        description: `Found ${result.relevant_knowledge.length} relevant knowledge entries.`,
      });
    },
    onError: (error) => {
      console.error('RAG query failed:', error);
      toast({
        title: 'Query Failed',
        description: 'Failed to execute RAG query.',
        variant: 'destructive',
      });
    },
  });

  const indexKnowledgeMutation = useMutation({
    mutationFn: (data: any) => backend.organism.indexKnowledge(data),
    onSuccess: () => {
      toast({
        title: 'Knowledge Indexed',
        description: 'Knowledge has been successfully indexed.',
      });
      setKnowledgeContent('');
      setSource('');
    },
    onError: (error) => {
      console.error('Knowledge indexing failed:', error);
      toast({
        title: 'Indexing Failed',
        description: 'Failed to index knowledge.',
        variant: 'destructive',
      });
    },
  });

  const semanticSearchMutation = useMutation({
    mutationFn: (data: any) => backend.organism.semanticSearch(data),
    onSuccess: (result) => {
      setSearchResults(result.results);
      toast({
        title: 'Search Completed',
        description: `Found ${result.results.length} results.`,
      });
    },
    onError: (error) => {
      console.error('Semantic search failed:', error);
      toast({
        title: 'Search Failed',
        description: 'Failed to execute search.',
        variant: 'destructive',
      });
    },
  });

  const handleRAGQuery = () => {
    if (!query.trim()) return;

    ragQueryMutation.mutate({
      organism_id: organism.id,
      query: query.trim(),
      context_limit: 10,
      confidence_threshold: 0.5
    });
  };

  const handleIndexKnowledge = () => {
    if (!knowledgeContent.trim() || !source.trim()) return;

    indexKnowledgeMutation.mutate({
      organism_id: organism.id,
      content: knowledgeContent.trim(),
      content_type: contentType,
      source: source.trim(),
      metadata: {
        indexed_at: new Date(),
        content_length: knowledgeContent.length
      }
    });
  };

  const handleSemanticSearch = () => {
    if (!searchQuery.trim()) return;

    semanticSearchMutation.mutate({
      organism_id: organism.id,
      search_query: searchQuery.trim(),
      search_type: searchType,
      max_results: 20
    });
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800';
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2 text-blue-600" />
            RAG 3.0 Interface - {organism.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Advanced Retrieval-Augmented Generation system for contextual knowledge queries and management.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="h-5 w-5 mr-2 text-green-600" />
              RAG Query
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="rag-query">Query</Label>
              <Textarea
                id="rag-query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question about the organism's knowledge..."
                rows={3}
              />
            </div>

            <Button 
              onClick={handleRAGQuery}
              disabled={!query.trim() || ragQueryMutation.isPending}
              className="w-full"
            >
              {ragQueryMutation.isPending ? 'Querying...' : 'Execute RAG Query'}
            </Button>

            {ragResult && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Answer</h4>
                  <Badge className={getConfidenceColor(ragResult.confidence_score)}>
                    {(ragResult.confidence_score * 100).toFixed(1)}% confidence
                  </Badge>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm">{ragResult.answer}</p>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-700">Sources:</h5>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ragResult.sources.map((source: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {source}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="h-5 w-5 mr-2 text-purple-600" />
              Knowledge Indexing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="content-type">Content Type</Label>
              <Select value={contentType} onValueChange={(value: any) => setContentType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="code">Code</SelectItem>
                  <SelectItem value="documentation">Documentation</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g., research_paper.pdf, github.com/repo"
              />
            </div>

            <div>
              <Label htmlFor="knowledge-content">Content</Label>
              <Textarea
                id="knowledge-content"
                value={knowledgeContent}
                onChange={(e) => setKnowledgeContent(e.target.value)}
                placeholder="Enter the knowledge content to index..."
                rows={4}
              />
            </div>

            <Button 
              onClick={handleIndexKnowledge}
              disabled={!knowledgeContent.trim() || !source.trim() || indexKnowledgeMutation.isPending}
              className="w-full"
            >
              {indexKnowledgeMutation.isPending ? 'Indexing...' : 'Index Knowledge'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2 text-orange-600" />
            Semantic Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="search-query">Search Query</Label>
              <Input
                id="search-query"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search the knowledge base..."
              />
            </div>

            <div>
              <Label htmlFor="search-type">Search Type</Label>
              <Select value={searchType} onValueChange={(value: any) => setSearchType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semantic">Semantic</SelectItem>
                  <SelectItem value="keyword">Keyword</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={handleSemanticSearch}
            disabled={!searchQuery.trim() || semanticSearchMutation.isPending}
            className="w-full"
          >
            {semanticSearchMutation.isPending ? 'Searching...' : 'Search Knowledge Base'}
          </Button>

          {searchResults.length > 0 && (
            <div className="mt-4 space-y-3">
              <h4 className="font-medium">Search Results ({searchResults.length})</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{result.knowledge_type}</Badge>
                      <Badge className={getConfidenceColor(result.confidence_score)}>
                        {(result.confidence_score * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mb-1">
                      <strong>Source:</strong> {result.source}
                    </p>
                    <p className="text-xs text-gray-600">
                      {JSON.stringify(result.content).substring(0, 200)}...
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RAGInterface;
