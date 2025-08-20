import { api } from "encore.dev/api";
import { organismDB } from "./db";
import { llmClient } from "../llm/client";
import type { Organism, KnowledgeEntry } from "./types";

interface RAGQueryRequest {
  organism_id: string;
  query: string;
  context_limit?: number;
  knowledge_types?: string[];
  confidence_threshold?: number;
}

interface RAGQueryResponse {
  answer: string;
  relevant_knowledge: KnowledgeEntry[];
  confidence_score: number;
  sources: string[];
}

// Performs RAG 3.0 enhanced queries with contextual knowledge retrieval.
export const ragQuery = api<RAGQueryRequest, RAGQueryResponse>(
  { expose: true, method: "POST", path: "/organisms/:organism_id/rag-query" },
  async (req) => {
    const organism = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${req.organism_id}
    `;

    if (!organism) {
      throw new Error("Organism not found");
    }

    // Retrieve relevant knowledge using advanced RAG techniques
    const relevantKnowledge = await retrieveRelevantKnowledge(
      req.organism_id,
      req.query,
      req.context_limit || 10,
      req.knowledge_types,
      req.confidence_threshold || 0.5
    );

    // Generate contextual answer using retrieved knowledge
    const answer = await generateContextualAnswer(
      req.query,
      relevantKnowledge,
      organism
    );

    // Calculate confidence score
    const confidenceScore = calculateAnswerConfidence(relevantKnowledge, answer);

    return {
      answer,
      relevant_knowledge: relevantKnowledge,
      confidence_score: confidenceScore,
      sources: relevantKnowledge.map(k => k.source)
    };
  }
);

interface KnowledgeIndexRequest {
  organism_id: string;
  content: string;
  content_type: 'text' | 'code' | 'documentation' | 'research';
  source: string;
  metadata?: Record<string, any>;
}

// Indexes new knowledge using RAG 3.0 techniques.
export const indexKnowledge = api<KnowledgeIndexRequest, { knowledge_id: string }>(
  { expose: true, method: "POST", path: "/organisms/:organism_id/index-knowledge" },
  async (req) => {
    // Extract semantic embeddings and key concepts
    const semanticAnalysis = await extractSemanticFeatures(req.content, req.content_type);
    
    // Create knowledge chunks for better retrieval
    const knowledgeChunks = await createKnowledgeChunks(req.content, semanticAnalysis);
    
    // Store indexed knowledge
    const knowledgeEntries: string[] = [];
    
    for (const chunk of knowledgeChunks) {
      const knowledgeEntry = await organismDB.queryRow<{ id: string }>`
        INSERT INTO knowledge_base (organism_id, knowledge_type, content, source, confidence_score)
        VALUES (
          ${req.organism_id},
          ${req.content_type},
          ${JSON.stringify({
            original_content: req.content,
            chunk: chunk.content,
            semantic_features: chunk.semanticFeatures,
            metadata: req.metadata || {},
            chunk_index: chunk.index,
            total_chunks: knowledgeChunks.length
          })},
          ${req.source},
          ${chunk.confidence}
        )
        RETURNING id
      `;
      
      if (knowledgeEntry) {
        knowledgeEntries.push(knowledgeEntry.id);
      }
    }

    return { knowledge_id: knowledgeEntries[0] || 'unknown' };
  }
);

interface SemanticSearchRequest {
  organism_id: string;
  search_query: string;
  search_type: 'semantic' | 'keyword' | 'hybrid';
  max_results?: number;
}

// Performs advanced semantic search across organism's knowledge base.
export const semanticSearch = api<SemanticSearchRequest, { results: KnowledgeEntry[] }>(
  { expose: true, method: "POST", path: "/organisms/:organism_id/semantic-search" },
  async (req) => {
    const searchResults = await performSemanticSearch(
      req.organism_id,
      req.search_query,
      req.search_type,
      req.max_results || 20
    );

    return { results: searchResults };
  }
);

interface KnowledgeGraphRequest {
  organism_id: string;
  concept: string;
  depth?: number;
  relationship_types?: string[];
}

// Builds and queries knowledge graphs for complex reasoning.
export const queryKnowledgeGraph = api<KnowledgeGraphRequest, { graph: any }>(
  { expose: true, method: "POST", path: "/organisms/:organism_id/knowledge-graph" },
  async (req) => {
    const knowledgeGraph = await buildKnowledgeGraph(
      req.organism_id,
      req.concept,
      req.depth || 3,
      req.relationship_types
    );

    return { graph: knowledgeGraph };
  }
);

async function retrieveRelevantKnowledge(
  organismId: string,
  query: string,
  contextLimit: number,
  knowledgeTypes?: string[],
  confidenceThreshold?: number
): Promise<KnowledgeEntry[]> {
  let whereClause = `organism_id = $1 AND confidence_score >= $2`;
  const params: any[] = [organismId, confidenceThreshold || 0.5];
  let paramIndex = 3;

  if (knowledgeTypes && knowledgeTypes.length > 0) {
    whereClause += ` AND knowledge_type = ANY($${paramIndex})`;
    params.push(knowledgeTypes);
    paramIndex++;
  }

  // Retrieve knowledge entries
  const knowledgeEntries = await organismDB.rawQueryAll<KnowledgeEntry>(
    `SELECT * FROM knowledge_base 
     WHERE ${whereClause}
     ORDER BY confidence_score DESC, created_at DESC
     LIMIT $${paramIndex}`,
    ...params,
    contextLimit
  );

  // Perform semantic ranking
  const rankedKnowledge = await rankKnowledgeByRelevance(query, knowledgeEntries);

  return rankedKnowledge;
}

async function rankKnowledgeByRelevance(
  query: string,
  knowledgeEntries: KnowledgeEntry[]
): Promise<KnowledgeEntry[]> {
  // Simulate semantic ranking (in a real implementation, this would use embeddings)
  const rankedEntries = knowledgeEntries.map(entry => {
    const relevanceScore = calculateSemanticSimilarity(query, entry.content);
    return { ...entry, relevance_score: relevanceScore };
  });

  return rankedEntries
    .sort((a, b) => (b as any).relevance_score - (a as any).relevance_score)
    .slice(0, 10);
}

function calculateSemanticSimilarity(query: string, content: any): number {
  // Simplified similarity calculation (in production, use proper embeddings)
  const queryWords = query.toLowerCase().split(' ');
  const contentText = JSON.stringify(content).toLowerCase();
  
  const matches = queryWords.filter(word => contentText.includes(word));
  return matches.length / queryWords.length;
}

async function generateContextualAnswer(
  query: string,
  relevantKnowledge: KnowledgeEntry[],
  organism: Organism
): Promise<string> {
  const systemPrompt = `You are an advanced RAG 3.0 system integrated with an AI organism. Generate comprehensive answers using the provided knowledge context. Consider the organism's capabilities and learning history.

Organism Capabilities: ${organism.capabilities.join(', ')}
Organism Generation: ${organism.generation}`;

  const knowledgeContext = relevantKnowledge.map(k => 
    `Source: ${k.source}\nType: ${k.knowledge_type}\nContent: ${JSON.stringify(k.content)}\nConfidence: ${k.confidence_score}`
  ).join('\n\n');

  const prompt = `Query: ${query}

Available Knowledge Context:
${knowledgeContext}

Generate a comprehensive, accurate answer based on the available knowledge. If the knowledge is insufficient, clearly state what additional information would be needed.`;

  return await llmClient.generateText(prompt, systemPrompt);
}

function calculateAnswerConfidence(
  relevantKnowledge: KnowledgeEntry[],
  answer: string
): number {
  if (relevantKnowledge.length === 0) return 0.1;
  
  const avgConfidence = relevantKnowledge.reduce((sum, k) => sum + k.confidence_score, 0) / relevantKnowledge.length;
  const knowledgeDepth = Math.min(relevantKnowledge.length / 5, 1);
  const answerLength = Math.min(answer.length / 500, 1);
  
  return (avgConfidence * 0.5) + (knowledgeDepth * 0.3) + (answerLength * 0.2);
}

async function extractSemanticFeatures(
  content: string,
  contentType: string
): Promise<any> {
  const systemPrompt = 'You are a semantic feature extractor. Extract key concepts, entities, relationships, and semantic features from the provided content.';
  
  const prompt = `Content Type: ${contentType}
Content: ${content}

Extract and return as JSON:
1. Key concepts and entities
2. Relationships between concepts
3. Semantic categories
4. Important keywords
5. Context indicators`;

  const response = await llmClient.generateText(prompt, systemPrompt);
  
  try {
    return JSON.parse(response);
  } catch {
    return {
      concepts: [],
      entities: [],
      relationships: [],
      categories: [contentType],
      keywords: content.split(' ').slice(0, 10)
    };
  }
}

async function createKnowledgeChunks(
  content: string,
  semanticAnalysis: any
): Promise<Array<{
  content: string;
  semanticFeatures: any;
  confidence: number;
  index: number;
}>> {
  const maxChunkSize = 500;
  const chunks: any[] = [];
  
  if (content.length <= maxChunkSize) {
    return [{
      content,
      semanticFeatures: semanticAnalysis,
      confidence: 0.9,
      index: 0
    }];
  }

  // Split content into semantic chunks
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  let currentChunk = '';
  let chunkIndex = 0;

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        semanticFeatures: semanticAnalysis,
        confidence: 0.8,
        index: chunkIndex++
      });
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      semanticFeatures: semanticAnalysis,
      confidence: 0.8,
      index: chunkIndex
    });
  }

  return chunks;
}

async function performSemanticSearch(
  organismId: string,
  searchQuery: string,
  searchType: string,
  maxResults: number
): Promise<KnowledgeEntry[]> {
  // Get all knowledge for the organism
  const allKnowledge = await organismDB.queryAll<KnowledgeEntry>`
    SELECT * FROM knowledge_base 
    WHERE organism_id = ${organismId}
    ORDER BY created_at DESC
  `;

  // Perform search based on type
  let searchResults: KnowledgeEntry[] = [];

  switch (searchType) {
    case 'semantic':
      searchResults = await performSemanticRanking(searchQuery, allKnowledge);
      break;
    case 'keyword':
      searchResults = performKeywordSearch(searchQuery, allKnowledge);
      break;
    case 'hybrid':
      const semanticResults = await performSemanticRanking(searchQuery, allKnowledge);
      const keywordResults = performKeywordSearch(searchQuery, allKnowledge);
      searchResults = combineSearchResults(semanticResults, keywordResults);
      break;
  }

  return searchResults.slice(0, maxResults);
}

async function performSemanticRanking(
  query: string,
  knowledge: KnowledgeEntry[]
): Promise<KnowledgeEntry[]> {
  return rankKnowledgeByRelevance(query, knowledge);
}

function performKeywordSearch(
  query: string,
  knowledge: KnowledgeEntry[]
): KnowledgeEntry[] {
  const queryWords = query.toLowerCase().split(' ');
  
  return knowledge.filter(entry => {
    const contentText = JSON.stringify(entry.content).toLowerCase();
    return queryWords.some(word => contentText.includes(word));
  });
}

function combineSearchResults(
  semanticResults: KnowledgeEntry[],
  keywordResults: KnowledgeEntry[]
): KnowledgeEntry[] {
  const combined = new Map<string, KnowledgeEntry>();
  
  // Add semantic results with higher weight
  semanticResults.forEach((entry, index) => {
    combined.set(entry.id, { ...entry, combined_score: (semanticResults.length - index) * 2 });
  });
  
  // Add keyword results
  keywordResults.forEach((entry, index) => {
    if (combined.has(entry.id)) {
      const existing = combined.get(entry.id)!;
      combined.set(entry.id, { 
        ...existing, 
        combined_score: (existing as any).combined_score + (keywordResults.length - index) 
      });
    } else {
      combined.set(entry.id, { ...entry, combined_score: keywordResults.length - index });
    }
  });
  
  return Array.from(combined.values())
    .sort((a, b) => (b as any).combined_score - (a as any).combined_score);
}

async function buildKnowledgeGraph(
  organismId: string,
  concept: string,
  depth: number,
  relationshipTypes?: string[]
): Promise<any> {
  // Retrieve knowledge related to the concept
  const relatedKnowledge = await organismDB.rawQueryAll<KnowledgeEntry>(
    `SELECT * FROM knowledge_base 
     WHERE organism_id = $1 
     AND (content::text ILIKE $2 OR source ILIKE $2)
     ORDER BY confidence_score DESC`,
    organismId,
    `%${concept}%`
  );

  // Build graph structure
  const graph = {
    nodes: [],
    edges: [],
    concept: concept,
    depth: depth
  };

  // Add concept as central node
  graph.nodes.push({
    id: concept,
    type: 'concept',
    label: concept,
    level: 0
  });

  // Add related knowledge as nodes and create edges
  relatedKnowledge.forEach((knowledge, index) => {
    const nodeId = `knowledge_${knowledge.id}`;
    
    graph.nodes.push({
      id: nodeId,
      type: 'knowledge',
      label: knowledge.knowledge_type,
      content: knowledge.content,
      confidence: knowledge.confidence_score,
      level: 1
    });

    graph.edges.push({
      source: concept,
      target: nodeId,
      type: 'relates_to',
      weight: knowledge.confidence_score
    });
  });

  return graph;
}
