import * as path from 'path';
import * as fs from 'fs/promises';
import { config } from '../../config';
import { logger } from '../../logger';

// Import the new operation handlers
import { handleFileSystemOperation } from './lib/file_system';
import { handleProcessOperation } from './lib/process';
import { handleNetworkOperation } from './lib/network';
import { handleSystemInfoOperation } from './lib/system_info';
import { handleSelfModifyCodeOperation, handleCreateCapabilityOperation } from './lib/self_modification';

export async function executeComputerOperationLogic(
    organism_id: string,
    operationType: string,
    operationDetails: Record<string, any>
): Promise<any> {
    const sandboxDir = path.resolve(process.cwd(), config.sandbox.path());
    await fs.mkdir(sandboxDir, { recursive: true }); // Ensure sandbox exists

    const isPathInSandbox = (filePath: string): boolean => {
        const resolvedPath = path.resolve(filePath);
        return resolvedPath.startsWith(sandboxDir);
    };

    try {
        switch (operationType) {
            case 'file_system':
                return await handleFileSystemOperation(operationDetails, sandboxDir, isPathInSandbox);

            case 'process':
                return await handleProcessOperation(operationDetails, sandboxDir);

            case 'network':
                return await handleNetworkOperation(operationDetails);

            case 'system_info':
                return await handleSystemInfoOperation();

            case 'self_modify_code':
                return await handleSelfModifyCodeOperation(operationDetails, sandboxDir);

            case 'create_capability':
                return await handleCreateCapabilityOperation(operationDetails, organism_id);

            // Cases that are not yet fully refactored
            case 'automation':
            case 'self_modify_prompt':
                throw new Error(`Operation type '${operationType}' is not fully supported in this refactored module yet.`);

            default:
                throw new Error(`Unsupported operation type: ${operationType}`);
        }
    } catch (error: any) {
        logger.error({ err: error, operationType, operationDetails, organism_id }, `Error during computer operation`);
        throw new Error(`Operation failed: ${error.message}`);
    }
}
