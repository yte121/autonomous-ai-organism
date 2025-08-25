import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleFileSystemOperation } from './file_system';
import * as fs from 'fs/promises';

// Mock the fs/promises module
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  readdir: vi.fn(),
  mkdir: vi.fn(),
  rm: vi.fn(),
}));

describe('handleFileSystemOperation', () => {
  const sandboxDir = '/app/backend/organism_sandbox';
  const isPathInSandbox = (filePath: string) => filePath.startsWith(sandboxDir);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call fs.readFile for readFile action', async () => {
    const details = { action: 'readFile', path: 'test.txt' };
    await handleFileSystemOperation(details, sandboxDir, isPathInSandbox);
    expect(fs.readFile).toHaveBeenCalledWith(`${sandboxDir}/test.txt`, 'utf8');
  });

  it('should call fs.writeFile for writeFile action', async () => {
    const details = { action: 'writeFile', path: 'test.txt', content: 'hello' };
    await handleFileSystemOperation(details, sandboxDir, isPathInSandbox);
    expect(fs.writeFile).toHaveBeenCalledWith(`${sandboxDir}/test.txt`, 'hello', 'utf8');
  });

  it('should throw an error for writeFile without content', async () => {
    const details = { action: 'writeFile', path: 'test.txt' };
    await expect(handleFileSystemOperation(details, sandboxDir, isPathInSandbox))
      .rejects.toThrow('writeFile action requires string content.');
  });

  it('should call fs.readdir for readdir action', async () => {
    const details = { action: 'readdir', path: 'test_dir' };
    await handleFileSystemOperation(details, sandboxDir, isPathInSandbox);
    expect(fs.readdir).toHaveBeenCalledWith(`${sandboxDir}/test_dir`);
  });

  it('should throw an error if path is outside the sandbox', async () => {
    const details = { action: 'readFile', path: '../../../../etc/passwd' };
    await expect(handleFileSystemOperation(details, sandboxDir, isPathInSandbox))
      .rejects.toThrow('Path is outside the sandbox');
  });

  it('should throw an error for an unsupported action', async () => {
    const details = { action: 'unsupported_action', path: 'test.txt' };
    await expect(handleFileSystemOperation(details, sandboxDir, isPathInSandbox))
      .rejects.toThrow('Unsupported file system action: unsupported_action');
  });
});
