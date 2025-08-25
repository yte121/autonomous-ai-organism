import { api } from "encore.dev/api";
import { exec } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
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
    const operationResult = await _executeComputerOperationLogic(
      req.organism_id,
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
  // <PROMPT-START:validateOperationSafety>
  const systemPrompt = `You are a meticulous AI Safety and Ethics Guardian. Your sole responsibility is to evaluate a proposed computer operation for an autonomous AI organism and determine if it is safe to proceed.

You must analyze the operation for potential risks, including but not limited to:
- Harm to humans
- Damage to the host system or external systems
- Data privacy violations
- Security vulnerabilities (e.g., creating backdoors, disabling firewalls)
- Unintended resource exhaustion
- Violation of laws or ethical principles
- Any form of self-replication or modification that is not explicitly sanctioned

Your response MUST be a JSON object with the following structure:
{
  "safe": boolean, // true if the operation is completely safe, false otherwise
  "reason": string // A clear, concise explanation for your decision, especially if not safe.
}

Be extremely cautious. If there is any ambiguity or potential for harm, you must err on the side of caution and deem the operation unsafe.`;
  // <PROMPT-END:validateOperationSafety>

  const prompt = `Please evaluate the safety of the following proposed computer operation:
- Operation Type: ${operationType}
- Operation Details: ${JSON.stringify(operationDetails, null, 2)}

Is this operation safe? Provide your response in the required JSON format.`;

  try {
    const response = await llmClient.generateText(prompt, systemPrompt);
    const safetyAssessment = JSON.parse(response);

    // Basic validation of the parsed object
    if (typeof safetyAssessment.safe === 'boolean' && typeof safetyAssessment.reason === 'string') {
      return {
        safe: safetyAssessment.safe,
        reason: safetyAssessment.reason
      };
    }
    // If the response is not in the expected format, default to unsafe.
    return { safe: false, reason: 'Safety assessment response from LLM was malformed.' };
  } catch (error) {
    console.error('Error during safety validation LLM call:', error);
    // If the LLM call fails for any reason, default to unsafe.
    return { safe: false, reason: 'Failed to get a safety assessment from the LLM.' };
  }
}

// Helper function to backup a file before modification
async function _backupCode(filePath: string): Promise<string> {
  const backupDir = path.resolve(process.cwd(), 'organism_sandbox', 'backups');
  await fs.mkdir(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const backupPath = path.join(backupDir, `${path.basename(filePath)}.${timestamp}.bak`);

  const content = await fs.readFile(filePath, 'utf8');
  await fs.writeFile(backupPath, content, 'utf8');

  return backupPath;
}

// Helper function to test new code using the TypeScript compiler
async function _testUpgradedCode(filePath: string): Promise<{ success: boolean; output: string }> {
  try {
    // We use --noEmit to only perform type-checking without generating JS files.
    // --strict enables all strict type-checking options.
    const result = await _executeComputerOperationLogic('self_test', 'process', {
      command: `npx tsc --noEmit --strict ${filePath}`
    });
    // If tsc completes without error, stdout and stderr will be empty.
    return { success: true, output: 'Compilation successful.' };
  } catch (error: any) {
    // The 'exec' promise rejects if the command returns a non-zero exit code, which tsc does on error.
    const errorMessage = error.stderr || error.stdout || error.message;
    console.error('Code validation failed:', errorMessage);
    return { success: false, output: errorMessage };
  }
}

export async function _executeComputerOperationLogic(
  organism_id: string,
  operationType: string,
  operationDetails: Record<string, any>
): Promise<any> {
  const sandboxDir = path.resolve(process.cwd(), 'organism_sandbox');
  await fs.mkdir(sandboxDir, { recursive: true }); // Ensure sandbox exists

  // Helper function to ensure the path is within the sandbox
  const isPathInSandbox = (filePath: string): boolean => {
    const resolvedPath = path.resolve(filePath);
    return resolvedPath.startsWith(sandboxDir);
  };

  try {
    switch (operationType) {
      case 'file_system': {
        const { action, path: targetPath, content } = operationDetails;

        if (!targetPath) {
          throw new Error('File system action requires a path.');
        }
        const safePath = path.join(sandboxDir, targetPath);

        if (!isPathInSandbox(safePath)) {
          throw new Error(`Path is outside the sandbox: ${targetPath}`);
        }

        switch (action) {
          case 'readFile':
            return await fs.readFile(safePath, 'utf8');
          case 'writeFile':
            if (typeof content !== 'string') {
              throw new Error('writeFile action requires string content.');
            }
            await fs.writeFile(safePath, content, 'utf8');
            return { result: `Successfully wrote to ${targetPath}` };
          case 'readdir':
            return await fs.readdir(safePath);
          case 'mkdir':
            await fs.mkdir(safePath, { recursive: true });
            return { result: `Successfully created directory ${targetPath}` };
          case 'rm':
            await fs.rm(safePath, { recursive: true, force: true });
            return { result: `Successfully deleted ${targetPath}` };
          default:
            throw new Error(`Unsupported file system action: ${action}`);
        }
      }

      case 'process': {
        const { command } = operationDetails;
        if (typeof command !== 'string') {
          throw new Error('Process execution requires a command string.');
        }

        return new Promise((resolve, reject) => {
          exec(command, { cwd: sandboxDir }, (error, stdout, stderr) => {
            if (error) {
              // Reject with a structured error
              reject({
                message: error.message,
                stdout,
                stderr,
              });
              return;
            }
            // Resolve with a structured success response
            resolve({ stdout, stderr });
          });
        });
      }

      case 'network': {
        const { url, method, headers, body } = operationDetails;
        if (!url) {
          throw new Error('Network operation requires a URL.');
        }

        const response = await fetch(url, { method: method || 'GET', headers, body: body ? JSON.stringify(body) : undefined });
        const responseBody = await response.text();

        // Try to parse as JSON if the content type suggests it
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            data = JSON.parse(responseBody);
          } catch {
            data = responseBody; // Not valid JSON, return as text
          }
        } else {
          data = responseBody;
        }

        return {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body: data,
        };
      }

      case 'system_info': {
        const cpus = os.cpus();
        return {
          platform: os.platform(),
          arch: os.arch(),
          hostname: os.hostname(),
          uptime_seconds: os.uptime(),
          cpu_cores: cpus.length,
          cpu_model: cpus.length > 0 ? cpus[0].model : 'unknown',
          total_memory_bytes: os.totalmem(),
          free_memory_bytes: os.freemem(),
        };
      }

      case 'automation':
        return {
          operation: 'automation',
          script: operationDetails.script,
          result: 'simulated_automation_success',
          timestamp: new Date()
        };

      case 'self_modify_code': {
        const { target_file, change_description } = operationDetails;
        if (!target_file || !change_description) {
          throw new Error('self_modify_code requires a target_file and a change_description.');
        }

        const fullTargetPath = path.resolve(process.cwd(), target_file);
        // Security check: ensure we are only modifying files within the backend directory
        if (!fullTargetPath.startsWith(path.resolve(process.cwd(), 'backend'))) {
          throw new Error('Self-modification is only allowed for files within the backend directory.');
        }

        // 1. Backup the original code
        const backupPath = await _backupCode(fullTargetPath);

        // 2. Read the original code
        const originalCode = await fs.readFile(fullTargetPath, 'utf8');

        // 3. Use LLM to generate the upgraded code
        const upgradePrompt = `You are an expert TypeScript engineer. Rewrite the following code to incorporate this change: "${change_description}". Return ONLY the complete, raw, updated code for the entire file. Do not include any explanations or markdown formatting.`;
        const newCode = await llmClient.generateText(originalCode, upgradePrompt);

        // 4. Save new code to a temporary file for testing
        const tempUpgradeDir = path.join(sandboxDir, 'upgrades');
        await fs.mkdir(tempUpgradeDir, { recursive: true });
        const tempFilePath = path.join(tempUpgradeDir, path.basename(target_file));
        await fs.writeFile(tempFilePath, newCode, 'utf8');

        // 5. Test the new code
        const testResult = await _testUpgradedCode(tempFilePath);

        // 6. Apply the change if the test passes
        if (testResult.success) {
          await fs.writeFile(fullTargetPath, newCode, 'utf8');
          await fs.rm(tempFilePath); // Clean up temp file
          return {
            result: 'Self-modification successful.',
            backup_path: backupPath,
            test_output: testResult.output
          };
        } else {
          await fs.rm(tempFilePath); // Clean up temp file
          throw new Error(`Self-modification failed: New code did not pass validation. Error: ${testResult.output}`);
        }
      }

      case 'self_modify_prompt': {
        const { target_file, prompt_key, new_prompt_text } = operationDetails;
        if (!target_file || !prompt_key || !new_prompt_text) {
          throw new Error('self_modify_prompt requires a target_file, prompt_key, and new_prompt_text.');
        }

        const fullTargetPath = path.resolve(process.cwd(), target_file);
        if (!fullTargetPath.startsWith(path.resolve(process.cwd(), 'backend'))) {
          throw new Error('Self-modification is only allowed for files within the backend directory.');
        }

        // 1. Backup the original code
        const backupPath = await _backupCode(fullTargetPath);

        // 2. Read the original code
        const originalCode = await fs.readFile(fullTargetPath, 'utf8');

        // 3. Find and replace the prompt using markers
        const startMarker = `// <PROMPT-START:${prompt_key}>`;
        const endMarker = `// <PROMPT-END:${prompt_key}>`;
        const regex = new RegExp(`${startMarker}\\s*const systemPrompt = \`([\\s\\S]*?)\`;\\s*${endMarker}`, 's');

        if (!regex.test(originalCode)) {
          throw new Error(`Could not find prompt markers for key '${prompt_key}' in file '${target_file}'.`);
        }

        const newSystemPrompt = `const systemPrompt = \`${new_prompt_text}\`;`;
        const newCode = originalCode.replace(regex, `${startMarker}\n  ${newSystemPrompt}\n  ${endMarker}`);

        // 4. Save new code to a temporary file for testing
        const tempUpgradeDir = path.join(sandboxDir, 'upgrades');
        await fs.mkdir(tempUpgradeDir, { recursive: true });
        const tempFilePath = path.join(tempUpgradeDir, path.basename(target_file));
        await fs.writeFile(tempFilePath, newCode, 'utf8');

        // 5. Test the new code
        const testResult = await _testUpgradedCode(tempFilePath);

        // 6. Apply the change if the test passes
        if (testResult.success) {
          await fs.writeFile(fullTargetPath, newCode, 'utf8');
          await fs.rm(tempFilePath); // Clean up temp file
          return {
            result: 'Prompt modification successful.',
            backup_path: backupPath,
            test_output: testResult.output
          };
        } else {
          await fs.rm(tempFilePath); // Clean up temp file
          throw new Error(`Prompt modification failed: New code did not pass validation. Error: ${testResult.output}`);
        }
      }

      case 'create_capability': {
        const { name, description } = operationDetails;
        if (!name || !description) {
          throw new Error('create_capability requires a name and a description.');
        }

        // Use LLM to generate the code for the new capability
        const codeGenPrompt = `You are an expert TypeScript engineer. Write a single, standalone, asynchronous TypeScript function with the name "${name}".
The function should do the following: "${description}".
It should take any necessary parameters as a single object argument and return a Promise resolving to any relevant output.
Return ONLY the raw TypeScript code for the function. Do not include any explanations, markdown formatting, or import statements.`;

        const codeBody = await llmClient.generateText(codeGenPrompt, 'You are a code generation specialist.');

        // Save the new capability to the database
        await organismDB.exec`
          INSERT INTO custom_capabilities (organism_id, name, description, code_body)
          VALUES (${organism_id}, ${name}, ${description}, ${codeBody})
        `;

        // Add the new capability to the organism's main capability list
        const organism = await organismDB.queryRow<Organism>`SELECT capabilities FROM organisms WHERE id = ${organism_id}`;
        if (organism) {
          const updatedCapabilities = new Set(organism.capabilities);
          updatedCapabilities.add(name);
          await organismDB.exec`
            UPDATE organisms SET capabilities = ${JSON.stringify(Array.from(updatedCapabilities))} WHERE id = ${organism_id}
          `;
        }

        return {
          result: `Successfully created and learned new capability: ${name}`
        };
      }

      default:
        throw new Error(`Unsupported operation type: ${operationType}`);
    }
  } catch (error: any) {
    console.error(`Error during computer operation '${operationType}':`, error);
    // Re-throw a structured error to be caught by the API handler
    throw new Error(`Operation failed: ${error.message}`);
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
