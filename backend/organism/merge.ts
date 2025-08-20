import { api } from "encore.dev/api";
import { organismDB } from "./db";
import type { Organism, MergeRequest } from "./types";

// Merges multiple organisms to handle complex tasks.
export const merge = api<MergeRequest, Organism>(
  { expose: true, method: "POST", path: "/organisms/merge" },
  async (req) => {
    const organisms = await organismDB.rawQueryAll<Organism>(
      `SELECT * FROM organisms WHERE id = ANY($1) AND status = 'active'`,
      req.organism_ids
    );

    if (organisms.length !== req.organism_ids.length) {
      throw new Error("Some organisms not found or not active");
    }

    // Update all organisms to merging status
    await organismDB.rawExec(
      `UPDATE organisms SET status = 'merging', updated_at = NOW() WHERE id = ANY($1)`,
      req.organism_ids
    );

    // Create merged organism
    const mergedCapabilities = mergeCapabilities(organisms, req.merge_strategy);
    const mergedMemory = mergeMemory(organisms);
    const mergedMetrics = mergePerformanceMetrics(organisms);
    const mergedAnalysis = mergeCodeAnalysis(organisms);
    const mergedTechnologies = mergeTechnologies(organisms);

    const highestGeneration = Math.max(...organisms.map(o => o.generation));

    const mergedOrganism = await organismDB.queryRow<Organism>`
      INSERT INTO organisms (
        name, generation, capabilities, memory, 
        performance_metrics, code_analysis, learned_technologies, status
      )
      VALUES (
        ${'merged_' + Date.now()},
        ${highestGeneration + 1},
        ${JSON.stringify(mergedCapabilities)},
        ${JSON.stringify(mergedMemory)},
        ${JSON.stringify(mergedMetrics)},
        ${JSON.stringify(mergedAnalysis)},
        ${JSON.stringify(mergedTechnologies)},
        'active'
      )
      RETURNING *
    `;

    if (!mergedOrganism) {
      throw new Error("Failed to create merged organism");
    }

    // Update task assignment
    await organismDB.rawExec(
      `UPDATE tasks SET assigned_organisms = $1, updated_at = NOW() WHERE id = $2`,
      JSON.stringify([mergedOrganism.id]),
      req.task_id
    );

    return mergedOrganism;
  }
);

function mergeCapabilities(organisms: Organism[], strategy: string): string[] {
  const allCapabilities = new Set<string>();
  
  organisms.forEach(organism => {
    organism.capabilities.forEach(cap => allCapabilities.add(cap));
  });

  const merged = Array.from(allCapabilities);
  
  // Add merge-specific capabilities
  merged.push('collaborative_processing');
  merged.push('distributed_computation');
  
  return merged;
}

function mergeMemory(organisms: Organism[]): Record<string, any> {
  const mergedMemory: Record<string, any> = {
    merge_components: organisms.map(o => ({
      id: o.id,
      name: o.name,
      generation: o.generation,
      capabilities: o.capabilities
    })),
    combined_experiences: {},
    shared_knowledge: {}
  };

  organisms.forEach(organism => {
    Object.keys(organism.memory).forEach(key => {
      if (!mergedMemory.combined_experiences[key]) {
        mergedMemory.combined_experiences[key] = [];
      }
      mergedMemory.combined_experiences[key].push(organism.memory[key]);
    });
  });

  return mergedMemory;
}

function mergePerformanceMetrics(organisms: Organism[]): any {
  const totalTasks = organisms.reduce((sum, o) => sum + o.performance_metrics.tasks_completed, 0);
  const avgSuccessRate = organisms.reduce((sum, o) => sum + o.performance_metrics.success_rate, 0) / organisms.length;
  const avgCompletionTime = organisms.reduce((sum, o) => sum + o.performance_metrics.average_completion_time, 0) / organisms.length;
  const avgErrorRecovery = organisms.reduce((sum, o) => sum + o.performance_metrics.error_recovery_rate, 0) / organisms.length;
  const avgLearningEfficiency = organisms.reduce((sum, o) => sum + o.performance_metrics.learning_efficiency, 0) / organisms.length;

  return {
    tasks_completed: totalTasks,
    success_rate: avgSuccessRate,
    average_completion_time: avgCompletionTime,
    error_recovery_rate: avgErrorRecovery,
    learning_efficiency: avgLearningEfficiency,
    merge_efficiency: 1.0
  };
}

function mergeCodeAnalysis(organisms: Organism[]): any {
  const allRepos = new Set<string>();
  const allPatterns = new Set<string>();
  const allFunctionalities = new Set<string>();
  const allSuggestions = new Set<string>();

  organisms.forEach(organism => {
    organism.code_analysis.analyzed_repositories?.forEach(repo => allRepos.add(repo));
    organism.code_analysis.extracted_patterns?.forEach(pattern => allPatterns.add(pattern));
    organism.code_analysis.absorbed_functionalities?.forEach(func => allFunctionalities.add(func));
    organism.code_analysis.optimization_suggestions?.forEach(suggestion => allSuggestions.add(suggestion));
  });

  return {
    analyzed_repositories: Array.from(allRepos),
    extracted_patterns: Array.from(allPatterns),
    absorbed_functionalities: Array.from(allFunctionalities),
    optimization_suggestions: Array.from(allSuggestions)
  };
}

function mergeTechnologies(organisms: Organism[]): string[] {
  const allTechnologies = new Set<string>();
  
  organisms.forEach(organism => {
    organism.learned_technologies.forEach(tech => allTechnologies.add(tech));
  });

  return Array.from(allTechnologies);
}
