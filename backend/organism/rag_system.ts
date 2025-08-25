import { api } from "encore.dev/api";
import { organismDB } from "./db";
import { llmClient } from "../llm/client";
import { VectorStore } from "./vector_store";
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

// Performs RAG queries with contextual knowledge retrieval.
export const ragQuery = api<RAGQueryRequest, RAGQueryResponse>(
  { expose: true, method: "POST", path: "/organisms/:organism_id/rag-query" },
  async (req) => {
    const organism = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${req.organism_id}
    `;

    if (!organism) {
      throw new Error("Organism not found");
    }

    // Retrieve relevant knowledge using vector search
    const relevantKnowledge = await retrieveRelevantKnowledge(
      req.organism_id,
      req.query,
      req.context_limit || 10
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

export interface KnowledgeIndexRequest {
  organism_id: string;
  content: string;
  content_type: 'text' | 'code' | 'documentation' | 'research' | 'internet_research' | 'codebase_analysis' | 'technology_pattern' | 'computer_operation';
  source: string;
  metadata?: Record<string, any>;
  confidence_score?: number;
}

// Indexes new knowledge using vector embeddings.
export const indexKnowledge = api<KnowledgeIndexRequest, { knowledge_id: string }>(
  { expose: true, method: "POST", path: "/organisms/:organism_id/index-knowledge" },
  async (req) => {
    return _indexKnowledgeLogic(req);
  }
);

export async function _indexKnowledgeLogic(req: KnowledgeIndexRequest): Promise<{ knowledge_id: string }> {
  // 1. Store the knowledge metadata in the database to get an ID
  const knowledgeEntry = await organismDB.queryRow<{ id: string }>`
    INSERT INTO knowledge_base (organism_id, knowledge_type, content, source, confidence_score)
    VALUES (${req.organism_id}, ${req.content_type}, ${JSON.stringify({
      text: req.content,
      metadata: req.metadata || {},
    })}, ${req.source}, ${req.confidence_score || 0.8})
    RETURNING id
  `;

  if (!knowledgeEntry) {
    throw new Error("Failed to create knowledge entry in database.");
  }
  const knowledgeId = knowledgeEntry.id;

  // 2. Generate an embedding for the content
  const embedding = await llmClient.generateEmbedding(req.content);

  // 3. Add the embedding to the vector store
  const vectorStore = await VectorStore.getInstance();
  await vectorStore.addVector(embedding, knowledgeId);

  // 4. Persist the vector store index
  await vectorStore.save();

  return { knowledge_id: knowledgeId };
}

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

async function retrieveRelevantKnowledge(
  organismId: string,
  query: string,
  contextLimit: number,
): Promise<KnowledgeEntry[]> {
  // Perform semantic ranking to find the most relevant knowledge
  return await rankKnowledgeByRelevance(query, contextLimit, organismId);
}

async function rankKnowledgeByRelevance(
  query: string,
  k: number,
  organismId: string,
): Promise<KnowledgeEntry[]> {
  // 1. Generate an embedding for the query
  const queryEmbedding = await llmClient.generateEmbedding(query);

  // 2. Search the vector store for the k nearest neighbors
  const vectorStore = await VectorStore.getInstance();
  const searchResults = await vectorStore.search(queryEmbedding, k);

  if (searchResults.length === 0) {
    return [];
  }

  // 3. Fetch the full knowledge entries from the database
  const resultIds = searchResults.map(r => r.id);
  
  // Use a proper parameterized query to avoid SQL injection, even with internal IDs.
  // The syntax `$1::uuid[]` is for Postgres to correctly handle an array of UUIDs.
  const knowledgeEntries = await organismDB.queryAll<KnowledgeEntry>`
    SELECT * FROM knowledge_base
    WHERE id = ANY(${resultIds}) AND organism_id = ${organismId}
  `;

  // 4. Sort the results based on the search distance
  const entryMap = new Map(knowledgeEntries.map(e => [e.id, e]));
  const sortedEntries = searchResults
    .map(result => ({ entry: entryMap.get(result.id), distance: result.distance }))
    .filter(item => item.entry)
    .sort((a, b) => a.distance - b.distance)
    .map(item => item.entry!);

  return sortedEntries;
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

async function performSemanticSearch(
  organismId: string,
  searchQuery: string,
  searchType: string,
  maxResults: number
): Promise<KnowledgeEntry[]> {
  // For now, all searches will be semantic.
  // A future implementation could re-introduce keyword or hybrid search.
  switch (searchType) {
    case 'semantic':
    case 'hybrid':
      return await rankKnowledgeByRelevance(searchQuery, maxResults, organismId);

    case 'keyword':
      // Fallback to a simple keyword search if explicitly requested
      return await performKeywordSearch(searchQuery, maxResults, organismId);

    default:
      return [];
  }
}

function performKeywordSearch(
  query: string,
  maxResults: number,
  organismId: string,
): Promise<KnowledgeEntry[]> {
  const queryWords = query.toLowerCase().split(' ').map(w => `%${w}%`);

  // This is a simplified keyword search. It's not very efficient on large datasets.
  return organismDB.queryAll<KnowledgeEntry>`
    SELECT * FROM knowledge_base
    WHERE organism_id = ${organismId}
    AND content::text ILIKE ANY(${queryWords})
    ORDER BY created_at DESC
    LIMIT ${maxResults}
  `;
}
