import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeComputerOperationLogic } from './computer_operations';

// Mock dependencies
vi.mock('../db', () => ({
  organismDB: {
      exec: vi.fn(),
      queryRow: vi.fn(),
  },
}));

vi.mock('../../llm/client', () => ({
  llmClient: {
      generateText: vi.fn(),
  },
}));

vi.mock('child_process', () => ({
  exec: vi.fn((command, options, callback) => {
    callback(null, 'mock stdout', '');
  }),
}));

vi.mock('fs/promises', () => ({
    mkdir: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(''),
    writeFile: vi.fn().mockResolvedValue(undefined),
    rm: vi.fn().mockResolvedValue(undefined),
}));


describe('executeComputerOperationLogic - Process Operation Security', () => {
  const organismId = 'test-org';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute a command that is on the allowlist', async () => {
    const { exec } = await import('child_process');
    const operationDetails = { command: 'ls -la' };

    await expect(executeComputerOperationLogic(organismId, 'process', operationDetails))
      .resolves.toEqual({ stdout: 'mock stdout', stderr: '' });

    expect(exec).toHaveBeenCalledOnce();
  });

  it('should throw an error for a command that is not on the allowlist', async () => {
    const { exec } = await import('child_process');
    const operationDetails = { command: 'rm -rf /' };

    await expect(executeComputerOperationLogic(organismId, 'process', operationDetails))
      .rejects.toThrow("Command not allowed: 'rm'. Only commands from the allowlist can be executed.");

    expect(exec).not.toHaveBeenCalled();
  });

  it('should handle commands with leading/trailing spaces', async () => {
    const { exec } = await import('child_process');
    const operationDetails = { command: '  ls -F  ' };

    await executeComputerOperationLogic(organismId, 'process', operationDetails);
    expect(exec).toHaveBeenCalledOnce();
  });

  it('should block a disallowed command even with spaces', async () => {
    const { exec } = await import('child_process');
    const operationDetails = { command: ' sudo rm -rf / ' };

    await expect(executeComputerOperationLogic(organismId, 'process', operationDetails))
      .rejects.toThrow("Command not allowed: 'sudo'. Only commands from the allowlist can be executed.");

    expect(exec).not.toHaveBeenCalled();
  });
});
