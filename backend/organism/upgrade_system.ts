import { api } from "encore.dev/api";
import { organismDB } from "./db";
import { llmClient } from "../llm/client";
import type { Organism } from "./types";

interface UpgradeRequest {
  organism_id: string;
  upgrade_type: 'capability' | 'performance' | 'knowledge' | 'architecture';
  upgrade_source?: 'self_analysis' | 'external_data' | 'user_directive' | 'peer_learning';
  target_metrics?: Record<string, number>;
}

interface UpgradeResponse {
  upgrade_id: string;
  upgrade_plan: string;
  estimated_improvement: Record<string, number>;
  risks: string[];
  implementation_steps: string[];
}

// Enables organisms to upgrade themselves safely and efficiently.
export const upgradeOrganism = api<UpgradeRequest, UpgradeResponse>(
  { expose: true, method: "POST", path: "/organisms/:organism_id/upgrade" },
  async (req) => {
    const organism = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${req.organism_id} AND status = 'active'
    `;

    if (!organism) {
      throw new Error("Organism not found or not active");
    }

    // Analyze current state and determine upgrade plan
    const upgradePlan = await generateUpgradePlan(organism, req.upgrade_type, req.target_metrics);
    
    // Assess risks and safety measures
    const riskAssessment = await assessUpgradeRisks(organism, upgradePlan);
    
    // Create implementation steps
    const implementationSteps = await createImplementationSteps(upgradePlan, riskAssessment);

    const upgradeId = `upgrade_${Date.now()}`;

    // Log upgrade plan
    await logUpgradePlan(req.organism_id, upgradeId, upgradePlan, riskAssessment);

    return {
      upgrade_id: upgradeId,
      upgrade_plan: upgradePlan.description,
      estimated_improvement: upgradePlan.estimated_improvement,
      risks: riskAssessment.risks,
      implementation_steps: implementationSteps
    };
  }
);

interface OptimizationRequest {
  organism_id: string;
  optimization_target: 'speed' | 'accuracy' | 'efficiency' | 'learning_rate' | 'memory_usage';
  constraints?: Record<string, any>;
}

// Optimizes organism performance based on specific targets.
export const optimizePerformance = api<OptimizationRequest, { optimization_result: any }>(
  { expose: true, method: "POST", path: "/organisms/:organism_id/optimize" },
  async (req) => {
    const organism = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${req.organism_id} AND status = 'active'
    `;

    if (!organism) {
      throw new Error("Organism not found or not active");
    }

    // Analyze current performance
    const performanceAnalysis = await analyzeCurrentPerformance(organism);
    
    // Generate optimization strategy
    const optimizationStrategy = await generateOptimizationStrategy(
      organism,
      req.optimization_target,
      performanceAnalysis,
      req.constraints
    );

    // Apply optimizations
    const optimizationResult = await applyOptimizations(organism, optimizationStrategy);

    // Update organism with optimizations
    await updateOrganismWithOptimizations(req.organism_id, optimizationResult);

    return { optimization_result: optimizationResult };
  }
);

interface TechnologyAdoptionRequest {
  organism_id: string;
  technology: string;
  adoption_strategy: 'gradual' | 'immediate' | 'experimental';
  integration_requirements?: string[];
}

// Enables organisms to adopt and integrate new technologies.
export const adoptTechnology = api<TechnologyAdoptionRequest, { adoption_result: any }>(
  { expose: true, method: "POST", path: "/organisms/:organism_id/adopt-technology" },
  async (req) => {
    const organism = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${req.organism_id} AND status = 'active'
    `;

    if (!organism) {
      throw new Error("Organism not found or not active");
    }

    // Research the technology
    const technologyResearch = await researchTechnology(req.technology);
    
    // Assess compatibility with current organism
    const compatibilityAssessment = await assessTechnologyCompatibility(
      organism,
      technologyResearch
    );

    // Create adoption plan
    const adoptionPlan = await createTechnologyAdoptionPlan(
      organism,
      req.technology,
      req.adoption_strategy,
      compatibilityAssessment
    );

    // Execute adoption
    const adoptionResult = await executeTechnologyAdoption(organism, adoptionPlan);

    return { adoption_result: adoptionResult };
  }
);

interface SafetyValidationRequest {
  organism_id: string;
  proposed_changes: Record<string, any>;
  validation_level: 'basic' | 'comprehensive' | 'paranoid';
}

// Validates proposed changes for safety before implementation.
export const validateSafety = api<SafetyValidationRequest, { safety_report: any }>(
  { expose: true, method: "POST", path: "/organisms/:organism_id/validate-safety" },
  async (req) => {
    const organism = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${req.organism_id}
    `;

    if (!organism) {
      throw new Error("Organism not found");
    }

    const safetyReport = await performSafetyValidation(
      organism,
      req.proposed_changes,
      req.validation_level
    );

    return { safety_report: safetyReport };
  }
);

async function generateUpgradePlan(
  organism: Organism,
  upgradeType: string,
  targetMetrics?: Record<string, number>
): Promise<any> {
  const systemPrompt = `You are an AI organism upgrade planner. Generate comprehensive upgrade plans that improve organism capabilities while maintaining safety and stability.

Current Organism State:
- Generation: ${organism.generation}
- Capabilities: ${organism.capabilities.join(', ')}
- Performance Metrics: ${JSON.stringify(organism.performance_metrics)}
- Learned Technologies: ${organism.learned_technologies.join(', ')}`;

  const prompt = `Upgrade Type: ${upgradeType}
Target Metrics: ${JSON.stringify(targetMetrics || {})}

Generate a detailed upgrade plan including:
1. Specific improvements to be made
2. Estimated performance gains
3. Required resources
4. Implementation timeline
5. Success criteria
6. Rollback procedures

Return as structured JSON.`;

  const response = await llmClient.generateText(prompt, systemPrompt);
  
  try {
    const plan = JSON.parse(response);
    return {
      description: plan.description || response,
      estimated_improvement: plan.estimated_improvement || {},
      required_resources: plan.required_resources || [],
      timeline: plan.timeline || 'unknown',
      success_criteria: plan.success_criteria || []
    };
  } catch {
    return {
      description: response,
      estimated_improvement: {},
      required_resources: [],
      timeline: 'unknown',
      success_criteria: []
    };
  }
}

async function assessUpgradeRisks(
  organism: Organism,
  upgradePlan: any
): Promise<{ risks: string[]; mitigation_strategies: string[]; safety_score: number }> {
  const systemPrompt = 'You are a risk assessment specialist for AI organism upgrades. Identify potential risks and mitigation strategies.';
  
  const prompt = `Organism: ${organism.name} (Generation ${organism.generation})
Upgrade Plan: ${JSON.stringify(upgradePlan)}

Assess risks including:
1. Performance degradation
2. Capability conflicts
3. Memory corruption
4. Learning interference
5. Safety violations

Return risk assessment as JSON with risks, mitigation strategies, and safety score (0-1).`;

  const response = await llmClient.generateText(prompt, systemPrompt);
  
  try {
    const assessment = JSON.parse(response);
    return {
      risks: assessment.risks || [],
      mitigation_strategies: assessment.mitigation_strategies || [],
      safety_score: assessment.safety_score || 0.5
    };
  } catch {
    return {
      risks: ['Unknown risks due to parsing error'],
      mitigation_strategies: ['Proceed with caution'],
      safety_score: 0.3
    };
  }
}

async function createImplementationSteps(
  upgradePlan: any,
  riskAssessment: any
): Promise<string[]> {
  const steps = [
    'Create backup of current organism state',
    'Validate upgrade prerequisites',
    'Begin incremental implementation'
  ];

  if (upgradePlan.required_resources) {
    steps.push('Allocate required resources');
  }

  steps.push(
    'Monitor performance during upgrade',
    'Validate success criteria',
    'Finalize upgrade or rollback if needed'
  );

  return steps;
}

async function logUpgradePlan(
  organismId: string,
  upgradeId: string,
  upgradePlan: any,
  riskAssessment: any
): Promise<void> {
  await organismDB.exec`
    INSERT INTO knowledge_base (organism_id, knowledge_type, content, source, confidence_score)
    VALUES (
      ${organismId},
      'upgrade_plan',
      ${JSON.stringify({
        upgrade_id: upgradeId,
        plan: upgradePlan,
        risk_assessment: riskAssessment,
        timestamp: new Date()
      })},
      'upgrade_system',
      0.9
    )
  `;
}

async function analyzeCurrentPerformance(organism: Organism): Promise<any> {
  return {
    current_metrics: organism.performance_metrics,
    capability_utilization: organism.capabilities.length / 20, // Assume max 20 capabilities
    learning_efficiency: organism.performance_metrics.learning_efficiency,
    error_rate: 1 - organism.performance_metrics.error_recovery_rate,
    bottlenecks: identifyPerformanceBottlenecks(organism.performance_metrics)
  };
}

function identifyPerformanceBottlenecks(metrics: any): string[] {
  const bottlenecks: string[] = [];
  
  if (metrics.success_rate < 0.8) {
    bottlenecks.push('low_success_rate');
  }
  if (metrics.learning_efficiency < 0.6) {
    bottlenecks.push('slow_learning');
  }
  if (metrics.error_recovery_rate < 0.7) {
    bottlenecks.push('poor_error_recovery');
  }
  if (metrics.average_completion_time > 1000) {
    bottlenecks.push('slow_execution');
  }

  return bottlenecks;
}

async function generateOptimizationStrategy(
  organism: Organism,
  target: string,
  performanceAnalysis: any,
  constraints?: Record<string, any>
): Promise<any> {
  const systemPrompt = 'You are a performance optimization strategist for AI organisms. Generate specific optimization strategies based on performance analysis.';
  
  const prompt = `Optimization Target: ${target}
Current Performance: ${JSON.stringify(performanceAnalysis)}
Constraints: ${JSON.stringify(constraints || {})}

Generate optimization strategy including:
1. Specific optimizations to apply
2. Expected performance improvements
3. Implementation priority
4. Resource requirements

Return as JSON.`;

  const response = await llmClient.generateText(prompt, systemPrompt);
  
  try {
    return JSON.parse(response);
  } catch {
    return {
      optimizations: [`Optimize for ${target}`],
      expected_improvement: 0.1,
      priority: 'medium',
      resources: []
    };
  }
}

async function applyOptimizations(
  organism: Organism,
  strategy: any
): Promise<any> {
  const optimizationResult = {
    applied_optimizations: strategy.optimizations || [],
    performance_improvement: strategy.expected_improvement || 0.1,
    new_capabilities: [],
    updated_metrics: { ...organism.performance_metrics }
  };

  // Simulate performance improvements
  if (strategy.optimizations) {
    strategy.optimizations.forEach((opt: string) => {
      if (opt.includes('speed') || opt.includes('efficiency')) {
        optimizationResult.updated_metrics.average_completion_time *= 0.9;
      }
      if (opt.includes('accuracy') || opt.includes('success')) {
        optimizationResult.updated_metrics.success_rate = Math.min(1.0, optimizationResult.updated_metrics.success_rate * 1.1);
      }
      if (opt.includes('learning')) {
        optimizationResult.updated_metrics.learning_efficiency = Math.min(1.0, optimizationResult.updated_metrics.learning_efficiency * 1.1);
      }
    });
  }

  return optimizationResult;
}

async function updateOrganismWithOptimizations(
  organismId: string,
  optimizationResult: any
): Promise<void> {
  await organismDB.exec`
    UPDATE organisms SET 
      performance_metrics = ${JSON.stringify(optimizationResult.updated_metrics)},
      updated_at = NOW()
    WHERE id = ${organismId}
  `;

  // Log optimization
  await organismDB.exec`
    INSERT INTO knowledge_base (organism_id, knowledge_type, content, source, confidence_score)
    VALUES (
      ${organismId},
      'optimization_technique',
      ${JSON.stringify(optimizationResult)},
      'optimization_system',
      0.9
    )
  `;
}

async function researchTechnology(technology: string): Promise<any> {
  const systemPrompt = 'You are a technology research specialist. Provide comprehensive analysis of technologies for AI organism adoption.';
  
  const prompt = `Technology: ${technology}

Research and provide:
1. Technology overview and capabilities
2. Integration requirements
3. Potential benefits and risks
4. Compatibility considerations
5. Implementation complexity

Return as structured JSON.`;

  const response = await llmClient.generateText(prompt, systemPrompt);
  
  try {
    return JSON.parse(response);
  } catch {
    return {
      overview: `Research data for ${technology}`,
      capabilities: [],
      requirements: [],
      benefits: [],
      risks: [],
      complexity: 'medium'
    };
  }
}

async function assessTechnologyCompatibility(
  organism: Organism,
  technologyResearch: any
): Promise<any> {
  const compatibility = {
    compatibility_score: 0.7,
    compatible_capabilities: [],
    conflicts: [],
    requirements_met: true,
    adaptation_needed: []
  };

  // Check capability compatibility
  if (technologyResearch.requirements) {
    technologyResearch.requirements.forEach((req: string) => {
      if (organism.capabilities.includes(req)) {
        compatibility.compatible_capabilities.push(req);
      } else {
        compatibility.adaptation_needed.push(req);
      }
    });
  }

  return compatibility;
}

async function createTechnologyAdoptionPlan(
  organism: Organism,
  technology: string,
  strategy: string,
  compatibility: any
): Promise<any> {
  return {
    technology,
    strategy,
    phases: [
      'Research and preparation',
      'Compatibility testing',
      'Gradual integration',
      'Full adoption',
      'Optimization'
    ],
    timeline: strategy === 'immediate' ? 'fast' : 'gradual',
    success_criteria: [
      'Technology successfully integrated',
      'No performance degradation',
      'New capabilities functional'
    ]
  };
}

async function executeTechnologyAdoption(
  organism: Organism,
  adoptionPlan: any
): Promise<any> {
  // Simulate technology adoption
  const newCapabilities = [`${adoptionPlan.technology}_integration`];
  const updatedTechnologies = [...organism.learned_technologies, adoptionPlan.technology];

  await organismDB.exec`
    UPDATE organisms SET 
      capabilities = ${JSON.stringify([...organism.capabilities, ...newCapabilities])},
      learned_technologies = ${JSON.stringify(updatedTechnologies)},
      updated_at = NOW()
    WHERE id = ${organism.id}
  `;

  return {
    adoption_status: 'successful',
    new_capabilities: newCapabilities,
    integration_time: Date.now(),
    performance_impact: 'positive'
  };
}

async function performSafetyValidation(
  organism: Organism,
  proposedChanges: Record<string, any>,
  validationLevel: string
): Promise<any> {
  const systemPrompt = 'You are a safety validation system for AI organisms. Assess the safety of proposed changes and provide detailed safety reports.';
  
  const prompt = `Organism: ${organism.name}
Current State: ${JSON.stringify({
    generation: organism.generation,
    capabilities: organism.capabilities,
    status: organism.status
  })}
Proposed Changes: ${JSON.stringify(proposedChanges)}
Validation Level: ${validationLevel}

Perform safety validation including:
1. Risk assessment
2. Safety score (0-1)
3. Potential failure modes
4. Mitigation recommendations
5. Approval status

Return as JSON.`;

  const response = await llmClient.generateText(prompt, systemPrompt);
  
  try {
    const report = JSON.parse(response);
    return {
      safety_score: report.safety_score || 0.5,
      risks: report.risks || [],
      failure_modes: report.failure_modes || [],
      mitigation_recommendations: report.mitigation_recommendations || [],
      approval_status: report.approval_status || 'conditional',
      validation_timestamp: new Date()
    };
  } catch {
    return {
      safety_score: 0.3,
      risks: ['Unable to parse safety validation'],
      failure_modes: ['Unknown'],
      mitigation_recommendations: ['Manual review required'],
      approval_status: 'rejected',
      validation_timestamp: new Date()
    };
  }
}
