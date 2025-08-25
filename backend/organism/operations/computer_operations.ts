import { exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { organismDB } from '../db';
import { llmClient } from '../../llm/client';
import type { Organism } from '../types';

// A hardcoded allowlist for safe commands that can be executed by the 'process' operation.
const ALLOWED_PROCESS_COMMANDS = new Set([
  'git',
  'ls',
  'npx',
  'cat',
  'echo',
  'npm',
  'bun',
]);

// This function is moved from autonomous_controller.ts to make it testable
// without pulling in the entire encore.dev/api dependency.

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
      const result = await executeComputerOperationLogic('self_test', 'process', {
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

export async function executeComputerOperationLogic(
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

          // Security Check: Only allow commands from the allowlist
          const executable = command.trim().split(' ')[0];
          if (!ALLOWED_PROCESS_COMMANDS.has(executable)) {
            throw new Error(`Command not allowed: '${executable}'. Only commands from the allowlist can be executed.`);
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

          let data;
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            try {
              data = JSON.parse(responseBody);
            } catch {
              data = responseBody;
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

        case 'automation': {
            // This case needs validateOperationSafety, which is still in the other file.
            // For now, I will just throw an error here.
            // A full refactor would move validateOperationSafety as well.
            throw new Error("Automation operation not supported in this refactored function yet.");
        }

        case 'self_modify_code': {
          const { target_file, change_description } = operationDetails;
          if (!target_file || !change_description) {
            throw new Error('self_modify_code requires a target_file and a change_description.');
          }

          const fullTargetPath = path.resolve(process.cwd(), target_file);
          if (!fullTargetPath.startsWith(path.resolve(process.cwd(), 'backend'))) {
            throw new Error('Self-modification is only allowed for files within the backend directory.');
          }

          const backupPath = await _backupCode(fullTargetPath);
          const originalCode = await fs.readFile(fullTargetPath, 'utf8');
          const upgradePrompt = `You are an expert TypeScript engineer. Rewrite the following code to incorporate this change: "${change_description}". Return ONLY the complete, raw, updated code for the entire file. Do not include any explanations or markdown formatting.`;
          const newCode = await llmClient.generateText(originalCode, upgradePrompt);

          const tempUpgradeDir = path.join(sandboxDir, 'upgrades');
          await fs.mkdir(tempUpgradeDir, { recursive: true });
          const tempFilePath = path.join(tempUpgradeDir, path.basename(target_file));
          await fs.writeFile(tempFilePath, newCode, 'utf8');

          const testResult = await _testUpgradedCode(tempFilePath);

          if (testResult.success) {
            await fs.writeFile(fullTargetPath, newCode, 'utf8');
            await fs.rm(tempFilePath);
            return {
              result: 'Self-modification successful.',
              backup_path: backupPath,
              test_output: testResult.output
            };
          } else {
            await fs.rm(tempFilePath);
            throw new Error(`Self-modification failed: New code did not pass validation. Error: ${testResult.output}`);
          }
        }

        case 'self_modify_prompt': {
            // This also has dependencies that would need to be moved.
            throw new Error("Self-modify-prompt operation not supported in this refactored function yet.");
        }

        case 'create_capability': {
          const { name, description } = operationDetails;
          if (!name || !description) {
            throw new Error('create_capability requires a name and a description.');
          }

          const codeGenPrompt = `You are an expert TypeScript engineer. Write a single, standalone, asynchronous TypeScript function with the name "${name}".
The function should do the following: "${description}".
It should take any necessary parameters as a single object argument and return a Promise resolving to any relevant output.
Return ONLY the raw TypeScript code for the function. Do not include any explanations, markdown formatting, or import statements.`;

          const codeBody = await llmClient.generateText(codeGenPrompt, 'You are a code generation specialist.');

          await organismDB.exec`
            INSERT INTO custom_capabilities (organism_id, name, description, code_body)
            VALUES (${organism_id}, ${name}, ${description}, ${codeBody})
          `;

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
      throw new Error(`Operation failed: ${error.message}`);
    }
}
