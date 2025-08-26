import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleProcessOperation } from './process';
import { exec } from 'child_process';

// Mock the child_process module
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

describe('handleProcessOperation', () => {
  const sandboxDir = '/app/backend/organism_sandbox';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute an allowed command', async () => {
    const details = { command: 'ls -l' };
    vi.mocked(exec).mockImplementation((command, options, callback) => {
        callback(null, 'success', '');
        return null;
    });

    const result = await handleProcessOperation(details, sandboxDir);
    expect(exec).toHaveBeenCalledWith('ls -l', { cwd: sandboxDir }, expect.any(Function));
    expect(result).toEqual({ stdout: 'success', stderr: '' });
  });

  it('should reject a disallowed command', async () => {
    const details = { command: 'sudo rm -rf /' };
    await expect(handleProcessOperation(details, sandboxDir))
      .rejects.toThrow("Command not allowed: 'sudo'");
    expect(exec).not.toHaveBeenCalled();
  });

  it('should handle an error during command execution', async () => {
    const details = { command: 'git status' };
    const mockError = new Error('git error');
    vi.mocked(exec).mockImplementation((command, options, callback) => {
        callback(mockError, '', 'stderr output');
        return null;
    });

    await expect(handleProcessOperation(details, sandboxDir))
        .rejects.toEqual({
            message: 'git error',
            stdout: '',
            stderr: 'stderr output',
        });
    expect(exec).toHaveBeenCalledOnce();
  });
});
