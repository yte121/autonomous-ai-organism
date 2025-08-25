import { api } from "encore.dev/api";
import { organismDB } from "./db";
import { llmClient } from "../llm/client";
import { logger } from '../logger';
import { _evolveLogic } from "./evolve";
import { _executeComputerOperationLogic } from "./autonomous_controller";
import type { Organism, Task, EvolutionRequest } from "./types";

interface EcosystemHealthRequest {
  include_metrics?: boolean;
  include_recommendations?: boolean;
}

interface EcosystemHealthResponse {
  overall_health_score: number;
  organism_distribution: Record<string, number>;
  performance_trends: Record<string, number>;
  resource_utilization: Record<string, number>;
  recommendations: any[];
  critical_issues: string[];
}

// Monitors and maintains the health of the AI organism ecosystem.
export const getEcosystemHealth = api<EcosystemHealthRequest, EcosystemHealthResponse>(
  { expose: true, method: "GET", path: "/ecosystem/health" },
  async (req) => {
    const organisms = await organismDB.queryAll<Organism>`
      SELECT * FROM organisms ORDER BY created_at DESC
    `;

    const tasks = await organismDB.queryAll<Task>`
      SELECT * FROM tasks ORDER BY created_at DESC LIMIT 100
    `;

    const healthAnalysis = await analyzeEcosystemHealth(organisms, tasks);
    
    let recommendations: any[] = [];
    if (req.include_recommendations) {
      recommendations = await generateEcosystemRecommendations(healthAnalysis);
    }

    return {
      overall_health_score: healthAnalysis.overall_health_score,
      organism_distribution: healthAnalysis.organism_distribution,
      performance_trends: healthAnalysis.performance_trends,
      resource_utilization: healthAnalysis.resource_utilization,
      recommendations: recommendations,
      critical_issues: healthAnalysis.critical_issues
    };
  }
);

interface EcosystemOptimizationRequest {
  optimization_goals: string[];
  constraints?: Record<string, any>;
  simulation_mode?: boolean;
}

// Optimizes the ecosystem for better performance and resource utilization.
export const optimizeEcosystem = api<EcosystemOptimizationRequest, { optimization_result: any }>(
  { expose: true, method: "POST", path: "/ecosystem/optimize" },
  async (req) => {
    const organisms = await organismDB.queryAll<Organism>`
      SELECT * FROM organisms WHERE status = 'active'
    `;

    const optimizationResult = await performEcosystemOptimization(
      organisms,
      req.optimization_goals,
      req.constraints,
      req.simulation_mode || false
    );

    if (!req.simulation_mode) {
      await applyOptimizationChanges(optimizationResult);
    }

    return { optimization_result: optimizationResult };
  }
);

interface ResourceAllocationRequest {
  allocation_strategy: 'performance_based' | 'need_based' | 'balanced' | 'experimental';
  resource_types: string[];
  total_resources: Record<string, number>;
}

// Manages resource allocation across organisms in the ecosystem.
export const allocateResources = api<ResourceAllocationRequest, { allocation_result: any }>(
  { expose: true, method: "POST", path: "/ecosystem/allocate-resources" },
  async (req) => {
    const organisms = await organismDB.queryAll<Organism>`
      SELECT * FROM organisms WHERE status = 'active'
    `;

    const allocationResult = await calculateResourceAllocation(
      organisms,
      req.allocation_strategy,
      req.resource_types,
      req.total_resources
    );

    await applyResourceAllocation(allocationResult);

    return { allocation_result: allocationResult };
  }
);

interface EcosystemEvolutionRequest {
  evolution_pressure: string[];
  selection_criteria: Record<string, number>;
  mutation_rate?: number;
}

// Guides ecosystem-wide evolution based on environmental pressures.
export const guideEcosystemEvolution = api<EcosystemEvolutionRequest, { evolution_result: any }>(
  { expose: true, method: "POST", path: "/ecosystem/evolve" },
  async (req) => {
    const organisms = await organismDB.queryAll<Organism>`
      SELECT * FROM organisms WHERE status = 'active'
    `;

    const evolutionResult = await orchestrateEcosystemEvolution(
      organisms,
      req.evolution_pressure,
      req.selection_criteria,
      req.mutation_rate || 0.1
    );

    return { evolution_result: evolutionResult };
  }
);

interface DiversityAnalysisRequest {
  analysis_dimensions: string[];
  include_recommendations?: boolean;
}

// Analyzes and maintains diversity within the organism ecosystem.
export const analyzeDiversity = api<DiversityAnalysisRequest, { diversity_analysis: any }>(
  { expose: true, method: "POST", path: "/ecosystem/diversity" },
  async (req) => {
    const organisms = await organismDB.queryAll<Organism>`
      SELECT * FROM organisms WHERE status IN ('active', 'evolving')
    `;

    const diversityAnalysis = await performDiversityAnalysis(
      organisms,
      req.analysis_dimensions
    );

    if (req.include_recommendations) {
      diversityAnalysis.recommendations = await generateDiversityRecommendations(diversityAnalysis);
    }

    return { diversity_analysis: diversityAnalysis };
  }
);

async function analyzeEcosystemHealth(
  organisms: Organism[],
  tasks: Task[]
): Promise<any> {
  const activeOrganisms = organisms.filter(o => o.status === 'active');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const failedTasks = tasks.filter(t => t.status === 'failed');

  // Calculate organism distribution
  const organismDistribution = organisms.reduce((dist, org) => {
    dist[org.status] = (dist[org.status] || 0) + 1;
    return dist;
  }, {} as Record<string, number>);

  // Calculate performance trends
  const avgSuccessRate = activeOrganisms.length > 0 
    ? activeOrganisms.reduce((sum, o) => sum + o.performance_metrics.success_rate, 0) / activeOrganisms.length
    : 0;

  const avgLearningEfficiency = activeOrganisms.length > 0
    ? activeOrganisms.reduce((sum, o) => sum + o.performance_metrics.learning_efficiency, 0) / activeOrganisms.length
    : 0;

  const taskSuccessRate = tasks.length > 0 
    ? completedTasks.length / (completedTasks.length + failedTasks.length)
    : 0;

  // Calculate resource utilization
  const totalMemoryUsage = organisms.reduce((sum, o) => sum + JSON.stringify(o.memory).length, 0);
  const avgMemoryPerOrganism = organisms.length > 0 ? totalMemoryUsage / organisms.length : 0;

  // Identify critical issues
  const criticalIssues: string[] = [];
  if (avgSuccessRate < 0.6) criticalIssues.push('Low organism success rate');
  if (taskSuccessRate < 0.7) criticalIssues.push('High task failure rate');
  if (activeOrganisms.length < 3) criticalIssues.push('Insufficient active organisms');
  if (avgLearningEfficiency < 0.5) criticalIssues.push('Poor learning efficiency');

  // Calculate overall health score
  const healthFactors = [
    avgSuccessRate,
    avgLearningEfficiency,
    taskSuccessRate,
    Math.min(activeOrganisms.length / 10, 1), // Normalize to 0-1
    1 - (criticalIssues.length / 10) // Penalty for issues
  ];

  const overallHealthScore = healthFactors.reduce((sum, factor) => sum + factor, 0) / healthFactors.length;

  return {
    overall_health_score: overallHealthScore,
    organism_distribution: organismDistribution,
    performance_trends: {
      avg_success_rate: avgSuccessRate,
      avg_learning_efficiency: avgLearningEfficiency,
      task_success_rate: taskSuccessRate
    },
    resource_utilization: {
      total_memory_usage: totalMemoryUsage,
      avg_memory_per_organism: avgMemoryPerOrganism,
      active_organism_count: activeOrganisms.length
    },
    critical_issues: criticalIssues
  };
}

async function generateEcosystemRecommendations(healthAnalysis: any): Promise<any[]> {
  const systemPrompt = `You are an ecosystem optimization specialist for AI organisms. Generate actionable, structured recommendations to improve ecosystem health.

Return a JSON array of action objects. Each object must have an 'action' key and a 'parameters' key.
Valid actions are: 'optimize_ecosystem', 'guide_ecosystem_evolution', 'allocate_resources', 'create_organism'.
Example: [{ "action": "create_organism", "parameters": { "count": 2, "purpose": "Address low organism count" } }]`;

  const prompt = `Ecosystem Health Analysis:
${JSON.stringify(healthAnalysis, null, 2)}

Based on this analysis, provide specific, actionable recommendations.`;

  const response = await llmClient.generateText(prompt, systemPrompt);

  try {
    const recommendations = JSON.parse(response);
    // Basic validation
    if (Array.isArray(recommendations) && recommendations.every(r => r.action && r.parameters)) {
      return recommendations;
    }
    throw new Error("Invalid recommendation format from LLM.");
  } catch (error) {
    logger.error({ err: error, healthAnalysis, functionName: 'generateEcosystemRecommendations' }, "Failed to generate structured ecosystem recommendations");
    // Fallback to generating simple text-based recommendations if structured generation fails
    const fallbackRecommendations: any[] = [];
    if (healthAnalysis.critical_issues.length > 0) {
      fallbackRecommendations.push({
        action: 'manual_review',
        parameters: { issues: healthAnalysis.critical_issues }
      });
    }
    if (healthAnalysis.overall_health_score < 0.7) {
      fallbackRecommendations.push({
        action: 'optimize_ecosystem',
        parameters: { optimization_goals: ['Improve overall health score'] }
      });
    }
    return fallbackRecommendations;
  }
}

async function performEcosystemOptimization(
  organisms: Organism[],
  optimizationGoals: string[],
  constraints?: Record<string, any>,
  simulationMode: boolean = false
): Promise<any> {
  const systemPrompt = `You are an ecosystem optimization engine for AI organisms. Design concrete, actionable optimization strategies.

Current Ecosystem:
- Active Organisms: ${organisms.length}
- Optimization Goals: ${optimizationGoals.join(', ')}
- Simulation Mode: ${simulationMode}

Return a JSON object with:
- optimization_strategy: A high-level description of your plan.
- organism_modifications: An object where each key is an organism_id. The value is an array of action objects.
  - Each action object must have an 'action' key (e.g., 'create_capability', 'self_modify_code') and other necessary parameters.
  - Example: { "organism_id_1": [{ "action": "create_capability", "name": "new_skill", "description": "A new skill to do X." }] }
- implementation_steps: A text description of the execution plan.`;

  const prompt = `Organisms Overview:
${organisms.map(o => `- ${o.name} (ID: ${o.id}, Gen: ${o.generation}): ${o.capabilities.join(', ')}`).join('\n')}

Constraints: ${JSON.stringify(constraints || {})}

Design an optimization strategy that achieves the goals by defining specific modifications for organisms.
Focus on creating new capabilities or modifying existing code.
For 'self_modify_code', provide a 'target_file' and a 'change_description'.
For 'create_capability', provide a 'name' and a 'description'.`;

  const response = await llmClient.generateText(prompt, systemPrompt);

  try {
    const optimizationResult = JSON.parse(response);
    return {
      simulation_mode: simulationMode,
      optimization_goals: optimizationGoals,
      ...optimizationResult
    };
  } catch (error) {
    logger.error({ err: error, functionName: 'performEcosystemOptimization' }, "Failed to parse optimization plan from LLM");
    return {
      simulation_mode: simulationMode,
      optimization_goals: optimizationGoals,
      optimization_strategy: 'Failed to generate a valid plan.',
      organism_modifications: {},
    };
  }
}

async function applyOptimizationChanges(optimizationResult: any): Promise<any> {
  const results = [];
  if (!optimizationResult.organism_modifications) {
    return { summary: "No organism modifications specified in the plan." };
  }

  for (const [organismId, modifications] of Object.entries(optimizationResult.organism_modifications)) {
    if (!Array.isArray(modifications)) continue;

    for (const modification of modifications) {
      try {
        let operationResult;
        switch (modification.action) {
          case 'create_capability':
            operationResult = await _executeComputerOperationLogic(organismId, 'create_capability', {
              name: modification.name,
              description: modification.description,
            });
            break;

          case 'self_modify_code':
            operationResult = await _executeComputerOperationLogic(organismId, 'self_modify_code', {
              target_file: modification.target_file,
              change_description: modification.change_description,
            });
            break;

          default:
            logger.warn({ modification }, `Unsupported modification action`);
            continue;
        }
        results.push({ organismId, action: modification.action, status: 'success', result: operationResult });
      } catch (error) {
        logger.error({ err: error, organismId, modification, functionName: 'applyOptimizationChanges' }, `Failed to apply optimization for organism`);
        results.push({ organismId, action: modification.action, status: 'failed', error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  const summary = `Applied ${results.length} modifications. Success: ${results.filter(r => r.status === 'success').length}, Failed: ${results.filter(r => r.status === 'failed').length}.`;

  // Log optimization event
  await organismDB.exec`
    INSERT INTO knowledge_base (organism_id, knowledge_type, content, source, confidence_score)
    VALUES (
      ${null},
      'ecosystem_optimization',
      ${JSON.stringify({
        optimization_plan: optimizationResult,
        execution_results: results,
        summary,
        applied_at: new Date()
      })},
      'ecosystem_manager',
      0.9
    )
  `;

  return { summary, results };
}

async function calculateResourceAllocation(
  organisms: Organism[],
  allocationStrategy: string,
  resourceTypes: string[],
  totalResources: Record<string, number>
): Promise<any> {
  const systemPrompt = `You are a resource allocation optimizer for AI organism ecosystems. Design a fair and efficient resource distribution strategy.

Allocation Strategy: ${allocationStrategy}
Total Resources: ${JSON.stringify(totalResources)}
Organism Count: ${organisms.length}

Return a JSON object with a single key: "allocation_plan".
The value should be an object where each key is an organism_id and the value is an object of allocated resources.
Example: { "allocation_plan": { "organism_id_1": { "cpu": 50, "memory": 1024 } } }`;

  const prompt = `Organisms:
${organisms.map(o => `- ID: ${o.id}, Name: ${o.name}, Performance: ${o.performance_metrics.success_rate.toFixed(2)}`).join('\n')}

Calculate the optimal resource allocation for these organisms using the '${allocationStrategy}' strategy.`;

  const response = await llmClient.generateText(prompt, systemPrompt);

  try {
    const plan = JSON.parse(response);
    if (!plan.allocation_plan) throw new Error("Invalid plan format from LLM.");
    return plan;
  } catch (error) {
    logger.error({ err: error, functionName: 'calculateResourceAllocation' }, "Failed to parse resource allocation plan from LLM");
    // Fallback to equal allocation
    const equalShare = organisms.length > 0 ? 1 / organisms.length : 0;
    const allocationPlan = organisms.reduce((plan, organism) => {
      plan[organism.id] = resourceTypes.reduce((resources, type) => {
        resources[type] = totalResources[type] * equalShare;
        return resources;
      }, {} as Record<string, number>);
      return plan;
    }, {} as Record<string, Record<string, number>>);

    return { allocation_plan: allocationPlan };
  }
}

async function applyResourceAllocation(allocationResult: any): Promise<any> {
  if (!allocationResult.allocation_plan) {
    return { summary: "No allocation plan provided." };
  }

  const results = [];
  for (const [organismId, allocation] of Object.entries(allocationResult.allocation_plan)) {
    try {
      await organismDB.exec`
        UPDATE organisms
        SET resources = ${JSON.stringify(allocation)}, updated_at = NOW()
        WHERE id = ${organismId}
      `;
      results.push({ organismId, status: 'success', allocated: allocation });
    } catch (error) {
      logger.error({ err: error, organismId, allocation, functionName: 'applyResourceAllocation' }, `Failed to allocate resources for organism`);
      results.push({ organismId, status: 'failed', error: error instanceof Error ? error.message : String(error) });
    }
  }

  const summary = `Applied resource allocation to ${results.length} organisms. Success: ${results.filter(r => r.status === 'success').length}, Failed: ${results.filter(r => r.status === 'failed').length}.`;

  return { summary, results };
}

async function orchestrateEcosystemEvolution(
  organisms: Organism[],
  evolutionPressure: string[],
  selectionCriteria: Record<string, number>,
  mutationRate: number
): Promise<any> {
  const systemPrompt = `You are an ecosystem evolution orchestrator for AI organisms. Guide natural selection and evolution processes to improve ecosystem fitness.

Evolution Pressure: ${evolutionPressure.join(', ')}
Selection Criteria: ${JSON.stringify(selectionCriteria)}
Mutation Rate: ${mutationRate}
Population Size: ${organisms.length}

Return JSON with:
- evolution_plan: Overall evolution strategy
- fitness_rankings: Organism fitness scores (a Record<organism_id, score>)
- evolution_candidates: An array of organism_ids selected for evolution
- mutation_strategies: An array of beneficial mutation descriptions (strings)
- diversity_preservation: A string describing how to maintain variety
- generational_timeline: A string describing the evolution schedule`;

  const prompt = `Current Population:
${organisms.map(o => `- ${o.name} (ID: ${o.id}, Gen: ${o.generation}): Fitness ${o.performance_metrics.success_rate.toFixed(2)}`).join('\n')}

Orchestrate ecosystem evolution by:
1. Evaluating organism fitness based on selection criteria.
2. Identifying candidates for evolution/replication.
3. Determining beneficial mutations.
4. Planning generational transitions.
5. Maintaining genetic diversity.`;

  const response = await llmClient.generateText(prompt, systemPrompt);

  try {
    const evolutionPlan = JSON.parse(response);
    const candidates = evolutionPlan.evolution_candidates;
    let evolvedCount = 0;

    if (candidates && Array.isArray(candidates) && candidates.length > 0) {
      logger.info(`Ecosystem evolution triggered for ${candidates.length} candidates.`);
      for (const organismId of candidates) {
        try {
          const evolutionRequest: EvolutionRequest = {
            organism_id: organismId,
            evolution_triggers: evolutionPressure,
            target_improvements: evolutionPlan.mutation_strategies || ['General performance enhancement'],
          };
          await _evolveLogic(evolutionRequest);
          evolvedCount++;
        } catch (error) {
          logger.error({ err: error, organismId, functionName: 'orchestrateEcosystemEvolution' }, `Failed to evolve organism during ecosystem evolution`);
        }
      }
    }

    const summary = `Ecosystem evolution complete. Plan generated with ${candidates?.length || 0} candidates. Successfully triggered evolution for ${evolvedCount} organisms.`;
    evolutionPlan.execution_summary = summary;

    // Log the event
    await organismDB.exec`
      INSERT INTO knowledge_base (organism_id, knowledge_type, content, source, confidence_score)
      VALUES (
        ${null},
        'ecosystem_evolution',
        ${JSON.stringify({
          evolution_plan: evolutionPlan,
          evolution_pressure: evolutionPressure,
          selection_criteria: selectionCriteria,
          mutation_rate: mutationRate,
          timestamp: new Date()
        })},
        'ecosystem_evolution_system',
        0.9
      )
    `;

    return evolutionPlan;
  } catch (error) {
    logger.error({ err: error, functionName: 'orchestrateEcosystemEvolution' }, "Failed to parse evolution plan or execute evolution");
    return {
      error: "Failed to execute ecosystem evolution.",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

async function performDiversityAnalysis(
  organisms: Organism[],
  analysisDimensions: string[]
): Promise<any> {
  const systemPrompt = `You are a diversity analysis specialist for AI organism ecosystems. Analyze and measure diversity across multiple dimensions to ensure ecosystem resilience.

Analysis Dimensions: ${analysisDimensions.join(', ')}
Population Size: ${organisms.length}`;

  const prompt = `Organism Population:
${organisms.map(o => `- ${o.name} (Gen ${o.generation}): ${o.capabilities.join(', ')}`).join('\n')}

Analyze diversity across dimensions:
${analysisDimensions.map(dim => `- ${dim}`).join('\n')}

Measure:
1. Capability diversity and distribution
2. Generational spread and balance
3. Performance variation and specialization
4. Knowledge domain coverage
5. Behavioral pattern variety

Return JSON with:
- diversity_scores: Scores for each dimension
- diversity_distribution: How diversity is distributed
- diversity_gaps: Areas lacking diversity
- diversity_strengths: Well-diversified areas
- diversity_trends: Changes over time
- optimization_opportunities: Ways to improve diversity`;

  const response = await llmClient.generateText(prompt, systemPrompt);

  try {
    return JSON.parse(response);
  } catch {
    // Calculate basic diversity metrics
    const capabilitySet = new Set(organisms.flatMap(o => o.capabilities));
    const generationSpread = Math.max(...organisms.map(o => o.generation)) - Math.min(...organisms.map(o => o.generation));
    
    return {
      diversity_scores: {
        capability_diversity: capabilitySet.size / 20, // Normalize to 0-1
        generational_diversity: Math.min(generationSpread / 5, 1),
        performance_diversity: 0.7 // Placeholder
      },
      diversity_distribution: 'Moderate diversity across dimensions',
      diversity_gaps: ['Limited specialized capabilities'],
      diversity_strengths: ['Good generational spread'],
      diversity_trends: 'Stable diversity levels',
      optimization_opportunities: ['Introduce specialized organisms']
    };
  }
}

async function generateDiversityRecommendations(diversityAnalysis: any): Promise<any[]> {
  const systemPrompt = `You are a diversity analysis specialist for AI organisms. Based on the analysis, generate actionable, structured recommendations to improve ecosystem diversity.

Return a JSON array of action objects. Each object must have an 'action' key and a 'parameters' key.
Valid actions are: 'guide_ecosystem_evolution', 'create_organism', 'assign_task'.
Example: [{ "action": "guide_ecosystem_evolution", "parameters": { "evolution_pressure": ["explore_new_domains"] } }]`;

  const prompt = `Diversity Analysis:
${JSON.stringify(diversityAnalysis, null, 2)}

Based on this analysis, provide specific, actionable recommendations to improve diversity.`;

  const response = await llmClient.generateText(prompt, systemPrompt);

  try {
    const recommendations = JSON.parse(response);
    if (Array.isArray(recommendations) && recommendations.every(r => r.action && r.parameters)) {
      return recommendations;
    }
    throw new Error("Invalid recommendation format from LLM.");
  } catch (error) {
    logger.error({ err: error, diversityAnalysis, functionName: 'generateDiversityRecommendations' }, "Failed to generate structured diversity recommendations");
    const fallbackRecommendations: any[] = [];
    if (diversityAnalysis.diversity_gaps?.length > 0) {
      fallbackRecommendations.push({
        action: 'guide_ecosystem_evolution',
        parameters: { evolution_pressure: [`Address gaps: ${diversityAnalysis.diversity_gaps.join(', ')}`] }
      });
    }
    return fallbackRecommendations;
  }
}
