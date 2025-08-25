import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeComputerOperationLogic } from './computer_operations';

// Mock the config module to prevent Encore runtime errors
vi.mock('../../config', () => ({
  config: {
    sandbox: {
      path: vi.fn().mockReturnValue('mock_sandbox'),
    },
  },
}));

// Mock the handler modules
vi.mock('./lib/file_system', () => ({
  handleFileSystemOperation: vi.fn().mockResolvedValue({ result: 'file system success' }),
}));
vi.mock('./lib/process', () => ({
  handleProcessOperation: vi.fn().mockResolvedValue({ result: 'process success' }),
}));
vi.mock('./lib/network', () => ({
    handleNetworkOperation: vi.fn().mockResolvedValue({ result: 'network success' }),
}));
vi.mock('./lib/system_info', () => ({
    handleSystemInfoOperation: vi.fn().mockResolvedValue({ result: 'system info success' }),
}));
vi.mock('./lib/self_modification', () => ({
    handleSelfModifyCodeOperation: vi.fn().mockResolvedValue({ result: 'self modify success' }),
    handleCreateCapabilityOperation: vi.fn().mockResolvedValue({ result: 'create capability success' }),
}));

// Mock dependencies of the dispatcher itself
vi.mock('fs/promises', () => ({
    mkdir: vi.fn().mockResolvedValue(undefined),
}));


describe('executeComputerOperationLogic Dispatcher', () => {
    const organismId = 'test-org';
    const operationDetails = { command: 'some command' };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should call handleFileSystemOperation for file_system type', async () => {
        const { handleFileSystemOperation } = await import('./lib/file_system');
        await executeComputerOperationLogic(organismId, 'file_system', operationDetails);
        expect(handleFileSystemOperation).toHaveBeenCalledOnce();
    });

    it('should call handleProcessOperation for process type', async () => {
        const { handleProcessOperation } = await import('./lib/process');
        await executeComputerOperationLogic(organismId, 'process', operationDetails);
        expect(handleProcessOperation).toHaveBeenCalledOnce();
    });

    it('should call handleNetworkOperation for network type', async () => {
        const { handleNetworkOperation } = await import('./lib/network');
        await executeComputerOperationLogic(organismId, 'network', operationDetails);
        expect(handleNetworkOperation).toHaveBeenCalledOnce();
    });

    it('should call handleSystemInfoOperation for system_info type', async () => {
        const { handleSystemInfoOperation } = await import('./lib/system_info');
        await executeComputerOperationLogic(organismId, 'system_info', operationDetails);
        expect(handleSystemInfoOperation).toHaveBeenCalledOnce();
    });

    it('should call handleSelfModifyCodeOperation for self_modify_code type', async () => {
        const { handleSelfModifyCodeOperation } = await import('./lib/self_modification');
        await executeComputerOperationLogic(organismId, 'self_modify_code', operationDetails);
        expect(handleSelfModifyCodeOperation).toHaveBeenCalledOnce();
    });

    it('should call handleCreateCapabilityOperation for create_capability type', async () => {
        const { handleCreateCapabilityOperation } = await import('./lib/self_modification');
        await executeComputerOperationLogic(organismId, 'create_capability', operationDetails);
        expect(handleCreateCapabilityOperation).toHaveBeenCalledOnce();
    });

    it('should throw an error for an unsupported operation type', async () => {
        await expect(executeComputerOperationLogic(organismId, 'unsupported_type', operationDetails))
            .rejects.toThrow("Unsupported operation type: unsupported_type");
    });
});
