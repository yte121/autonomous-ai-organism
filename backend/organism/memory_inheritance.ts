import { api } from "encore.dev/api";
import { organismDB } from "./db";
import { llmClient } from "../llm/client";
import type { Organism, KnowledgeEntry } from "./types";

interface MemoryInheritanceRequest {
  parent_organism_id: string;
  child_organism_id: string;
  inheritance_strategy: 'essential_only' | 'domain_specific' | 'adaptive' | 'full_lineage';
  domain_focus?: string[];
  inheritance_ratio?: number;
}

interface MemoryInheritanceResponse {
  inherited_memories: number;
  inherited_knowledge: number;
  inheritance_summary: string;
  adaptation_recommendations: string[];
}

// Transfers essential memories and knowledge from parent to child organism.
export const inheritMemories = api<MemoryInheritanceRequest, MemoryInheritanceResponse>(
  { expose: true, method: "POST", path: "/organisms/inherit-memories" },
  async (req) => {
    const parentOrganism = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${req.parent_organism_id}
    `;

    const childOrganism = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${req.child_organism_id}
    `;

    if (!parentOrganism || !childOrganism) {
      throw new Error("Parent or child organism not found");
    }

    const inheritanceResult = await performMemoryInheritance(
      parentOrganism,
      childOrganism,
      req.inheritance_strategy,
      req.domain_focus,
      req.inheritance_ratio || 0.3
    );

    return inheritanceResult;
  }
);

interface LineageMemoryRequest {
  organism_id: string;
  generations_back?: number;
  memory_types?: string[];
}

// Retrieves and analyzes memory lineage across organism generations.
export const analyzeMemoryLineage = api<LineageMemoryRequest, { lineage_analysis: any }>(
  { expose: true, method: "GET", path: "/organisms/:organism_id/memory-lineage" },
  async (req) => {
    const organism = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${req.organism_id}
    `;

    if (!organism) {
      throw new Error("Organism not found");
    }

    const lineageAnalysis = await analyzeOrganismLineage(
      organism,
      req.generations_back || 5,
      req.memory_types
    );

    return { lineage_analysis: lineageAnalysis };
  }
);

interface CollectiveMemoryRequest {
  organism_ids: string[];
  memory_synthesis_strategy: 'consensus' | 'expertise_weighted' | 'diversity_maximizing';
  output_format: 'unified' | 'categorized' | 'hierarchical';
}

// Creates collective memory from multiple organisms.
export const synthesizeCollectiveMemory = api<CollectiveMemoryRequest, { collective_memory: any }>(
  { expose: true, method: "POST", path: "/organisms/collective-memory" },
  async (req) => {
    const organisms = await organismDB.rawQueryAll<Organism>(
      `SELECT * FROM organisms WHERE id = ANY($1)`,
      req.organism_ids
    );

    if (organisms.length === 0) {
      throw new Error("No organisms found");
    }

    const collectiveMemory = await createCollectiveMemory(
      organisms,
      req.memory_synthesis_strategy,
      req.output_format
    );

    return { collective_memory: collectiveMemory };
  }
);

interface MemoryEvolutionRequest {
  organism_id: string;
  evolution_triggers: string[];
  target_capabilities: string[];
}

// Evolves organism memory structure based on new capabilities and experiences.
export const evolveMemoryStructure = api<MemoryEvolutionRequest, { evolved_memory: any }>(
  { expose: true, method: "POST", path: "/organisms/:organism_id/evolve-memory" },
  async (req) => {
    const organism = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${req.organism_id}
    `;

    if (!organism) {
      throw new Error("Organism not found");
    }

    const evolvedMemory = await evolveMemoryForCapabilities(
      organism,
      req.evolution_triggers,
      req.target_capabilities
    );

    // Update organism with evolved memory structure
    await organismDB.exec`
      UPDATE organisms SET 
        memory = ${JSON.stringify(evolvedMemory.memory)},
        memory_version = memory_version + 1,
        updated_at = NOW()
      WHERE id = ${req.organism_id}
    `;

    return { evolved_memory: evolvedMemory };
  }
);

async function performMemoryInheritance(
  parent: Organism,
  child: Organism,
  strategy: string,
  domainFocus?: string[],
  inheritanceRatio?: number
): Promise<MemoryInheritanceResponse> {
  const systemPrompt = `You are a memory inheritance specialist for AI organisms. Transfer essential memories and knowledge from parent to child organism based on the specified strategy.

Parent Organism:
- Generation: ${parent.generation}
- Capabilities: ${parent.capabilities.join(', ')}
- Performance: ${JSON.stringify(parent.performance_metrics)}

Child Organism:
- Generation: ${child.generation}
- Capabilities: ${child.capabilities.join(', ')}

Inheritance Strategy: ${strategy}
Domain Focus: ${domainFocus?.join(', ') || 'None'}
Inheritance Ratio: ${inheritanceRatio || 0.3}`;

  const prompt = `Parent Memory Structure:
${JSON.stringify(parent.memory, null, 2)}

Child Current Memory:
${JSON.stringify(child.memory, null, 2)}

Perform memory inheritance using the ${strategy} strategy. Return a JSON object with:
1. inherited_memory: The memory structure to inherit
2. inheritance_summary: Summary of what was inherited
3. adaptation_recommendations: How child should adapt inherited memories
4. critical_learnings: Most important inherited learnings
5. inheritance_metrics: Metrics about the inheritance process

Strategies:
- essential_only: Transfer only critical survival and performance knowledge
- domain_specific: Transfer knowledge related to specific domains
- adaptive: Transfer knowledge that adapts to child's capabilities
- full_lineage: Transfer comprehensive lineage knowledge`;

  const response = await llmClient.generateText(prompt, systemPrompt);

  try {
    const inheritanceData = JSON.parse(response);
    
    // Merge inherited memory with child's existing memory
    const mergedMemory = await mergeInheritedMemory(
      child.memory,
      inheritanceData.inherited_memory,
      strategy
    );

    // Update child organism with inherited memory
    await organismDB.exec`
      UPDATE organisms SET 
        memory = ${JSON.stringify(mergedMemory)},
        updated_at = NOW()
      WHERE id = ${child.id}
    `;

    // Transfer relevant knowledge entries
    const inheritedKnowledge = await inheritKnowledgeEntries(
      parent.id,
      child.id,
      strategy,
      domainFocus
    );

    return {
      inherited_memories: Object.keys(inheritanceData.inherited_memory || {}).length,
      inherited_knowledge: inheritedKnowledge,
      inheritance_summary: inheritanceData.inheritance_summary || 'Memory inheritance completed',
      adaptation_recommendations: inheritanceData.adaptation_recommendations || []
    };
  } catch (error) {
    // Fallback inheritance
    const fallbackInheritance = await fallbackMemoryInheritance(parent, child, strategy);
    return fallbackInheritance;
  }
}

async function mergeInheritedMemory(
  childMemory: any,
  inheritedMemory: any,
  strategy: string
): Promise<any> {
  const merged = { ...childMemory };

  // Add inheritance metadata
  merged.inheritance_history = merged.inheritance_history || [];
  merged.inheritance_history.push({
    strategy,
    inherited_at: new Date(),
    inherited_keys: Object.keys(inheritedMemory)
  });

  // Merge inherited memory based on strategy
  switch (strategy) {
    case 'essential_only':
      // Only merge critical categories
      const essentialKeys = ['core_learnings', 'error_solutions', 'optimization_patterns'];
      for (const key of essentialKeys) {
        if (inheritedMemory[key]) {
          merged[key] = merged[key] || [];
          if (Array.isArray(merged[key]) && Array.isArray(inheritedMemory[key])) {
            merged[key] = [...merged[key], ...inheritedMemory[key]];
          } else {
            merged[key] = inheritedMemory[key];
          }
        }
      }
      break;

    case 'adaptive':
      // Merge all inherited memory with adaptation markers
      for (const [key, value] of Object.entries(inheritedMemory)) {
        merged[`inherited_${key}`] = {
          value,
          inherited_from: 'parent',
          adaptation_needed: true
        };
      }
      break;

    default:
      // Full merge for other strategies
      Object.assign(merged, inheritedMemory);
  }

  return merged;
}

async function inheritKnowledgeEntries(
  parentId: string,
  childId: string,
  strategy: string,
  domainFocus?: string[]
): Promise<number> {
  let whereClause = `organism_id = $1 AND confidence_score >= 0.7`;
  const params: any[] = [parentId];
  let paramIndex = 2;

  if (strategy === 'essential_only') {
    whereClause += ` AND knowledge_type IN ('error_solution', 'optimization_technique', 'critical_learning')`;
  }

  if (domainFocus && domainFocus.length > 0) {
    whereClause += ` AND (knowledge_type = ANY($${paramIndex}) OR content::text ILIKE ANY($${paramIndex + 1}))`;
    params.push(domainFocus);
    params.push(domainFocus.map(domain => `%${domain}%`));
    paramIndex += 2;
  }

  const parentKnowledge = await organismDB.rawQueryAll<KnowledgeEntry>(
    `SELECT * FROM knowledge_base WHERE ${whereClause} ORDER BY confidence_score DESC LIMIT 50`,
    ...params
  );

  let inheritedCount = 0;
  for (const knowledge of parentKnowledge) {
    // Check if child already has similar knowledge
    const existingKnowledge = await organismDB.queryRow<KnowledgeEntry>`
      SELECT * FROM knowledge_base 
      WHERE organism_id = ${childId}
      AND knowledge_type = ${knowledge.knowledge_type}
      AND source = ${knowledge.source}
    `;

    if (!existingKnowledge) {
      await organismDB.exec`
        INSERT INTO knowledge_base (
          organism_id, knowledge_type, content, source, confidence_score
        )
        VALUES (
          ${childId},
          ${knowledge.knowledge_type},
          ${JSON.stringify({
            ...knowledge.content,
            inherited_from_parent: parentId,
            inheritance_timestamp: new Date(),
            inheritance_strategy: strategy
          })},
          ${knowledge.source},
          ${Math.min(knowledge.confidence_score * 0.8, 0.9)} -- Reduce confidence for inherited knowledge
        )
      `;
      inheritedCount++;
    }
  }

  return inheritedCount;
}

async function fallbackMemoryInheritance(
  parent: Organism,
  child: Organism,
  strategy: string
): Promise<MemoryInheritanceResponse> {
  const childMemory = { ...child.memory };
  
  // Simple inheritance of essential patterns
  if (parent.memory.successful_strategies) {
    childMemory.inherited_strategies = parent.memory.successful_strategies;
  }
  
  if (parent.memory.error_solutions) {
    childMemory.inherited_error_solutions = parent.memory.error_solutions;
  }

  await organismDB.exec`
    UPDATE organisms SET 
      memory = ${JSON.stringify(childMemory)},
      updated_at = NOW()
    WHERE id = ${child.id}
  `;

  return {
    inherited_memories: 2,
    inherited_knowledge: 0,
    inheritance_summary: `Fallback inheritance completed using ${strategy} strategy`,
    adaptation_recommendations: ['Review inherited strategies for relevance', 'Adapt error solutions to current context']
  };
}

async function analyzeOrganismLineage(
  organism: Organism,
  generationsBack: number,
  memoryTypes?: string[]
): Promise<any> {
  // Get lineage organisms
  const lineageOrganisms = await getOrganismLineage(organism.id, generationsBack);
  
  const systemPrompt = `You are a lineage analysis specialist. Analyze memory evolution across organism generations to identify patterns, improvements, and inheritance effectiveness.`;

  const prompt = `Analyze the memory lineage for organism ${organism.name}:

Current Organism (Generation ${organism.generation}):
${JSON.stringify(organism.memory, null, 2)}

Lineage Organisms:
${lineageOrganisms.map(o => `Generation ${o.generation}: ${JSON.stringify(o.memory, null, 2)}`).join('\n\n')}

Provide analysis including:
1. Memory evolution patterns
2. Inherited vs. learned knowledge
3. Lineage strengths and weaknesses
4. Optimization opportunities
5. Inheritance effectiveness metrics

Return as structured JSON.`;

  const response = await llmClient.generateText(prompt, systemPrompt);

  try {
    return JSON.parse(response);
  } catch (error) {
    return {
      evolution_patterns: ['Memory complexity increases with generation'],
      inherited_knowledge: lineageOrganisms.length,
      lineage_strengths: ['Accumulated experience', 'Error recovery patterns'],
      optimization_opportunities: ['Memory compression', 'Knowledge deduplication'],
      inheritance_effectiveness: 0.7
    };
  }
}

async function getOrganismLineage(organismId: string, generationsBack: number): Promise<Organism[]> {
  const lineage: Organism[] = [];
  let currentId = organismId;

  for (let i = 0; i < generationsBack; i++) {
    const organism = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${currentId}
    `;

    if (!organism || !organism.parent_id) break;

    const parent = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${organism.parent_id}
    `;

    if (parent) {
      lineage.push(parent);
      currentId = parent.id;
    } else {
      break;
    }
  }

  return lineage;
}

async function createCollectiveMemory(
  organisms: Organism[],
  synthesisStrategy: string,
  outputFormat: string
): Promise<any> {
  const systemPrompt = `You are a collective memory synthesis specialist. Combine memories from multiple organisms to create a unified knowledge base.

Synthesis Strategy: ${synthesisStrategy}
Output Format: ${outputFormat}
Number of Organisms: ${organisms.length}

Strategies:
- consensus: Include only knowledge agreed upon by multiple organisms
- expertise_weighted: Weight knowledge by organism performance and generation
- diversity_maximizing: Include diverse perspectives and approaches`;

  const prompt = `Synthesize collective memory from the following organisms:

${organisms.map((o, i) => `
Organism ${i + 1} (Gen ${o.generation}):
Performance: ${JSON.stringify(o.performance_metrics)}
Memory: ${JSON.stringify(o.memory, null, 2)}
`).join('\n')}

Create a collective memory structure using ${synthesisStrategy} strategy in ${outputFormat} format.

Return a JSON object with:
1. collective_memory: The synthesized memory structure
2. synthesis_summary: Summary of the synthesis process
3. contributing_organisms: List of organisms and their contributions
4. confidence_scores: Confidence in different memory sections
5. synthesis_metrics: Metrics about the synthesis quality`;

  const response = await llmClient.generateText(prompt, systemPrompt);

  try {
    return JSON.parse(response);
  } catch (error) {
    // Fallback collective memory
    return createFallbackCollectiveMemory(organisms, synthesisStrategy);
  }
}

function createFallbackCollectiveMemory(organisms: Organism[], strategy: string): any {
  const collective = {
    synthesis_strategy: strategy,
    contributing_organisms: organisms.map(o => o.id),
    collective_knowledge: {},
    performance_insights: {},
    shared_capabilities: [],
    synthesis_timestamp: new Date()
  };

  // Aggregate common capabilities
  const allCapabilities = organisms.flatMap(o => o.capabilities);
  const capabilityCounts = allCapabilities.reduce((acc, cap) => {
    acc[cap] = (acc[cap] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  collective.shared_capabilities = Object.entries(capabilityCounts)
    .filter(([_, count]) => count >= Math.ceil(organisms.length / 2))
    .map(([cap, _]) => cap);

  // Aggregate performance metrics
  const avgMetrics = organisms.reduce((acc, o) => {
    Object.keys(o.performance_metrics).forEach(key => {
      acc[key] = (acc[key] || 0) + o.performance_metrics[key];
    });
    return acc;
  }, {} as Record<string, number>);

  Object.keys(avgMetrics).forEach(key => {
    avgMetrics[key] /= organisms.length;
  });

  collective.performance_insights = avgMetrics;

  return collective;
}

async function evolveMemoryForCapabilities(
  organism: Organism,
  evolutionTriggers: string[],
  targetCapabilities: string[]
): Promise<any> {
  const systemPrompt = `You are a memory evolution specialist. Evolve organism memory structure to support new capabilities and respond to evolution triggers.

Current Capabilities: ${organism.capabilities.join(', ')}
Target Capabilities: ${targetCapabilities.join(', ')}
Evolution Triggers: ${evolutionTriggers.join(', ')}
Current Generation: ${organism.generation}`;

  const prompt = `Current Memory Structure:
${JSON.stringify(organism.memory, null, 2)}

Evolve this memory structure to support the target capabilities and respond to evolution triggers.

Return a JSON object with:
1. evolved_memory: The evolved memory structure
2. evolution_summary: Summary of changes made
3. new_memory_categories: New memory categories added
4. capability_mappings: How memory supports new capabilities
5. evolution_metrics: Metrics about the evolution process

Ensure the evolved memory structure:
- Supports all target capabilities
- Maintains existing critical knowledge
- Optimizes for the identified triggers
- Scales efficiently with organism growth`;

  const response = await llmClient.generateText(prompt, systemPrompt);

  try {
    const evolutionResult = JSON.parse(response);
    return {
      memory: evolutionResult.evolved_memory || organism.memory,
      summary: evolutionResult.evolution_summary || 'Memory structure evolved',
      new_categories: evolutionResult.new_memory_categories || [],
      capability_mappings: evolutionResult.capability_mappings || {},
      metrics: evolutionResult.evolution_metrics || {}
    };
  } catch (error) {
    // Fallback evolution
    const evolvedMemory = { ...organism.memory };
    
    // Add memory categories for new capabilities
    for (const capability of targetCapabilities) {
      if (!organism.capabilities.includes(capability)) {
        evolvedMemory[`${capability}_memory`] = {
          learned_patterns: [],
          optimization_strategies: [],
          performance_data: {}
        };
      }
    }

    // Add evolution tracking
    evolvedMemory.evolution_history = evolvedMemory.evolution_history || [];
    evolvedMemory.evolution_history.push({
      triggers: evolutionTriggers,
      target_capabilities: targetCapabilities,
      evolved_at: new Date()
    });

    return {
      memory: evolvedMemory,
      summary: 'Fallback memory evolution applied',
      new_categories: targetCapabilities.map(cap => `${cap}_memory`),
      capability_mappings: {},
      metrics: { evolution_confidence: 0.6 }
    };
  }
}
