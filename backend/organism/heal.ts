import { api } from "encore.dev/api";
import { organismDB } from "./db";
import type { Organism } from "./types";

interface HealRequest {
  organism_id: string;
  error_context: Record<string, any>;
  recovery_strategy?: string;
}

// Heals an organism from errors and restores functionality.
export const heal = api<HealRequest, Organism>(
  { expose: true, method: "POST", path: "/organisms/:organism_id/heal" },
  async (req) => {
    const organism = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${req.organism_id}
    `;

    if (!organism) {
      throw new Error("Organism not found");
    }

    // Update status to healing
    await organismDB.exec`
      UPDATE organisms SET status = 'healing', updated_at = NOW()
      WHERE id = ${req.organism_id}
    `;

    // Analyze error and apply healing
    const healingResult = await applyHealing(organism, req.error_context, req.recovery_strategy);
    
    // Update organism with healing results
    const healedOrganism = await organismDB.queryRow<Organism>`
      UPDATE organisms SET 
        status = 'active',
        memory = ${JSON.stringify(healingResult.updatedMemory)},
        performance_metrics = ${JSON.stringify(healingResult.updatedMetrics)},
        capabilities = ${JSON.stringify(healingResult.updatedCapabilities)},
        updated_at = NOW(),
        last_active = NOW()
      WHERE id = ${req.organism_id}
      RETURNING *
    `;

    if (!healedOrganism) {
      throw new Error("Failed to heal organism");
    }

    // Log healing event
    await logHealingEvent(req.organism_id, req.error_context, healingResult);

    return healedOrganism;
  }
);

async function applyHealing(
  organism: Organism, 
  errorContext: Record<string, any>, 
  strategy?: string
): Promise<{
  updatedMemory: Record<string, any>;
  updatedMetrics: any;
  updatedCapabilities: string[];
}> {
  const updatedMemory = { ...organism.memory };
  const updatedMetrics = { ...organism.performance_metrics };
  const updatedCapabilities = [...organism.capabilities];

  // Add error recovery to memory
  updatedMemory.error_history = updatedMemory.error_history || [];
  updatedMemory.error_history.push({
    timestamp: new Date(),
    error_context: errorContext,
    recovery_strategy: strategy || 'auto_heal',
    resolution: 'healed'
  });

  // Update error recovery rate
  const totalErrors = updatedMemory.error_history.length;
  const recoveredErrors = updatedMemory.error_history.filter((e: any) => e.resolution === 'healed').length;
  updatedMetrics.error_recovery_rate = recoveredErrors / totalErrors;

  // Add self-healing capability if not present
  if (!updatedCapabilities.includes('self_healing')) {
    updatedCapabilities.push('self_healing');
  }

  // Add error-specific recovery capabilities
  if (errorContext.error_type === 'memory_overflow') {
    updatedCapabilities.push('memory_optimization');
  }
  if (errorContext.error_type === 'network_failure') {
    updatedCapabilities.push('network_resilience');
  }
  if (errorContext.error_type === 'computation_error') {
    updatedCapabilities.push('computation_validation');
  }

  return {
    updatedMemory,
    updatedMetrics,
    updatedCapabilities
  };
}

async function logHealingEvent(
  organismId: string, 
  errorContext: Record<string, any>, 
  healingResult: any
): Promise<void> {
  await organismDB.exec`
    INSERT INTO knowledge_base (organism_id, knowledge_type, content, source, confidence_score)
    VALUES (
      ${organismId},
      'error_solution',
      ${JSON.stringify({
        error_context: errorContext,
        healing_result: healingResult,
        timestamp: new Date()
      })},
      'self_healing_system',
      0.9
    )
  `;
}
