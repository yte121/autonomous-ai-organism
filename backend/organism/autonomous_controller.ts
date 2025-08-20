import { api } from "encore.dev/api";
import { organismDB } from "./db";
import { llmClient } from "../llm/client";
import type { Organism, Task, CreateTaskRequest } from "./types";

interface AutonomousExecutionRequest {
  organism_id: string;
  user_command: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

interface AutonomousExecutionResponse {
  execution_id: string;
  status: 'started' | 'in_progress' | 'completed' | 'failed';
  created_tasks: Task[];
  spawned_organisms: Organism[];
  execution_plan: string;
}

// Executes autonomous operations based on user commands.
export const executeAutonomous = api<AutonomousExecutionRequest, AutonomousExecutionResponse>(
  { expose: true, method: "POST", path: "/organisms/:organism_id/autonomous" },
  async (req) => {
    const organism = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${req.organism_id} AND status = 'active'
    `;

    if (!organism) {
      throw new Error("Organism not found or not active");
    }

    // Generate execution plan using LLM
    const executionPlan = await generateExecutionPlan(req.user_command, organism, req.context);
    
    // Parse and execute the plan
    const executionResult = await executeAutonomousPlan(organism, executionPlan, req.priority);

    return {
      execution_id: `exec_${Date.now()}`,
      status: 'started',
      created_tasks: executionResult.tasks,
      spawned_organisms: executionResult.organisms,
      execution_plan: executionPlan
    };
  }
);

interface SelfReplicateRequest {
  organism_id: string;
  replication_purpose: string;
  target_improvements?: string[];
  resource_allocation?: Record<string, any>;
}

// Enables organism to self-replicate with improvements.
export const selfReplicate = api<SelfReplicateRequest, { replicated_organisms: Organism[] }>(
  { expose: true, method: "POST", path: "/organisms/:organism_id/replicate" },
  async (req) => {
    const parentOrganism = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${req.organism_id} AND status = 'active'
    `;

    if (!parentOrganism) {
      throw new Error("Parent organism not found or not active");
    }

    // Determine replication strategy based on purpose
    const replicationStrategy = await determineReplicationStrategy(
      parentOrganism, 
      req.replication_purpose, 
      req.target_improvements
    );

    const replicatedOrganisms: Organism[] = [];

    for (let i = 0; i < replicationStrategy.count; i++) {
      const replicatedOrganism = await createReplicatedOrganism(
        parentOrganism, 
        replicationStrategy, 
        i
      );
      replicatedOrganisms.push(replicatedOrganism);
    }

    // Update parent organism's memory with replication info
    await updateParentWithReplicationInfo(req.organism_id, replicatedOrganisms);

    return { replicated_organisms: replicatedOrganisms };
  }
);

interface ComputerOperationRequest {
  organism_id: string;
  operation_type: 'file_system' | 'network' | 'process' | 'system_info' | 'automation';
  operation_details: Record<string, any>;
  safety_constraints?: string[];
}

// Enables organism to operate computer systems autonomously.
export const operateComputer = api<ComputerOperationRequest, { operation_result: any }>(
  { expose: true, method: "POST", path: "/organisms/:organism_id/computer-operation" },
  async (req) => {
    const organism = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${req.organism_id} AND status = 'active'
    `;

    if (!organism) {
      throw new Error("Organism not found or not active");
    }

    // Validate safety constraints
    const safetyCheck = await validateOperationSafety(req.operation_type, req.operation_details);
    if (!safetyCheck.safe) {
      throw new Error(`Operation blocked for safety: ${safetyCheck.reason}`);
    }

    // Execute computer operation
    const operationResult = await executeComputerOperation(
      organism,
      req.operation_type,
      req.operation_details
    );

    // Log operation for learning
    await logComputerOperation(req.organism_id, req.operation_type, operationResult);

    return { operation_result: operationResult };
  }
);

interface ContextAwareTaskRequest {
  organism_id: string;
  task_description: string;
  context_sources: string[];
  dynamic_loading: boolean;
}

// Creates context-aware tasks with on-demand information loading.
export const createContextAwareTask = api<ContextAwareTaskRequest, Task>(
  { expose: true, method: "POST", path: "/organisms/:organism_id/context-task" },
  async (req) => {
    const organism = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${req.organism_id} AND status = 'active'
    `;

    if (!organism) {
      throw new Error("Organism not found or not active");
    }

    // Load context information dynamically
    const contextData = await loadContextInformation(req.context_sources, req.dynamic_loading);
    
    // Generate task requirements based on context
    const taskRequirements = await generateContextualRequirements(
      req.task_description,
      contextData,
      organism
    );

    // Create the task
    const task = await organismDB.queryRow<Task>`
      INSERT INTO tasks (title, description, complexity_level, requirements, progress, results)
      VALUES (
        ${`Context-Aware: ${req.task_description}`},
        ${req.task_description},
        ${taskRequirements.complexity_level},
        ${JSON.stringify(taskRequirements)},
        ${JSON.stringify({
          completion_percentage: 0,
          current_phase: 'context_analysis',
          milestones_completed: [],
          issues_encountered: [],
          context_data: contextData
        })},
        ${JSON.stringify({
          output: null,
          performance_data: {},
          lessons_learned: [],
          new_capabilities_discovered: [],
          context_insights: []
        })}
      )
      RETURNING *
    `;

    if (!task) {
      throw new Error("Failed to create context-aware task");
    }

    return task;
  }
);

async function generateExecutionPlan(
  userCommand: string, 
  organism: Organism, 
  context?: Record<string, any>
): Promise<string> {
  const systemPrompt = `You are an autonomous AI organism execution planner. Generate a detailed execution plan for the given user command. Consider the organism's capabilities, current context, and safety constraints.

Organism Capabilities: ${organism.capabilities.join(', ')}
Organism Generation: ${organism.generation}
Performance Metrics: ${JSON.stringify(organism.performance_metrics)}

Return a structured execution plan that includes:
1. Task breakdown
2. Resource requirements
3. Risk assessment
4. Success criteria
5. Fallback strategies`;

  const prompt = `User Command: "${userCommand}"

Context: ${JSON.stringify(context || {})}

Generate a comprehensive execution plan that this organism can follow autonomously. The plan should be safe, efficient, and aligned with the user's intent.`;

  return await llmClient.generateText(prompt, systemPrompt);
}

async function executeAutonomousPlan(
  organism: Organism, 
  executionPlan: string, 
  priority: string
): Promise<{ tasks: Task[]; organisms: Organism[] }> {
  // Parse execution plan and create tasks
  const planAnalysis = await llmClient.analyzeCode(executionPlan, 'execution_plan_analysis');
  
  const tasks: Task[] = [];
  const organisms: Organism[] = [];

  // Create tasks based on plan analysis
  if (planAnalysis.tasks) {
    for (const taskDesc of planAnalysis.tasks) {
      const task = await organismDB.queryRow<Task>`
        INSERT INTO tasks (title, description, complexity_level, requirements, progress, results)
        VALUES (
          ${taskDesc.title || 'Autonomous Task'},
          ${taskDesc.description || taskDesc},
          ${taskDesc.complexity || 5},
          ${JSON.stringify({
            min_generation: organism.generation,
            required_capabilities: organism.capabilities,
            estimated_complexity: taskDesc.complexity || 5,
            priority: priority
          })},
          ${JSON.stringify({
            completion_percentage: 0,
            current_phase: 'autonomous_execution',
            milestones_completed: [],
            issues_encountered: []
          })},
          ${JSON.stringify({
            output: null,
            performance_data: {},
            lessons_learned: [],
            new_capabilities_discovered: []
          })}
        )
        RETURNING *
      `;
      
      if (task) {
        tasks.push(task);
      }
    }
  }

  return { tasks, organisms };
}

async function determineReplicationStrategy(
  parentOrganism: Organism,
  purpose: string,
  improvements?: string[]
): Promise<{
  count: number;
  strategy: string;
  enhancements: string[];
}> {
  const systemPrompt = 'You are a replication strategy optimizer. Determine the optimal replication strategy based on the purpose and parent organism capabilities.';
  
  const prompt = `
Parent Organism:
- Generation: ${parentOrganism.generation}
- Capabilities: ${parentOrganism.capabilities.join(', ')}
- Performance: ${JSON.stringify(parentOrganism.performance_metrics)}

Replication Purpose: ${purpose}
Target Improvements: ${improvements?.join(', ') || 'None specified'}

Determine:
1. Number of replicas needed (1-5)
2. Replication strategy (parallel, sequential, specialized)
3. Specific enhancements for each replica

Return as JSON with count, strategy, and enhancements array.`;

  const response = await llmClient.generateText(prompt, systemPrompt);
  
  try {
    const strategy = JSON.parse(response);
    return {
      count: Math.min(strategy.count || 1, 5),
      strategy: strategy.strategy || 'parallel',
      enhancements: strategy.enhancements || []
    };
  } catch {
    return {
      count: 1,
      strategy: 'parallel',
      enhancements: improvements || []
    };
  }
}

async function createReplicatedOrganism(
  parentOrganism: Organism,
  strategy: any,
  index: number
): Promise<Organism> {
  const enhancedCapabilities = [
    ...parentOrganism.capabilities,
    ...strategy.enhancements,
    'self_replication',
    `replica_${index}_specialization`
  ];

  const enhancedMemory = {
    ...parentOrganism.memory,
    replication_info: {
      parent_id: parentOrganism.id,
      replication_purpose: strategy.purpose,
      replica_index: index,
      created_at: new Date()
    }
  };

  const replicatedOrganism = await organismDB.queryRow<Organism>`
    INSERT INTO organisms (
      name, parent_id, generation, capabilities, memory, 
      performance_metrics, code_analysis, learned_technologies, status
    )
    VALUES (
      ${`${parentOrganism.name}_replica_${index}`},
      ${parentOrganism.id},
      ${parentOrganism.generation},
      ${JSON.stringify(enhancedCapabilities)},
      ${JSON.stringify(enhancedMemory)},
      ${JSON.stringify(parentOrganism.performance_metrics)},
      ${JSON.stringify(parentOrganism.code_analysis)},
      ${JSON.stringify(parentOrganism.learned_technologies)},
      'active'
    )
    RETURNING *
  `;

  if (!replicatedOrganism) {
    throw new Error("Failed to create replicated organism");
  }

  return replicatedOrganism;
}

async function updateParentWithReplicationInfo(
  parentId: string,
  replicas: Organism[]
): Promise<void> {
  const parent = await organismDB.queryRow<{ memory: any }>`
    SELECT memory FROM organisms WHERE id = ${parentId}
  `;

  if (parent) {
    const updatedMemory = { ...parent.memory };
    updatedMemory.replications = updatedMemory.replications || [];
    updatedMemory.replications.push({
      timestamp: new Date(),
      replica_ids: replicas.map(r => r.id),
      replica_count: replicas.length
    });

    await organismDB.exec`
      UPDATE organisms SET 
        memory = ${JSON.stringify(updatedMemory)},
        updated_at = NOW()
      WHERE id = ${parentId}
    `;
  }
}

async function validateOperationSafety(
  operationType: string,
  operationDetails: Record<string, any>
): Promise<{ safe: boolean; reason?: string }> {
  // Implement safety validation logic
  const dangerousOperations = [
    'system_shutdown',
    'delete_system_files',
    'modify_security_settings',
    'network_attack'
  ];

  if (dangerousOperations.some(op => 
    operationDetails.operation?.toLowerCase().includes(op) ||
    operationDetails.command?.toLowerCase().includes(op)
  )) {
    return { safe: false, reason: 'Operation contains dangerous commands' };
  }

  return { safe: true };
}

async function executeComputerOperation(
  organism: Organism,
  operationType: string,
  operationDetails: Record<string, any>
): Promise<any> {
  // Simulate computer operations (in a real implementation, this would interface with actual system APIs)
  switch (operationType) {
    case 'file_system':
      return {
        operation: 'file_system',
        action: operationDetails.action,
        path: operationDetails.path,
        result: 'simulated_file_operation_success',
        timestamp: new Date()
      };
    
    case 'network':
      return {
        operation: 'network',
        action: operationDetails.action,
        target: operationDetails.target,
        result: 'simulated_network_operation_success',
        timestamp: new Date()
      };
    
    case 'process':
      return {
        operation: 'process',
        action: operationDetails.action,
        process_name: operationDetails.process_name,
        result: 'simulated_process_operation_success',
        timestamp: new Date()
      };
    
    case 'system_info':
      return {
        operation: 'system_info',
        cpu_usage: Math.random() * 100,
        memory_usage: Math.random() * 100,
        disk_usage: Math.random() * 100,
        timestamp: new Date()
      };
    
    case 'automation':
      return {
        operation: 'automation',
        script: operationDetails.script,
        result: 'simulated_automation_success',
        timestamp: new Date()
      };
    
    default:
      throw new Error(`Unsupported operation type: ${operationType}`);
  }
}

async function logComputerOperation(
  organismId: string,
  operationType: string,
  result: any
): Promise<void> {
  await organismDB.exec`
    INSERT INTO knowledge_base (organism_id, knowledge_type, content, source, confidence_score)
    VALUES (
      ${organismId},
      'computer_operation',
      ${JSON.stringify({
        operation_type: operationType,
        result: result,
        timestamp: new Date()
      })},
      'computer_operation_system',
      0.9
    )
  `;
}

async function loadContextInformation(
  sources: string[],
  dynamicLoading: boolean
): Promise<Record<string, any>> {
  const contextData: Record<string, any> = {};

  for (const source of sources) {
    if (dynamicLoading) {
      // Simulate dynamic context loading
      contextData[source] = await loadDynamicContext(source);
    } else {
      // Load static context
      contextData[source] = await loadStaticContext(source);
    }
  }

  return contextData;
}

async function loadDynamicContext(source: string): Promise<any> {
  // Simulate dynamic context loading (e.g., from APIs, databases, files)
  return {
    source: source,
    data: `Dynamic context data from ${source}`,
    timestamp: new Date(),
    type: 'dynamic'
  };
}

async function loadStaticContext(source: string): Promise<any> {
  // Simulate static context loading
  return {
    source: source,
    data: `Static context data from ${source}`,
    timestamp: new Date(),
    type: 'static'
  };
}

async function generateContextualRequirements(
  taskDescription: string,
  contextData: Record<string, any>,
  organism: Organism
): Promise<any> {
  const systemPrompt = 'You are a contextual task requirements generator. Create detailed task requirements based on the task description, available context, and organism capabilities.';
  
  const prompt = `
Task Description: ${taskDescription}
Context Data: ${JSON.stringify(contextData)}
Organism Capabilities: ${organism.capabilities.join(', ')}

Generate task requirements including:
1. Complexity level (1-10)
2. Required capabilities
3. Estimated completion time
4. Resource requirements
5. Success criteria

Return as JSON.`;

  const response = await llmClient.generateText(prompt, systemPrompt);
  
  try {
    const requirements = JSON.parse(response);
    return {
      min_generation: organism.generation,
      required_capabilities: requirements.required_capabilities || organism.capabilities,
      estimated_complexity: requirements.complexity_level || 5,
      context_requirements: contextData,
      success_criteria: requirements.success_criteria || []
    };
  } catch {
    return {
      min_generation: organism.generation,
      required_capabilities: organism.capabilities,
      estimated_complexity: 5,
      context_requirements: contextData,
      success_criteria: []
    };
  }
}
