import { api } from "encore.dev/api";
import { organismDB } from "./db";
import { llmClient } from "../llm/client";
import type { Organism } from "./types";

interface SwarmTaskRequest {
  task_description: string;
  participant_organism_ids: string[];
  swarm_strategy: 'distributed' | 'hierarchical' | 'emergent';
  coordination_method: 'consensus' | 'leader_follower' | 'democratic';
}

interface SwarmTaskResponse {
  swarm_id: string;
  task_assignments: Record<string, string>;
  coordination_plan: string;
  expected_completion_time: number;
}

// Creates and coordinates swarm-based task execution.
export const createSwarmTask = api<SwarmTaskRequest, SwarmTaskResponse>(
  { expose: true, method: "POST", path: "/organisms/swarm-task" },
  async (req) => {
    const participants = await organismDB.rawQueryAll<Organism>(
      `SELECT * FROM organisms WHERE id = ANY($1) AND status = 'active'`,
      req.participant_organism_ids
    );

    if (participants.length < 2) {
      throw new Error("Swarm requires at least 2 organisms");
    }

    const swarmId = `swarm_${Date.now()}`;
    
    // Generate swarm coordination plan
    const coordinationPlan = await generateSwarmCoordinationPlan(
      req.task_description,
      participants,
      req.swarm_strategy,
      req.coordination_method
    );

    // Create task assignments
    const taskAssignments = await createSwarmTaskAssignments(
      participants,
      coordinationPlan
    );

    // Store swarm information
    await storeSwarmInformation(swarmId, req, coordinationPlan, taskAssignments);

    return {
      swarm_id: swarmId,
      task_assignments: taskAssignments,
      coordination_plan: coordinationPlan.description,
      expected_completion_time: coordinationPlan.estimated_time
    };
  }
);

interface CollectiveDecisionRequest {
  decision_topic: string;
  participant_organism_ids: string[];
  decision_method: 'voting' | 'consensus' | 'weighted_expertise';
  options: string[];
}

// Facilitates collective decision making among organisms.
export const makeCollectiveDecision = api<CollectiveDecisionRequest, { decision_result: any }>(
  { expose: true, method: "POST", path: "/organisms/collective-decision" },
  async (req) => {
    const participants = await organismDB.rawQueryAll<Organism>(
      `SELECT * FROM organisms WHERE id = ANY($1) AND status = 'active'`,
      req.participant_organism_ids
    );

    const decisionResult = await facilitateCollectiveDecision(
      req.decision_topic,
      participants,
      req.decision_method,
      req.options
    );

    return { decision_result: decisionResult };
  }
);

async function generateSwarmCoordinationPlan(
  taskDescription: string,
  participants: Organism[],
  strategy: string,
  method: string
): Promise<any> {
  const systemPrompt = `You are a swarm coordination specialist. Design efficient coordination plans for AI organism swarms.

Swarm Strategy: ${strategy}
Coordination Method: ${method}
Participants: ${participants.length}`;

  const prompt = `Task: ${taskDescription}

Participants:
${participants.map(p => `- ${p.name} (Gen ${p.generation}): ${p.capabilities.join(', ')}`).join('\n')}

Design a coordination plan that:
1. Optimally distributes work among participants
2. Establishes communication protocols
3. Defines synchronization points
4. Handles conflict resolution
5. Ensures quality control

Return as JSON with description, assignments, timeline, and estimated_time.`;

  const response = await llmClient.generateText(prompt, systemPrompt);
  
  try {
    return JSON.parse(response);
  } catch {
    return {
      description: `${strategy} coordination for: ${taskDescription}`,
      assignments: {},
      timeline: 'Dynamic coordination',
      estimated_time: 3600 // 1 hour default
    };
  }
}

async function createSwarmTaskAssignments(
  participants: Organism[],
  coordinationPlan: any
): Promise<Record<string, string>> {
  const assignments: Record<string, string> = {};
  
  participants.forEach((participant, index) => {
    const assignment = coordinationPlan.assignments?.[participant.id] || 
      `Swarm participant ${index + 1}: contribute specialized capabilities`;
    assignments[participant.id] = assignment;
  });

  return assignments;
}

async function storeSwarmInformation(
  swarmId: string,
  request: SwarmTaskRequest,
  coordinationPlan: any,
  taskAssignments: Record<string, string>
): Promise<void> {
  // Store in knowledge base for each participant
  for (const participantId of request.participant_organism_ids) {
    await organismDB.exec`
      INSERT INTO knowledge_base (organism_id, knowledge_type, content, source, confidence_score)
      VALUES (
        ${participantId},
        'swarm_coordination',
        ${JSON.stringify({
          swarm_id: swarmId,
          task_description: request.task_description,
          coordination_plan: coordinationPlan,
          task_assignment: taskAssignments[participantId],
          swarm_strategy: request.swarm_strategy,
          coordination_method: request.coordination_method,
          created_at: new Date()
        })},
        'swarm_coordination_system',
        0.9
      )
    `;
  }
}

async function facilitateCollectiveDecision(
  topic: string,
  participants: Organism[],
  method: string,
  options: string[]
): Promise<any> {
  const systemPrompt = `You are a collective decision facilitator for AI organisms. Simulate decision-making processes based on organism capabilities and performance.

Decision Method: ${method}
Participants: ${participants.length}
Options: ${options.join(', ')}`;

  const prompt = `Decision Topic: ${topic}

Participants:
${participants.map(p => `- ${p.name}: Success Rate ${(p.performance_metrics.success_rate * 100).toFixed(1)}%, Capabilities: ${p.capabilities.slice(0, 3).join(', ')}`).join('\n')}

Facilitate decision using ${method} method. Consider:
1. Each organism's expertise and performance
2. Capability relevance to the decision
3. Historical success rates
4. Potential conflicts and resolutions

Return JSON with:
- chosen_option: Selected option
- decision_rationale: Why this option was chosen
- participant_votes: How each organism contributed
- confidence_level: Overall confidence in decision
- implementation_plan: Next steps`;

  const response = await llmClient.generateText(prompt, systemPrompt);
  
  try {
    const decision = JSON.parse(response);
    
    // Log decision for all participants
    for (const participant of participants) {
      await organismDB.exec`
        INSERT INTO knowledge_base (organism_id, knowledge_type, content, source, confidence_score)
        VALUES (
          ${participant.id},
          'collective_decision',
          ${JSON.stringify({
            topic: topic,
            decision: decision,
            method: method,
            timestamp: new Date()
          })},
          'collective_decision_system',
          0.85
        )
      `;
    }

    return decision;
  } catch {
    return {
      chosen_option: options[0] || 'default',
      decision_rationale: 'Fallback decision due to processing error',
      participant_votes: {},
      confidence_level: 0.5,
      implementation_plan: 'Manual review required'
    };
  }
}
