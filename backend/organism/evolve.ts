import { api } from "encore.dev/api";
import { organismDB } from "./db";
import type { Organism, EvolutionRequest } from "./types";

// Evolves an organism based on performance metrics and learning.
export const evolve = api<EvolutionRequest, Organism>(
  { expose: true, method: "POST", path: "/organisms/:organism_id/evolve" },
  async (req) => {
    const organism = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${req.organism_id} AND status = 'active'
    `;

    if (!organism) {
      throw new Error("Organism not found or not active");
    }

    // Update organism status to evolving
    await organismDB.exec`
      UPDATE organisms SET status = 'evolving', updated_at = NOW()
      WHERE id = ${req.organism_id}
    `;

    // Create evolved copy
    const evolvedCapabilities = await generateEvolvedCapabilities(organism, req.target_improvements);
    const evolvedMemory = await enhanceMemory(organism.memory, req.evolution_triggers);

    const evolvedOrganism = await organismDB.queryRow<Organism>`
      INSERT INTO organisms (
        name, parent_id, generation, capabilities, memory, 
        performance_metrics, code_analysis, learned_technologies, status
      )
      VALUES (
        ${organism.name + '_evolved_' + (organism.generation + 1)},
        ${organism.id},
        ${organism.generation + 1},
        ${JSON.stringify(evolvedCapabilities)},
        ${JSON.stringify(evolvedMemory)},
        ${JSON.stringify(organism.performance_metrics)},
        ${JSON.stringify(organism.code_analysis)},
        ${JSON.stringify(organism.learned_technologies)},
        'active'
      )
      RETURNING *
    `;

    if (!evolvedOrganism) {
      throw new Error("Failed to create evolved organism");
    }

    // Mark original as deprecated if evolution was successful
    await organismDB.exec`
      UPDATE organisms SET status = 'deprecated', updated_at = NOW()
      WHERE id = ${req.organism_id}
    `;

    return evolvedOrganism;
  }
);

async function generateEvolvedCapabilities(organism: Organism, improvements: string[]): Promise<string[]> {
  const currentCapabilities = organism.capabilities;
  const newCapabilities = [...currentCapabilities];

  // Add new capabilities based on improvements
  for (const improvement of improvements) {
    if (!newCapabilities.includes(improvement)) {
      newCapabilities.push(improvement);
    }
  }

  // Add capabilities based on performance metrics
  const metrics = organism.performance_metrics;
  if (metrics.success_rate > 0.8) {
    newCapabilities.push('high_performance_execution');
  }
  if (metrics.error_recovery_rate > 0.9) {
    newCapabilities.push('advanced_error_recovery');
  }
  if (metrics.learning_efficiency > 0.7) {
    newCapabilities.push('rapid_learning');
  }

  return newCapabilities;
}

async function enhanceMemory(currentMemory: Record<string, any>, triggers: string[]): Promise<Record<string, any>> {
  const enhancedMemory = { ...currentMemory };
  
  enhancedMemory.evolution_history = enhancedMemory.evolution_history || [];
  enhancedMemory.evolution_history.push({
    timestamp: new Date(),
    triggers,
    improvements_made: triggers
  });

  enhancedMemory.optimization_patterns = enhancedMemory.optimization_patterns || [];
  
  return enhancedMemory;
}
