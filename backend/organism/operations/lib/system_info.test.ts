import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleSystemInfoOperation } from './system_info';
import * as os from 'os';

// Mock the os module
vi.mock('os', () => ({
  platform: vi.fn(() => 'linux'),
  arch: vi.fn(() => 'x64'),
  hostname: vi.fn(() => 'test-host'),
  uptime: vi.fn(() => 12345),
  cpus: vi.fn(() => [{ model: 'test-cpu', speed: 3000, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } }]),
  totalmem: vi.fn(() => 16 * 1024 * 1024 * 1024), // 16 GB
  freemem: vi.fn(() => 8 * 1024 * 1024 * 1024),  // 8 GB
}));

describe('handleSystemInfoOperation', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return a structured object with system information', async () => {
    const result = await handleSystemInfoOperation();

    expect(result).toEqual({
      platform: 'linux',
      arch: 'x64',
      hostname: 'test-host',
      uptime_seconds: 12345,
      cpu_cores: 1,
      cpu_model: 'test-cpu',
      total_memory_bytes: 16 * 1024 * 1024 * 1024,
      free_memory_bytes: 8 * 1024 * 1024 * 1024,
    });

    // Ensure the mocked os functions were called
    expect(os.platform).toHaveBeenCalled();
    expect(os.cpus).toHaveBeenCalled();
  });

  it('should handle the case of no CPUs found', async () => {
    vi.mocked(os.cpus).mockReturnValue([]);
    const result = await handleSystemInfoOperation();
    expect(result.cpu_cores).toBe(0);
    expect(result.cpu_model).toBe('unknown');
  });
});
