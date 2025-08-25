import { api } from "encore.dev/api";
import { organismDB } from "./db";
import { llmClient } from "../llm/client";
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
    const healingPlan = await applyHealing(organism, req.error_context, req.recovery_strategy);
    
    // --- Apply the healing plan ---

    // 1. Update capabilities
    const updatedCapabilities = new Set([...organism.capabilities, ...healingPlan.new_capabilities, 'self_healing']);

    // 2. Update memory
    const updatedMemory = { ...organism.memory };
    updatedMemory.error_history = updatedMemory.error_history || [];
    updatedMemory.error_history.push({
      timestamp: new Date(),
      error_context: req.error_context,
      recovery_strategy: req.recovery_strategy || 'auto_heal',
      resolution: {
        diagnosis: healingPlan.diagnosis,
        solution: healingPlan.suggested_solution,
        added_capabilities: healingPlan.new_capabilities
      }
    });

    // 3. Update performance metrics
    const updatedMetrics = { ...organism.performance_metrics };
    const totalErrors = updatedMemory.error_history.length;
    const recoveredErrors = updatedMemory.error_history.filter((e: any) => e.resolution).length;
    updatedMetrics.error_recovery_rate = totalErrors > 0 ? recoveredErrors / totalErrors : 1;


    // 4. Update organism in the database
    const healedOrganism = await organismDB.queryRow<Organism>`
      UPDATE organisms SET 
        status = 'active',
        memory = ${JSON.stringify(updatedMemory)},
        performance_metrics = ${JSON.stringify(updatedMetrics)},
        capabilities = ${JSON.stringify(Array.from(updatedCapabilities))},
        updated_at = NOW(),
        last_active = NOW()
      WHERE id = ${req.organism_id}
      RETURNING *
    `;

    if (!healedOrganism) {
      throw new Error("Failed to heal organism");
    }

    // 5. Log healing event for broader knowledge base
    await logHealingEvent(req.organism_id, req.error_context, healingPlan);

    return healedOrganism;
  }
);

async function applyHealing(
  organism: Organism, 
  errorContext: Record<string, any>, 
  strategy?: string
): Promise<{
  diagnosis: string;
  suggested_solution: string;
  new_capabilities: string[];
}> {
  const systemPrompt = `You are an AI Diagnostic and Repair System. Your purpose is to analyze an error reported by an AI organism and propose a robust solution.

You must analyze the error context, diagnose the root cause, and suggest a resolution. The resolution should include both a general strategy and a list of specific new capabilities the organism should develop to prevent this error in the future.

The new capabilities should be short, descriptive strings in 'snake_case' format (e.g., 'http_request_retries', 'deadlock_detection_protocol').

You MUST return your response as a single JSON object with the following structure:
{
  "diagnosis": string, // A detailed analysis of the root cause of the error.
  "suggested_solution": string, // A clear, natural language description of the proposed solution.
  "new_capabilities": string[] // An array of strings for new capabilities.
}`;

  const prompt = `An AI organism has encountered an error. Please diagnose the issue and propose a solution.

**Organism Profile:**
- **Name:** ${organism.name}
- **Generation:** ${organism.generation}
- **Current Capabilities:** ${JSON.stringify(organism.capabilities)}
- **Performance Metrics:** ${JSON.stringify(organism.performance_metrics)}

**Error Context:**
${JSON.stringify(errorContext, null, 2)}

**Requested Recovery Strategy:** ${strategy || 'auto_heal'}

Provide your diagnosis and proposed solution in the required JSON format.`;

  try {
    const response = await llmClient.generateText(prompt, systemPrompt);
    const healingPlan = JSON.parse(response);

    if (
      !healingPlan.diagnosis ||
      !healingPlan.suggested_solution ||
      !Array.isArray(healingPlan.new_capabilities)
    ) {
      throw new Error("LLM response for healing is malformed.");
    }

    return healingPlan;
  } catch (error) {
    console.error("Failed to generate healing plan from LLM:", error);
    // Fallback to a simple, generic healing response
    return {
      diagnosis: "LLM-based diagnosis failed. The root cause could not be determined.",
      suggested_solution: "Apply generic error handling improvements and monitor performance.",
      new_capabilities: ["enhanced_error_logging", `generic_recovery_from_${errorContext.error_type || 'unknown_error'}`]
    };
  }
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
