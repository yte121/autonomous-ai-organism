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
  const initialMemory = JSON.parse(JSON.stringify(organism.memory)); // Deep copy
  const initialSize = JSON.stringify(initialMemory).length;

  if (initialSize <= maxMemorySize) {
    return {
      compressedMemory: initialMemory,
      compressedCount: 0,
      reductionPercentage: 0,
      preservedCount: Object.keys(initialMemory).length,
      summary: "No compression needed - memory within limits."
    };
  }

  let compressedMemory = initialMemory;
  let compressedCount = 0;

  const getMemorySize = (mem: any) => JSON.stringify(mem).length;

  // Find all array-based memories that can be compressed
  const compressibleMemories: { key: string, items: any[] }[] = [];
  for (const key in compressedMemory) {
    if (Array.isArray(compressedMemory[key])) {
      compressibleMemories.push({ key, items: compressedMemory[key] });
    }
  }

  // Flatten all items from compressible arrays into a single list with metadata
  let allItems = compressibleMemories.flatMap(({ key, items }) =>
    items.map((item, index) => ({
      ...item,
      _originalKey: key,
      _originalIndex: index
    }))
  );

  switch (strategy) {
    case 'temporal':
      // Sort by timestamp, oldest first. Items without a timestamp are considered oldest.
      allItems.sort((a, b) => {
        const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
        const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
        return timeA - timeB;
      });
      break;

    case 'importance':
      // Sort by confidence score, lowest first. Items without a score are considered least important.
      allItems.sort((a, b) => (a.confidence_score || 0) - (b.confidence_score || 0));
      break;

    default:
      // For other strategies, fallback to temporal for now
      allItems.sort((a, b) => {
        const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
        const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
        return timeA - timeB;
      });
      break;
  }

  // Iteratively remove items until memory size is within the limit
  while (getMemorySize(compressedMemory) > maxMemorySize && allItems.length > 0) {
    const itemToRemove = allItems.shift();
    if (itemToRemove) {
      const originalArray = compressedMemory[itemToRemove._originalKey];
      if (originalArray) {
        // Find and remove the specific item from the original array
        const itemIndex = originalArray.findIndex((item: any) =>
          item.timestamp === itemToRemove.timestamp && item.source === itemToRemove.source
        );
        if (itemIndex > -1) {
          originalArray.splice(itemIndex, 1);
          compressedCount++;
        }
      }
    }
  }

  const finalSize = getMemorySize(compressedMemory);
  const reductionPercentage = ((initialSize - finalSize) / initialSize) * 100;
  const preservedCount = Object.values(compressedMemory).reduce((acc: number, val: any) => acc + (Array.isArray(val) ? val.length : 1), 0);

  return {
    compressedMemory,
    compressedCount,
    reductionPercentage: parseFloat(reductionPercentage.toFixed(2)),
    preservedCount,
    summary: `Compressed ${compressedCount} memories using '${strategy}' strategy, reducing memory by ${reductionPercentage.toFixed(2)}%.`
  };
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
  // 1. Perform algorithmic analysis to extract concrete metrics
  const memoryMetrics = {
    totalKeys: Object.keys(organism.memory).length,
    totalSizeMB: (JSON.stringify(organism.memory).length / (1024 * 1024)).toFixed(4),
    keyDistribution: Object.entries(organism.memory).reduce((acc, [key, value]) => {
      acc[key] = (JSON.stringify(value).length / 1024).toFixed(2) + ' KB';
      return acc;
    }, {}),
    arrayLengths: Object.entries(organism.memory)
      .filter(([_, value]) => Array.isArray(value))
      .reduce((acc, [key, value]) => {
        acc[key] = value.length;
        return acc;
      }, {}),
  };

  // 2. Use LLM to generate insights based on the metrics, not the raw data
  const systemPrompt = `You are a memory analysis specialist for AI organisms. Analyze the provided memory metrics and generate actionable insights for the specified analysis type.

Analysis Type: ${analysisType}
Organism Generation: ${organism.generation}
Current Capabilities: ${organism.capabilities.join(', ')}`;

  const prompt = `Analyze the following organism memory metrics:
${JSON.stringify(memoryMetrics, null, 2)}

Performance Metrics:
${JSON.stringify(organism.performance_metrics, null, 2)}

Provide analysis for: ${analysisType}

Return a JSON object with:
1. analysis_summary: Key findings based on the metrics.
2. insights: A list of actionable insights.
3. recommendations: Specific, actionable recommendations for optimization.`;

  const response = await llmClient.generateText(prompt, systemPrompt);

  try {
    const analysis = JSON.parse(response);
    return {
      metrics: memoryMetrics,
      ...analysis,
    };
  } catch (error) {
    console.error("Failed to parse memory analysis from LLM:", error);
    return {
      metrics: memoryMetrics,
      analysis_summary: "Failed to generate LLM-based analysis.",
      insights: ["The LLM response was not in the expected JSON format."],
      recommendations: ["Consider running a memory optimization process."],
    };
  }
}

async function optimizeMemoryForPerformance(
  organism: Organism,
  optimizationGoals: string[],
  constraints?: Record<string, any>
): Promise<any> {
  const systemPrompt = `You are a memory optimization specialist. Generate a series of actions to optimize the given memory structure for better performance.

Optimization Goals: ${optimizationGoals.join(', ')}
Constraints: ${JSON.stringify(constraints || {})}

Return a JSON object with a single key "actions". The value should be an array of action objects.
Valid action types are: 'summarize', 'archive', 'delete_key', 'rename_key'.
- summarize: { "type": "summarize", "key": "path.to.key" } -> Summarizes the content of the key.
- archive: { "type": "archive", "source_key": "path.to.source", "target_key": "path.to.target" } -> Moves content.
- delete_key: { "type": "delete_key", "key": "path.to.key" } -> Deletes a key.
- rename_key: { "type": "rename_key", "old_key": "path.to.old", "new_key": "path.to.new" } -> Renames a key.`;

  const prompt = `Current Memory Structure:
${JSON.stringify(organism.memory, null, 2)}

Generate a plan to optimize this memory structure based on the goals.`;

  const response = await llmClient.generateText(prompt, systemPrompt);
  let optimizationPlan;
  try {
    optimizationPlan = JSON.parse(response);
    if (!optimizationPlan.actions || !Array.isArray(optimizationPlan.actions)) {
      throw new Error("Invalid plan format: 'actions' array not found.");
    }
  } catch (error) {
    console.error("Failed to parse memory optimization plan:", error);
    return {
      optimizedMemory: organism.memory,
      summary: 'Failed to generate a valid optimization plan.',
      actions_executed: []
    };
  }

  const optimizedMemory = JSON.parse(JSON.stringify(organism.memory)); // Deep copy
  const actionsExecuted = [];

  for (const action of optimizationPlan.actions) {
    try {
      switch (action.type) {
        case 'summarize':
          if (optimizedMemory[action.key]) {
            const contentToSummarize = JSON.stringify(optimizedMemory[action.key]);
            const summaryPrompt = `Summarize the following data in a concise paragraph:\n\n${contentToSummarize}`;
            optimizedMemory[action.key] = await llmClient.generateText(summaryPrompt, "You are a data summarization expert.");
            actionsExecuted.push({ ...action, status: 'success' });
          }
          break;

        case 'archive':
          if (optimizedMemory[action.source_key]) {
            optimizedMemory[action.target_key] = optimizedMemory[action.source_key];
            delete optimizedMemory[action.source_key];
            actionsExecuted.push({ ...action, status: 'success' });
          }
          break;

        case 'delete_key':
          if (optimizedMemory[action.key]) {
            delete optimizedMemory[action.key];
            actionsExecuted.push({ ...action, status: 'success' });
          }
          break;

        case 'rename_key':
          if (optimizedMemory[action.old_key]) {
            optimizedMemory[action.new_key] = optimizedMemory[action.old_key];
            delete optimizedMemory[action.old_key];
            actionsExecuted.push({ ...action, status: 'success' });
          }
          break;
      }
    } catch (error) {
      console.error(`Failed to execute memory optimization action: ${action.type}`, error);
      actionsExecuted.push({ ...action, status: 'failed', error: error instanceof Error ? error.message : String(error) });
    }
  }

  return {
    optimizedMemory: optimizedMemory,
    summary: `Executed ${actionsExecuted.length} optimization actions.`,
    actions_executed: actionsExecuted,
  };
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
