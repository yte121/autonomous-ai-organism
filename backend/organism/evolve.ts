import { api } from "encore.dev/api";
import { organismDB } from "./db";
import { llmClient } from "../llm/client";
import type { Organism, EvolutionRequest } from "./types";
export type { EvolutionRequest };

// Evolves an organism based on performance metrics and learning.
export const evolve = api<EvolutionRequest, Organism>(
  { expose: true, method: "POST", path: "/organisms/:organism_id/evolve" },
  async (req) => {
    return await _evolveLogic(req);
  }
);

export async function _evolveLogic(req: EvolutionRequest): Promise<Organism> {
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
  const { capabilities: evolvedCapabilities, reasoning } = await generateEvolvedCapabilities(organism, req.target_improvements);
  const evolvedMemory = await enhanceMemory(organism.memory, req.evolution_triggers, req.target_improvements, reasoning);

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

async function generateEvolvedCapabilities(organism: Organism, improvements: string[]): Promise<{ capabilities: string[], reasoning: string }> {
  const systemPrompt = `You are an AI Evolution Strategist. Your task is to analyze an AI organism's profile and propose a set of new, specific, and creative capabilities that will enhance its performance and address its weaknesses.

The new capabilities should be short, descriptive strings in 'snake_case' format (e.g., 'advanced_data_caching', 'proactive_error_simulation').

You MUST return your response as a single JSON object with two keys:
1. "new_capabilities": An array of strings representing the new capabilities.
2. "reasoning": A string explaining why you chose these specific capabilities based on the organism's profile.`;

  const prompt = `Please analyze the following AI organism and propose its next evolution.

**Organism Profile:**
- **Name:** ${organism.name}
- **Generation:** ${organism.generation}
- **Current Capabilities:** ${JSON.stringify(organism.capabilities)}
- **Performance Metrics:** ${JSON.stringify(organism.performance_metrics)}
- **Learned Technologies:** ${JSON.stringify(organism.learned_technologies)}
- **Code Analysis:** ${JSON.stringify(organism.code_analysis)}
- **Memory Summary:** Evolution History Count: ${organism.memory.evolution_history?.length || 0}, Error History Count: ${organism.memory.error_history?.length || 0}

**Requested Improvements:**
- ${improvements.join('\n- ') || 'None specified'}

Based on this complete profile, generate a list of new capabilities and the reasoning for your choices in the required JSON format.`;

  try {
    const response = await llmClient.generateText(prompt, systemPrompt);
    const evolutionData = JSON.parse(response);

    if (!Array.isArray(evolutionData.new_capabilities) || typeof evolutionData.reasoning !== 'string') {
      throw new Error("LLM response for evolution is malformed.");
    }

    const allCapabilities = new Set([...organism.capabilities, ...evolutionData.new_capabilities]);

    return {
      capabilities: Array.from(allCapabilities),
      reasoning: evolutionData.reasoning
    };
  } catch (error) {
    console.error("Failed to generate evolved capabilities from LLM:", error);
    // Fallback to the old, simple logic if the LLM fails
    const fallbackCapabilities = new Set(organism.capabilities);
    improvements.forEach(imp => fallbackCapabilities.add(imp));
    return {
      capabilities: Array.from(fallbackCapabilities),
      reasoning: "Evolutionary computation failed, fell back to basic improvement addition."
    };
  }
}

async function enhanceMemory(
  currentMemory: Record<string, any>,
  triggers: string[],
  improvements: string[],
  reasoning: string
): Promise<Record<string, any>> {
  const enhancedMemory = { ...currentMemory };
  
  enhancedMemory.evolution_history = enhancedMemory.evolution_history || [];
  enhancedMemory.evolution_history.push({
    timestamp: new Date(),
    triggers,
    improvements_made: improvements,
    reasoning: reasoning,
  });

  enhancedMemory.optimization_patterns = enhancedMemory.optimization_patterns || [];
  
  return enhancedMemory;
}
