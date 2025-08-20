import { api } from "encore.dev/api";
import { organismDB } from "./db";
import type { Organism, CreateOrganismRequest } from "./types";

// Creates a new AI organism with specified capabilities.
export const create = api<CreateOrganismRequest, Organism>(
  { expose: true, method: "POST", path: "/organisms" },
  async (req) => {
    const generation = req.parent_id ? await getNextGeneration(req.parent_id) : 1;
    
    const organism = await organismDB.queryRow<Organism>`
      INSERT INTO organisms (name, parent_id, generation, capabilities, memory, performance_metrics, code_analysis, learned_technologies)
      VALUES (
        ${req.name},
        ${req.parent_id || null},
        ${generation},
        ${JSON.stringify(req.initial_capabilities || [])},
        ${JSON.stringify({})},
        ${JSON.stringify({
          tasks_completed: 0,
          success_rate: 0,
          average_completion_time: 0,
          error_recovery_rate: 0,
          learning_efficiency: 0
        })},
        ${JSON.stringify({
          analyzed_repositories: [],
          extracted_patterns: [],
          absorbed_functionalities: [],
          optimization_suggestions: []
        })},
        ${JSON.stringify([])}
      )
      RETURNING *
    `;

    if (!organism) {
      throw new Error("Failed to create organism");
    }

    return organism;
  }
);

async function getNextGeneration(parentId: string): Promise<number> {
  const parent = await organismDB.queryRow<{ generation: number }>`
    SELECT generation FROM organisms WHERE id = ${parentId}
  `;
  return parent ? parent.generation + 1 : 1;
}
