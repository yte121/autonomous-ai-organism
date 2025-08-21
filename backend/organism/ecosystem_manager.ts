import { api } from "encore.dev/api";
import { organismDB } from "./db";
import { llmClient } from "../llm/client";
import type { Organism, Task } from "./types";

interface EcosystemHealthRequest {
  include_metrics?: boolean;
  include_recommendations?: boolean;
}

interface EcosystemHealthResponse {
  overall_health_score: number;
  organism_distribution: Record<string, number>;
  performance_trends: Record<string, number>;
  resource_utilization: Record<string, number>;
  recommendations: string[];
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
    
    let recommendations: string[] = [];
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

async function generateEcosystemRecommendations(healthAnalysis: any): Promise<string[]> {
  const systemPrompt = 'You are an ecosystem optimization specialist for AI organisms. Generate actionable recommendations to improve ecosystem health and performance.';

  const prompt = `Ecosystem Health Analysis:
${JSON.stringify(healthAnalysis, null, 2)}

Based on this analysis, provide specific, actionable recommendations to:
1. Improve overall ecosystem health
2. Address critical issues
3. Optimize resource utilization
4. Enhance organism performance
5. Maintain ecosystem balance

Return as a JSON array of recommendation strings.`;

  const response = await llmClient.generateText(prompt, systemPrompt);

  try {
    return JSON.parse(response);
  } catch {
    const recommendations: string[] = [];
    
    if (healthAnalysis.overall_health_score < 0.7) {
      recommendations.push('Implement ecosystem-wide performance optimization');
    }
    
    if (healthAnalysis.critical_issues.length > 0) {
      recommendations.push('Address critical issues: ' + healthAnalysis.critical_issues.join(', '));
    }
    
    if (healthAnalysis.resource_utilization.active_organism_count < 5) {
      recommendations.push('Create additional organisms to improve ecosystem diversity');
    }
    
    return recommendations;
  }
}

async function performEcosystemOptimization(
  organisms: Organism[],
  optimizationGoals: string[],
  constraints?: Record<string, any>,
  simulationMode: boolean = false
): Promise<any> {
  const systemPrompt = `You are an ecosystem optimization engine for AI organisms. Design comprehensive optimization strategies that improve ecosystem performance while maintaining stability.

Current Ecosystem:
- Active Organisms: ${organisms.length}
- Average Generation: ${organisms.reduce((sum, o) => sum + o.generation, 0) / organisms.length}
- Optimization Goals: ${optimizationGoals.join(', ')}
- Simulation Mode: ${simulationMode}`;

  const prompt = `Organisms Overview:
${organisms.map(o => `- ${o.name} (Gen ${o.generation}): ${o.capabilities.join(', ')}`).join('\n')}

Constraints: ${JSON.stringify(constraints || {})}

Design optimization strategy that:
1. Achieves the specified optimization goals
2. Respects all constraints
3. Maintains ecosystem stability
4. Improves overall performance
5. Preserves organism diversity

Return JSON with:
- optimization_strategy: Overall approach
- organism_modifications: Changes for each organism
- resource_reallocation: Resource distribution changes
- performance_predictions: Expected improvements
- risk_assessment: Potential risks and mitigation
- implementation_steps: Detailed execution plan`;

  const response = await llmClient.generateText(prompt, systemPrompt);

  try {
    const optimizationResult = JSON.parse(response);
    return {
      simulation_mode: simulationMode,
      optimization_goals: optimizationGoals,
      ...optimizationResult
    };
  } catch {
    return {
      simulation_mode: simulationMode,
      optimization_goals: optimizationGoals,
      optimization_strategy: 'Balanced ecosystem optimization',
      organism_modifications: {},
      resource_reallocation: {},
      performance_predictions: { overall_improvement: 0.1 },
      risk_assessment: { risk_level: 'low' },
      implementation_steps: ['Gradual optimization rollout']
    };
  }
}

async function applyOptimizationChanges(optimizationResult: any): Promise<void> {
  // Apply organism modifications
  if (optimizationResult.organism_modifications) {
    for (const [organismId, modifications] of Object.entries(optimizationResult.organism_modifications)) {
      const organism = await organismDB.queryRow<Organism>`
        SELECT * FROM organisms WHERE id = ${organismId}
      `;

      if (organism && modifications) {
        const updatedMemory = { ...organism.memory };
        updatedMemory.ecosystem_optimizations = updatedMemory.ecosystem_optimizations || [];
        updatedMemory.ecosystem_optimizations.push({
          timestamp: new Date(),
          modifications: modifications,
          optimization_goals: optimizationResult.optimization_goals
        });

        await organismDB.exec`
          UPDATE organisms SET 
            memory = ${JSON.stringify(updatedMemory)},
            updated_at = NOW()
          WHERE id = ${organismId}
        `;
      }
    }
  }

  // Log optimization event
  await organismDB.exec`
    INSERT INTO knowledge_base (organism_id, knowledge_type, content, source, confidence_score)
    VALUES (
      ${null},
      'ecosystem_optimization',
      ${JSON.stringify({
        optimization_result: optimizationResult,
        applied_at: new Date()
      })},
      'ecosystem_manager',
      0.9
    )
  `;
}

async function calculateResourceAllocation(
  organisms: Organism[],
  allocationStrategy: string,
  resourceTypes: string[],
  totalResources: Record<string, number>
): Promise<any> {
  const systemPrompt = `You are a resource allocation optimizer for AI organism ecosystems. Design fair and efficient resource distribution strategies.

Allocation Strategy: ${allocationStrategy}
Resource Types: ${resourceTypes.join(', ')}
Total Resources: ${JSON.stringify(totalResources)}
Organism Count: ${organisms.length}`;

  const prompt = `Organisms:
${organisms.map(o => `- ${o.name} (Gen ${o.generation}): Performance ${o.performance_metrics.success_rate.toFixed(2)}, Tasks ${o.performance_metrics.tasks_completed}`).join('\n')}

Calculate optimal resource allocation using ${allocationStrategy} strategy for:
${resourceTypes.map(type => `- ${type}: ${totalResources[type]} units`).join('\n')}

Consider:
1. Organism performance and potential
2. Current resource needs
3. Future growth requirements
4. Ecosystem balance
5. Fairness and efficiency

Return JSON with:
- allocation_plan: Resource distribution per organism
- allocation_rationale: Reasoning for allocations
- expected_outcomes: Predicted results
- monitoring_metrics: How to track success
- adjustment_triggers: When to reallocate`;

  const response = await llmClient.generateText(prompt, systemPrompt);

  try {
    return JSON.parse(response);
  } catch {
    // Fallback equal allocation
    const equalShare = organisms.length > 0 ? 1 / organisms.length : 0;
    const allocationPlan = organisms.reduce((plan, organism) => {
      plan[organism.id] = resourceTypes.reduce((resources, type) => {
        resources[type] = totalResources[type] * equalShare;
        return resources;
      }, {} as Record<string, number>);
      return plan;
    }, {} as Record<string, Record<string, number>>);

    return {
      allocation_plan: allocationPlan,
      allocation_rationale: 'Equal distribution among all organisms',
      expected_outcomes: ['Balanced resource utilization'],
      monitoring_metrics: ['Resource usage efficiency'],
      adjustment_triggers: ['Performance changes', 'New organisms']
    };
  }
}

async function applyResourceAllocation(allocationResult: any): Promise<void> {
  // Update organism memories with resource allocation
  if (allocationResult.allocation_plan) {
    for (const [organismId, allocation] of Object.entries(allocationResult.allocation_plan)) {
      const organism = await organismDB.queryRow<Organism>`
        SELECT * FROM organisms WHERE id = ${organismId}
      `;

      if (organism) {
        const updatedMemory = { ...organism.memory };
        updatedMemory.resource_allocation = {
          allocation: allocation,
          allocated_at: new Date(),
          allocation_strategy: allocationResult.allocation_rationale
        };

        await organismDB.exec`
          UPDATE organisms SET 
            memory = ${JSON.stringify(updatedMemory)},
            updated_at = NOW()
          WHERE id = ${organismId}
        `;
      }
    }
  }
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
Population Size: ${organisms.length}`;

  const prompt = `Current Population:
${organisms.map(o => `- ${o.name} (Gen ${o.generation}): Fitness ${o.performance_metrics.success_rate.toFixed(2)}`).join('\n')}

Orchestrate ecosystem evolution by:
1. Evaluating organism fitness based on selection criteria
2. Identifying candidates for evolution/replication
3. Determining beneficial mutations
4. Planning generational transitions
5. Maintaining genetic diversity

Return JSON with:
- evolution_plan: Overall evolution strategy
- fitness_rankings: Organism fitness scores
- evolution_candidates: Organisms selected for evolution
- mutation_strategies: Beneficial mutations to apply
- diversity_preservation: How to maintain variety
- generational_timeline: Evolution schedule`;

  const response = await llmClient.generateText(prompt, systemPrompt);

  try {
    const evolutionResult = JSON.parse(response);
    
    // Log evolution event
    await organismDB.exec`
      INSERT INTO knowledge_base (organism_id, knowledge_type, content, source, confidence_score)
      VALUES (
        ${null},
        'ecosystem_evolution',
        ${JSON.stringify({
          evolution_result: evolutionResult,
          evolution_pressure: evolutionPressure,
          selection_criteria: selectionCriteria,
          mutation_rate: mutationRate,
          timestamp: new Date()
        })},
        'ecosystem_evolution_system',
        0.9
      )
    `;

    return evolutionResult;
  } catch {
    return {
      evolution_plan: 'Gradual ecosystem evolution',
      fitness_rankings: organisms.reduce((rankings, o) => {
        rankings[o.id] = o.performance_metrics.success_rate;
        return rankings;
      }, {} as Record<string, number>),
      evolution_candidates: organisms.slice(0, Math.ceil(organisms.length * 0.3)).map(o => o.id),
      mutation_strategies: ['Capability enhancement', 'Performance optimization'],
      diversity_preservation: 'Maintain capability variety',
      generational_timeline: 'Continuous evolution'
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

async function generateDiversityRecommendations(diversityAnalysis: any): Promise<string[]> {
  const recommendations: string[] = [];
  
  if (diversityAnalysis.diversity_gaps?.length > 0) {
    recommendations.push(`Address diversity gaps: ${diversityAnalysis.diversity_gaps.join(', ')}`);
  }
  
  if (diversityAnalysis.optimization_opportunities?.length > 0) {
    recommendations.push(...diversityAnalysis.optimization_opportunities);
  }
  
  if (diversityAnalysis.diversity_scores) {
    const lowScores = Object.entries(diversityAnalysis.diversity_scores)
      .filter(([_, score]) => (score as number) < 0.6)
      .map(([dimension, _]) => dimension);
    
    if (lowScores.length > 0) {
      recommendations.push(`Improve diversity in: ${lowScores.join(', ')}`);
    }
  }
  
  return recommendations;
}
