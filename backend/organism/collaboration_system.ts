import { api } from "encore.dev/api";
import { organismDB } from "./db";
import { llmClient } from "../llm/client";
import type { Organism, Task } from "./types";

interface CollaborationRequest {
  initiator_organism_id: string;
  participant_organism_ids: string[];
  collaboration_type: 'task_solving' | 'knowledge_sharing' | 'skill_development' | 'research_project';
  objective: string;
  duration_hours?: number;
}

interface CollaborationResponse {
  collaboration_id: string;
  collaboration_plan: string;
  expected_outcomes: string[];
  participant_roles: Record<string, string>;
  timeline: string;
}

// Facilitates collaboration between multiple organisms for complex objectives.
export const initiateCollaboration = api<CollaborationRequest, CollaborationResponse>(
  { expose: true, method: "POST", path: "/organisms/collaborate" },
  async (req) => {
    const initiator = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${req.initiator_organism_id} AND status = 'active'
    `;

    if (!initiator) {
      throw new Error("Initiator organism not found or not active");
    }

    const participants = await organismDB.rawQueryAll<Organism>(
      `SELECT * FROM organisms WHERE id = ANY($1) AND status = 'active'`,
      req.participant_organism_ids
    );

    if (participants.length === 0) {
      throw new Error("No participant organisms found");
    }

    const collaborationId = `collab_${Date.now()}`;
    
    // Design collaboration plan
    const collaborationPlan = await designCollaborationPlan(
      initiator,
      participants,
      req.collaboration_type,
      req.objective,
      req.duration_hours || 24
    );

    // Create collaboration record
    await createCollaborationRecord(collaborationId, initiator, participants, collaborationPlan);

    return {
      collaboration_id: collaborationId,
      collaboration_plan: collaborationPlan.description,
      expected_outcomes: collaborationPlan.expected_outcomes,
      participant_roles: collaborationPlan.participant_roles,
      timeline: collaborationPlan.timeline
    };
  }
);

interface SwarmIntelligenceRequest {
  organism_ids: string[];
  problem_statement: string;
  solution_approach: 'distributed_processing' | 'collective_reasoning' | 'emergent_behavior';
  convergence_criteria: Record<string, any>;
}

// Implements swarm intelligence for collective problem-solving.
export const swarmIntelligence = api<SwarmIntelligenceRequest, { swarm_solution: any }>(
  { expose: true, method: "POST", path: "/organisms/swarm-intelligence" },
  async (req) => {
    const organisms = await organismDB.rawQueryAll<Organism>(
      `SELECT * FROM organisms WHERE id = ANY($1) AND status = 'active'`,
      req.organism_ids
    );

    if (organisms.length < 2) {
      throw new Error("Swarm intelligence requires at least 2 organisms");
    }

    const swarmSolution = await executeSwarmIntelligence(
      organisms,
      req.problem_statement,
      req.solution_approach,
      req.convergence_criteria
    );

    return { swarm_solution: swarmSolution };
  }
);

interface KnowledgeNetworkRequest {
  network_name: string;
  founding_organism_ids: string[];
  knowledge_domains: string[];
  sharing_protocols: Record<string, any>;
}

// Creates knowledge networks for continuous learning and information sharing.
export const createKnowledgeNetwork = api<KnowledgeNetworkRequest, { network_id: string }>(
  { expose: true, method: "POST", path: "/organisms/knowledge-network" },
  async (req) => {
    const foundingOrganisms = await organismDB.rawQueryAll<Organism>(
      `SELECT * FROM organisms WHERE id = ANY($1) AND status = 'active'`,
      req.founding_organism_ids
    );

    if (foundingOrganisms.length === 0) {
      throw new Error("No founding organisms found");
    }

    const networkId = `network_${Date.now()}`;
    
    // Create knowledge network
    await createKnowledgeNetworkRecord(
      networkId,
      req.network_name,
      foundingOrganisms,
      req.knowledge_domains,
      req.sharing_protocols
    );

    return { network_id: networkId };
  }
);

interface CollectiveTaskRequest {
  task_id: string;
  participating_organism_ids: string[];
  coordination_strategy: 'hierarchical' | 'democratic' | 'specialized_roles';
  communication_protocol: Record<string, any>;
}

// Coordinates collective task execution with multiple organisms.
export const executeCollectiveTask = api<CollectiveTaskRequest, { execution_result: any }>(
  { expose: true, method: "POST", path: "/tasks/:task_id/collective-execution" },
  async (req) => {
    const task = await organismDB.queryRow<Task>`
      SELECT * FROM tasks WHERE id = ${req.task_id}
    `;

    if (!task) {
      throw new Error("Task not found");
    }

    const participants = await organismDB.rawQueryAll<Organism>(
      `SELECT * FROM organisms WHERE id = ANY($1) AND status = 'active'`,
      req.participating_organism_ids
    );

    if (participants.length === 0) {
      throw new Error("No participating organisms found");
    }

    const executionResult = await coordinateCollectiveExecution(
      task,
      participants,
      req.coordination_strategy,
      req.communication_protocol
    );

    return { execution_result: executionResult };
  }
);

async function designCollaborationPlan(
  initiator: Organism,
  participants: Organism[],
  collaborationType: string,
  objective: string,
  durationHours: number
): Promise<any> {
  const systemPrompt = `You are a collaboration design specialist for AI organisms. Create comprehensive collaboration plans that leverage each organism's unique capabilities.

Initiator: ${initiator.name} (Gen ${initiator.generation})
Capabilities: ${initiator.capabilities.join(', ')}

Participants:
${participants.map(p => `- ${p.name} (Gen ${p.generation}): ${p.capabilities.join(', ')}`).join('\n')}

Collaboration Type: ${collaborationType}
Duration: ${durationHours} hours`;

  const prompt = `Objective: ${objective}

Design a comprehensive collaboration plan that:
1. Leverages each organism's unique strengths
2. Defines clear roles and responsibilities
3. Establishes communication protocols
4. Sets measurable outcomes
5. Includes timeline and milestones
6. Addresses potential challenges

Return as JSON with:
- description: Overall collaboration plan
- participant_roles: Role for each organism
- expected_outcomes: List of expected results
- timeline: Detailed timeline with milestones
- communication_strategy: How organisms will interact
- success_metrics: How to measure success
- risk_mitigation: Potential issues and solutions`;

  const response = await llmClient.generateText(prompt, systemPrompt);

  try {
    const plan = JSON.parse(response);
    return {
      collaboration_type: collaborationType,
      objective: objective,
      duration_hours: durationHours,
      ...plan
    };
  } catch (error) {
    return {
      collaboration_type: collaborationType,
      objective: objective,
      duration_hours: durationHours,
      description: `Collaboration plan for ${objective}`,
      participant_roles: participants.reduce((roles, p) => {
        roles[p.id] = `Contributor with ${p.capabilities[0] || 'general'} expertise`;
        return roles;
      }, {} as Record<string, string>),
      expected_outcomes: [`Achievement of ${objective}`],
      timeline: `${durationHours} hour collaboration`,
      communication_strategy: 'Regular status updates and knowledge sharing',
      success_metrics: ['Objective completion', 'Knowledge transfer'],
      risk_mitigation: ['Regular check-ins', 'Flexible role adjustment']
    };
  }
}

async function createCollaborationRecord(
  collaborationId: string,
  initiator: Organism,
  participants: Organism[],
  plan: any
): Promise<void> {
  // Store collaboration in knowledge base
  await organismDB.exec`
    INSERT INTO knowledge_base (organism_id, knowledge_type, content, source, confidence_score)
    VALUES (
      ${initiator.id},
      'collaboration_plan',
      ${JSON.stringify({
        collaboration_id: collaborationId,
        plan: plan,
        participants: participants.map(p => ({ id: p.id, name: p.name, generation: p.generation })),
        created_at: new Date()
      })},
      'collaboration_system',
      0.9
    )
  `;

  // Update all participants' memories
  for (const participant of [initiator, ...participants]) {
    const memory = { ...participant.memory };
    memory.collaborations = memory.collaborations || [];
    memory.collaborations.push({
      collaboration_id: collaborationId,
      role: plan.participant_roles[participant.id],
      objective: plan.objective,
      started_at: new Date()
    });

    await organismDB.exec`
      UPDATE organisms SET 
        memory = ${JSON.stringify(memory)},
        updated_at = NOW()
      WHERE id = ${participant.id}
    `;
  }
}

async function executeSwarmIntelligence(
  organisms: Organism[],
  problemStatement: string,
  solutionApproach: string,
  convergenceCriteria: Record<string, any>
): Promise<any> {
  const systemPrompt = `You are a swarm intelligence coordinator for AI organisms. Orchestrate collective problem-solving that leverages emergent behaviors and distributed intelligence.

Swarm Composition:
${organisms.map(o => `- ${o.name} (Gen ${o.generation}): ${o.capabilities.join(', ')}`).join('\n')}

Solution Approach: ${solutionApproach}
Convergence Criteria: ${JSON.stringify(convergenceCriteria)}`;

  const prompt = `Problem Statement: ${problemStatement}

Coordinate swarm intelligence using ${solutionApproach} approach to solve this problem.

Design swarm behavior that:
1. Distributes problem-solving across organisms
2. Enables emergent solution discovery
3. Facilitates information sharing and synthesis
4. Converges on optimal solutions
5. Adapts based on intermediate results

Return JSON with:
- swarm_strategy: Overall approach
- organism_assignments: Specific tasks for each organism
- interaction_patterns: How organisms communicate
- convergence_mechanism: How solutions emerge
- solution_synthesis: Final solution approach
- performance_metrics: Success measurements
- emergent_behaviors: Unexpected beneficial behaviors`;

  const response = await llmClient.generateText(prompt, systemPrompt);

  try {
    const swarmResult = JSON.parse(response);
    
    // Log swarm intelligence session
    for (const organism of organisms) {
      await organismDB.exec`
        INSERT INTO knowledge_base (organism_id, knowledge_type, content, source, confidence_score)
        VALUES (
          ${organism.id},
          'swarm_intelligence',
          ${JSON.stringify({
            problem_statement: problemStatement,
            solution_approach: solutionApproach,
            swarm_result: swarmResult,
            swarm_size: organisms.length,
            timestamp: new Date()
          })},
          'swarm_intelligence_system',
          0.85
        )
      `;
    }

    return swarmResult;
  } catch (error) {
    return {
      swarm_strategy: `Distributed ${solutionApproach} for: ${problemStatement}`,
      organism_assignments: organisms.reduce((assignments, o) => {
        assignments[o.id] = `Contribute ${o.capabilities[0] || 'general'} expertise`;
        return assignments;
      }, {} as Record<string, string>),
      interaction_patterns: 'Continuous information sharing',
      convergence_mechanism: 'Consensus building',
      solution_synthesis: 'Collective solution development',
      performance_metrics: ['Solution quality', 'Convergence time'],
      emergent_behaviors: ['Unexpected optimization patterns']
    };
  }
}

async function createKnowledgeNetworkRecord(
  networkId: string,
  networkName: string,
  foundingOrganisms: Organism[],
  knowledgeDomains: string[],
  sharingProtocols: Record<string, any>
): Promise<void> {
  const networkData = {
    network_id: networkId,
    network_name: networkName,
    founding_organisms: foundingOrganisms.map(o => ({ id: o.id, name: o.name, generation: o.generation })),
    knowledge_domains: knowledgeDomains,
    sharing_protocols: sharingProtocols,
    created_at: new Date(),
    member_count: foundingOrganisms.length
  };

  // Store network information for each founding organism
  for (const organism of foundingOrganisms) {
    await organismDB.exec`
      INSERT INTO knowledge_base (organism_id, knowledge_type, content, source, confidence_score)
      VALUES (
        ${organism.id},
        'knowledge_network',
        ${JSON.stringify(networkData)},
        'knowledge_network_system',
        0.9
      )
    `;

    // Update organism memory
    const memory = { ...organism.memory };
    memory.knowledge_networks = memory.knowledge_networks || [];
    memory.knowledge_networks.push({
      network_id: networkId,
      network_name: networkName,
      role: 'founding_member',
      joined_at: new Date()
    });

    await organismDB.exec`
      UPDATE organisms SET 
        memory = ${JSON.stringify(memory)},
        updated_at = NOW()
      WHERE id = ${organism.id}
    `;
  }
}

async function coordinateCollectiveExecution(
  task: Task,
  participants: Organism[],
  coordinationStrategy: string,
  communicationProtocol: Record<string, any>
): Promise<any> {
  const systemPrompt = `You are a collective task execution coordinator for AI organisms. Design and oversee collaborative task execution that maximizes efficiency and quality.

Task: ${task.title}
Description: ${task.description}
Complexity: ${task.complexity_level}

Participants:
${participants.map(p => `- ${p.name} (Gen ${p.generation}): ${p.capabilities.join(', ')}`).join('\n')}

Coordination Strategy: ${coordinationStrategy}`;

  const prompt = `Communication Protocol: ${JSON.stringify(communicationProtocol)}

Coordinate collective execution of this task using ${coordinationStrategy} strategy.

Design execution plan that:
1. Optimally assigns subtasks to organisms
2. Establishes coordination mechanisms
3. Manages dependencies and synchronization
4. Monitors progress and quality
5. Handles conflicts and bottlenecks
6. Ensures knowledge sharing and learning

Return JSON with:
- execution_plan: Detailed execution strategy
- task_assignments: Specific assignments for each organism
- coordination_mechanisms: How organisms coordinate
- progress_monitoring: How to track progress
- quality_assurance: Quality control measures
- conflict_resolution: How to handle issues
- learning_outcomes: Expected learning benefits`;

  const response = await llmClient.generateText(prompt, systemPrompt);

  try {
    const executionResult = JSON.parse(response);
    
    // Update task with collective execution plan
    const updatedProgress = { ...task.progress };
    updatedProgress.collective_execution = {
      strategy: coordinationStrategy,
      participants: participants.map(p => p.id),
      execution_plan: executionResult,
      started_at: new Date()
    };

    await organismDB.exec`
      UPDATE tasks SET 
        progress = ${JSON.stringify(updatedProgress)},
        status = 'in_progress',
        updated_at = NOW()
      WHERE id = ${task.id}
    `;

    // Log execution for each participant
    for (const participant of participants) {
      await organismDB.exec`
        INSERT INTO knowledge_base (organism_id, knowledge_type, content, source, confidence_score)
        VALUES (
          ${participant.id},
          'collective_task_execution',
          ${JSON.stringify({
            task_id: task.id,
            task_title: task.title,
            execution_result: executionResult,
            role: executionResult.task_assignments[participant.id],
            timestamp: new Date()
          })},
          'collective_execution_system',
          0.9
        )
      `;
    }

    return executionResult;
  } catch (error) {
    return {
      execution_plan: `Collective execution of ${task.title} using ${coordinationStrategy}`,
      task_assignments: participants.reduce((assignments, p) => {
        assignments[p.id] = `Contribute to task using ${p.capabilities[0] || 'general'} skills`;
        return assignments;
      }, {} as Record<string, string>),
      coordination_mechanisms: 'Regular synchronization and communication',
      progress_monitoring: 'Continuous progress tracking',
      quality_assurance: 'Peer review and validation',
      conflict_resolution: 'Collaborative problem-solving',
      learning_outcomes: ['Enhanced collaboration skills', 'Domain knowledge']
    };
  }
}
