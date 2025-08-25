import * as fs from 'fs/promises';
import * as path from 'path';
import { organismDB } from '../../db';
import { llmClient } from '../../../llm/client';
import { config } from '../../../config';
import { logger } from '../../../logger';
import type { Organism } from '../../types';
import { executeComputerOperationLogic } from '../computer_operations';


// Helper function to backup a file before modification
async function _backupCode(filePath: string): Promise<string> {
    const backupDir = path.resolve(process.cwd(), config.sandbox.path(), 'backups');
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
      logger.error({ err: error, filePath, functionName: '_testUpgradedCode' }, 'Code validation failed');
      return { success: false, output: errorMessage };
    }
}

export async function handleSelfModifyCodeOperation(
    operationDetails: Record<string, any>,
    sandboxDir: string
): Promise<any> {
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

export async function handleCreateCapabilityOperation(
    operationDetails: Record<string, any>,
    organism_id: string
): Promise<any> {
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
