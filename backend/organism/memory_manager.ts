import { api } from "encore.dev/api";
import { organismDB } from "./db";
import { llmClient } from "../llm/client";
import type { Organism, KnowledgeEntry } from "./types";

interface MemoryCompressionRequest {
  organism_id: string;
  compression_strategy: 'temporal' | 'importance' | 'frequency' | 'hybrid';
  retention_threshold?: number;
  max_memory_size?: number;
}

interface MemoryCompressionResponse {
  compressed_memories: number;
  memory_reduction_percentage: number;
  preserved_critical_memories: number;
  compression_summary: string;
}

// Compresses organism memories while preserving critical information.
export const compressMemories = api<MemoryCompressionRequest, MemoryCompressionResponse>(
  { expose: true, method: "POST", path: "/organisms/:organism_id/compress-memories" },
  async (req) => {
    const organism = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${req.organism_id}
    `;

    if (!organism) {
      throw new Error("Organism not found");
    }

    const compressionResult = await performMemoryCompression(
      organism,
      req.compression_strategy,
      req.retention_threshold || 0.7,
      req.max_memory_size || 10000
    );

    // Update organism with compressed memory
    await organismDB.exec`
      UPDATE organisms SET 
        memory = ${JSON.stringify(compressionResult.compressedMemory)},
        updated_at = NOW()
      WHERE id = ${req.organism_id}
    `;

    // Log compression event
    await logMemoryEvent(req.organism_id, 'compression', compressionResult);

    return {
      compressed_memories: compressionResult.compressedCount,
      memory_reduction_percentage: compressionResult.reductionPercentage,
      preserved_critical_memories: compressionResult.preservedCount,
      compression_summary: compressionResult.summary
    };
  }
);

interface MemoryPersistenceRequest {
  organism_id: string;
  persistence_level: 'session' | 'permanent' | 'critical_only';
  backup_location?: string;
}

// Persists organism memories across sessions with different retention levels.
export const persistMemories = api<MemoryPersistenceRequest, { persistence_id: string }>(
  { expose: true, method: "POST", path: "/organisms/:organism_id/persist-memories" },
  async (req) => {
    const organism = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${req.organism_id}
    `;

    if (!organism) {
      throw new Error("Organism not found");
    }

    const persistenceId = await createMemoryPersistence(
      organism,
      req.persistence_level,
      req.backup_location
    );

    return { persistence_id: persistenceId };
  }
);

interface MemoryRestoreRequest {
  organism_id: string;
  persistence_id?: string;
  restore_point?: Date;
  selective_restore?: string[];
}

// Restores organism memories from persistent storage.
export const restoreMemories = api<MemoryRestoreRequest, { restored_memories: any }>(
  { expose: true, method: "POST", path: "/organisms/:organism_id/restore-memories" },
  async (req) => {
    const organism = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${req.organism_id}
    `;

    if (!organism) {
      throw new Error("Organism not found");
    }

    const restoredMemories = await restoreMemoriesFromPersistence(
      req.organism_id,
      req.persistence_id,
      req.restore_point,
      req.selective_restore
    );

    // Update organism with restored memories
    await organismDB.exec`
      UPDATE organisms SET 
        memory = ${JSON.stringify(restoredMemories)},
        updated_at = NOW()
      WHERE id = ${req.organism_id}
    `;

    return { restored_memories: restoredMemories };
  }
);

interface KnowledgeTransferRequest {
  source_organism_id: string;
  target_organism_id: string;
  transfer_type: 'critical_only' | 'recent_learnings' | 'domain_specific' | 'full_transfer';
  domain_filter?: string[];
  importance_threshold?: number;
}

// Transfers knowledge between organisms with intelligent filtering.
export const transferKnowledge = api<KnowledgeTransferRequest, { transferred_items: number }>(
  { expose: true, method: "POST", path: "/organisms/transfer-knowledge" },
  async (req) => {
    const sourceOrganism = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${req.source_organism_id}
    `;

    const targetOrganism = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${req.target_organism_id}
    `;

    if (!sourceOrganism || !targetOrganism) {
      throw new Error("Source or target organism not found");
    }

    const transferResult = await performKnowledgeTransfer(
      sourceOrganism,
      targetOrganism,
      req.transfer_type,
      req.domain_filter,
      req.importance_threshold || 0.6
    );

    return { transferred_items: transferResult.transferredCount };
  }
);

interface MemoryAnalysisRequest {
  organism_id: string;
  analysis_type: 'usage_patterns' | 'knowledge_gaps' | 'memory_efficiency' | 'learning_trends';
  time_range?: { start: Date; end: Date };
}

// Analyzes organism memory patterns and provides insights.
export const analyzeMemoryPatterns = api<MemoryAnalysisRequest, { analysis_result: any }>(
  { expose: true, method: "POST", path: "/organisms/:organism_id/analyze-memory" },
  async (req) => {
    const organism = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${req.organism_id}
    `;

    if (!organism) {
      throw new Error("Organism not found");
    }

    const analysisResult = await performMemoryAnalysis(
      organism,
      req.analysis_type,
      req.time_range
    );

    return { analysis_result: analysisResult };
  }
);

interface MemoryOptimizationRequest {
  organism_id: string;
  optimization_goals: string[];
  constraints?: Record<string, any>;
}

// Optimizes memory structure and access patterns for better performance.
export const optimizeMemoryStructure = api<MemoryOptimizationRequest, { optimization_result: any }>(
  { expose: true, method: "POST", path: "/organisms/:organism_id/optimize-memory" },
  async (req) => {
    const organism = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${req.organism_id}
    `;

    if (!organism) {
      throw new Error("Organism not found");
    }

    const optimizationResult = await optimizeMemoryForPerformance(
      organism,
      req.optimization_goals,
      req.constraints
    );

    // Update organism with optimized memory structure
    await organismDB.exec`
      UPDATE organisms SET 
        memory = ${JSON.stringify(optimizationResult.optimizedMemory)},
        updated_at = NOW()
      WHERE id = ${req.organism_id}
    `;

    return { optimization_result: optimizationResult };
  }
);

async function performMemoryCompression(
  organism: Organism,
  strategy: string,
  retentionThreshold: number,
  maxMemorySize: number
): Promise<any> {
  const currentMemory = organism.memory;
  const memorySize = JSON.stringify(currentMemory).length;

  if (memorySize <= maxMemorySize) {
    return {
      compressedMemory: currentMemory,
      compressedCount: 0,
      reductionPercentage: 0,
      preservedCount: Object.keys(currentMemory).length,
      summary: "No compression needed - memory within limits"
    };
  }

  const systemPrompt = `You are a memory compression specialist for AI organisms. Compress memories while preserving critical information based on the specified strategy.

Current Memory Size: ${memorySize} bytes
Max Memory Size: ${maxMemorySize} bytes
Retention Threshold: ${retentionThreshold}
Strategy: ${strategy}

Compression strategies:
- temporal: Prioritize recent memories
- importance: Prioritize high-importance memories
- frequency: Prioritize frequently accessed memories
- hybrid: Combine all factors`;

  const prompt = `Current Memory Structure:
${JSON.stringify(currentMemory, null, 2)}

Compress this memory structure according to the ${strategy} strategy. Return a JSON object with:
1. compressed_memory: The compressed memory structure
2. compression_summary: Summary of what was compressed
3. critical_items_preserved: List of critical items kept
4. compression_ratio: Percentage of memory reduced

Ensure critical learnings, recent experiences, and high-value knowledge are preserved.`;

  const response = await llmClient.generateText(prompt, systemPrompt);

  try {
    const compressionResult = JSON.parse(response);
    const compressedSize = JSON.stringify(compressionResult.compressed_memory).length;
    const reductionPercentage = ((memorySize - compressedSize) / memorySize) * 100;

    return {
      compressedMemory: compressionResult.compressed_memory,
      compressedCount: Object.keys(currentMemory).length - Object.keys(compressionResult.compressed_memory).length,
      reductionPercentage: reductionPercentage,
      preservedCount: Object.keys(compressionResult.compressed_memory).length,
      summary: compressionResult.compression_summary || `Compressed using ${strategy} strategy`
    };
  } catch (error) {
    // Fallback compression - remove oldest non-critical entries
    const compressedMemory = await fallbackCompression(currentMemory, maxMemorySize);
    const compressedSize = JSON.stringify(compressedMemory).length;
    const reductionPercentage = ((memorySize - compressedSize) / memorySize) * 100;

    return {
      compressedMemory,
      compressedCount: Object.keys(currentMemory).length - Object.keys(compressedMemory).length,
      reductionPercentage,
      preservedCount: Object.keys(compressedMemory).length,
      summary: "Fallback compression applied due to parsing error"
    };
  }
}

async function fallbackCompression(memory: any, maxSize: number): Promise<any> {
  const compressed = { ...memory };
  const currentSize = () => JSON.stringify(compressed).length;

  // Remove non-critical entries first
  const nonCriticalKeys = ['temporary_data', 'cache', 'debug_info', 'logs'];
  for (const key of nonCriticalKeys) {
    if (compressed[key] && currentSize() > maxSize) {
      delete compressed[key];
    }
  }

  // If still too large, compress arrays by keeping only recent items
  for (const [key, value] of Object.entries(compressed)) {
    if (Array.isArray(value) && currentSize() > maxSize) {
      compressed[key] = value.slice(-Math.floor(value.length * 0.7)); // Keep 70% of most recent
    }
  }

  return compressed;
}

async function createMemoryPersistence(
  organism: Organism,
  persistenceLevel: string,
  backupLocation?: string
): Promise<string> {
  const persistenceId = `persistence_${organism.id}_${Date.now()}`;
  
  let memoryToPersist = organism.memory;
  
  if (persistenceLevel === 'critical_only') {
    memoryToPersist = await extractCriticalMemories(organism.memory);
  }

  // Store in memory_persistence table
  await organismDB.exec`
    INSERT INTO memory_persistence (
      persistence_id, organism_id, persistence_level, 
      memory_data, backup_location, created_at
    )
    VALUES (
      ${persistenceId},
      ${organism.id},
      ${persistenceLevel},
      ${JSON.stringify(memoryToPersist)},
      ${backupLocation || 'default'},
      NOW()
    )
  `;

  return persistenceId;
}

async function extractCriticalMemories(memory: any): Promise<any> {
  const critical = {};
  
  // Extract critical memory categories
  const criticalKeys = [
    'core_learnings',
    'error_solutions',
    'optimization_patterns',
    'successful_strategies',
    'evolution_history',
    'critical_knowledge'
  ];

  for (const key of criticalKeys) {
    if (memory[key]) {
      critical[key] = memory[key];
    }
  }

  return critical;
}

async function restoreMemoriesFromPersistence(
  organismId: string,
  persistenceId?: string,
  restorePoint?: Date,
  selectiveRestore?: string[]
): Promise<any> {
  let query = `
    SELECT memory_data FROM memory_persistence 
    WHERE organism_id = $1
  `;
  const params: any[] = [organismId];
  let paramIndex = 2;

  if (persistenceId) {
    query += ` AND persistence_id = $${paramIndex}`;
    params.push(persistenceId);
    paramIndex++;
  }

  if (restorePoint) {
    query += ` AND created_at <= $${paramIndex}`;
    params.push(restorePoint);
    paramIndex++;
  }

  query += ` ORDER BY created_at DESC LIMIT 1`;

  const persistedMemory = await organismDB.rawQueryRow<{ memory_data: any }>(query, ...params);

  if (!persistedMemory) {
    throw new Error("No persisted memory found");
  }

  let restoredMemory = persistedMemory.memory_data;

  if (selectiveRestore && selectiveRestore.length > 0) {
    const selective = {};
    for (const key of selectiveRestore) {
      if (restoredMemory[key]) {
        selective[key] = restoredMemory[key];
      }
    }
    restoredMemory = selective;
  }

  return restoredMemory;
}

async function performKnowledgeTransfer(
  sourceOrganism: Organism,
  targetOrganism: Organism,
  transferType: string,
  domainFilter?: string[],
  importanceThreshold?: number
): Promise<{ transferredCount: number }> {
  // Get source knowledge
  const sourceKnowledge = await organismDB.queryAll<KnowledgeEntry>`
    SELECT * FROM knowledge_base 
    WHERE organism_id = ${sourceOrganism.id}
    AND confidence_score >= ${importanceThreshold || 0.6}
    ORDER BY confidence_score DESC, created_at DESC
  `;

  let knowledgeToTransfer = sourceKnowledge;

  // Apply transfer type filtering
  switch (transferType) {
    case 'critical_only':
      knowledgeToTransfer = sourceKnowledge.filter(k => 
        k.confidence_score >= 0.8 || 
        ['error_solution', 'optimization_technique'].includes(k.knowledge_type)
      );
      break;
    
    case 'recent_learnings':
      const recentThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
      knowledgeToTransfer = sourceKnowledge.filter(k => 
        new Date(k.created_at) >= recentThreshold
      );
      break;
    
    case 'domain_specific':
      if (domainFilter && domainFilter.length > 0) {
        knowledgeToTransfer = sourceKnowledge.filter(k =>
          domainFilter.some(domain => 
            k.knowledge_type.includes(domain) || 
            JSON.stringify(k.content).toLowerCase().includes(domain.toLowerCase())
          )
        );
      }
      break;
  }

  // Transfer knowledge to target organism
  let transferredCount = 0;
  for (const knowledge of knowledgeToTransfer) {
    // Check if target already has similar knowledge
    const existingKnowledge = await organismDB.queryRow<KnowledgeEntry>`
      SELECT * FROM knowledge_base 
      WHERE organism_id = ${targetOrganism.id}
      AND knowledge_type = ${knowledge.knowledge_type}
      AND source = ${knowledge.source}
    `;

    if (!existingKnowledge) {
      await organismDB.exec`
        INSERT INTO knowledge_base (
          organism_id, knowledge_type, content, source, confidence_score
        )
        VALUES (
          ${targetOrganism.id},
          ${knowledge.knowledge_type},
          ${JSON.stringify({
            ...knowledge.content,
            transferred_from: sourceOrganism.id,
            transfer_timestamp: new Date()
          })},
          ${knowledge.source},
          ${Math.min(knowledge.confidence_score * 0.9, 0.95)} -- Slightly reduce confidence for transferred knowledge
        )
      `;
      transferredCount++;
    }
  }

  // Update target organism's memory with transfer info
  const targetMemory = { ...targetOrganism.memory };
  targetMemory.knowledge_transfers = targetMemory.knowledge_transfers || [];
  targetMemory.knowledge_transfers.push({
    source_organism: sourceOrganism.id,
    transfer_type: transferType,
    transferred_count: transferredCount,
    timestamp: new Date()
  });

  await organismDB.exec`
    UPDATE organisms SET 
      memory = ${JSON.stringify(targetMemory)},
      updated_at = NOW()
    WHERE id = ${targetOrganism.id}
  `;

  return { transferredCount };
}

async function performMemoryAnalysis(
  organism: Organism,
  analysisType: string,
  timeRange?: { start: Date; end: Date }
): Promise<any> {
  const systemPrompt = `You are a memory analysis specialist for AI organisms. Analyze memory patterns and provide actionable insights.

Analysis Type: ${analysisType}
Organism Generation: ${organism.generation}
Current Capabilities: ${organism.capabilities.join(', ')}`;

  let prompt = `Analyze the following organism memory structure:
${JSON.stringify(organism.memory, null, 2)}

Performance Metrics:
${JSON.stringify(organism.performance_metrics, null, 2)}

Provide analysis for: ${analysisType}

Return a JSON object with:
1. analysis_summary: Key findings
2. insights: List of actionable insights
3. recommendations: Specific recommendations
4. metrics: Relevant metrics and scores
5. trends: Identified patterns or trends`;

  if (timeRange) {
    prompt += `\n\nTime Range: ${timeRange.start.toISOString()} to ${timeRange.end.toISOString()}`;
  }

  const response = await llmClient.generateText(prompt, systemPrompt);

  try {
    return JSON.parse(response);
  } catch (error) {
    return {
      analysis_summary: response,
      insights: [`Analysis completed for ${analysisType}`],
      recommendations: ['Review memory structure for optimization opportunities'],
      metrics: { analysis_confidence: 0.7 },
      trends: ['Unable to parse detailed trends due to format error']
    };
  }
}

async function optimizeMemoryForPerformance(
  organism: Organism,
  optimizationGoals: string[],
  constraints?: Record<string, any>
): Promise<any> {
  const systemPrompt = `You are a memory optimization specialist. Optimize organism memory structure for better performance while maintaining critical information.

Optimization Goals: ${optimizationGoals.join(', ')}
Current Performance: ${JSON.stringify(organism.performance_metrics)}
Constraints: ${JSON.stringify(constraints || {})}`;

  const prompt = `Current Memory Structure:
${JSON.stringify(organism.memory, null, 2)}

Optimize this memory structure to achieve the following goals:
${optimizationGoals.map(goal => `- ${goal}`).join('\n')}

Return a JSON object with:
1. optimized_memory: The optimized memory structure
2. optimization_summary: Summary of changes made
3. performance_improvements: Expected performance gains
4. preserved_critical_data: List of critical data preserved
5. optimization_metrics: Metrics about the optimization

Ensure all critical learnings and capabilities are preserved while improving access patterns and reducing memory overhead.`;

  const response = await llmClient.generateText(prompt, systemPrompt);

  try {
    const optimizationResult = JSON.parse(response);
    return {
      optimizedMemory: optimizationResult.optimized_memory || organism.memory,
      summary: optimizationResult.optimization_summary || 'Memory structure optimized',
      improvements: optimizationResult.performance_improvements || [],
      preservedData: optimizationResult.preserved_critical_data || [],
      metrics: optimizationResult.optimization_metrics || {}
    };
  } catch (error) {
    // Fallback optimization
    const optimizedMemory = await fallbackMemoryOptimization(organism.memory, optimizationGoals);
    return {
      optimizedMemory,
      summary: 'Fallback optimization applied',
      improvements: ['Improved memory structure organization'],
      preservedData: ['All critical data preserved'],
      metrics: { optimization_confidence: 0.6 }
    };
  }
}

async function fallbackMemoryOptimization(memory: any, goals: string[]): Promise<any> {
  const optimized = { ...memory };

  // Organize memory into structured categories
  if (!optimized.core_memories) {
    optimized.core_memories = {};
  }
  if (!optimized.working_memory) {
    optimized.working_memory = {};
  }
  if (!optimized.long_term_memory) {
    optimized.long_term_memory = {};
  }

  // Move frequently accessed data to working memory
  if (goals.includes('access_speed')) {
    optimized.working_memory.recent_learnings = optimized.recent_learnings || [];
    optimized.working_memory.active_tasks = optimized.active_tasks || [];
  }

  // Compress historical data
  if (goals.includes('memory_efficiency')) {
    if (optimized.error_history && Array.isArray(optimized.error_history)) {
      optimized.long_term_memory.error_patterns = optimized.error_history.slice(-10); // Keep last 10
      delete optimized.error_history;
    }
  }

  return optimized;
}

async function logMemoryEvent(
  organismId: string,
  eventType: string,
  eventData: any
): Promise<void> {
  await organismDB.exec`
    INSERT INTO knowledge_base (organism_id, knowledge_type, content, source, confidence_score)
    VALUES (
      ${organismId},
      'memory_management',
      ${JSON.stringify({
        event_type: eventType,
        event_data: eventData,
        timestamp: new Date()
      })},
      'memory_management_system',
      0.9
    )
  `;
}
