import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleNetworkOperation } from './network';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('handleNetworkOperation', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle a successful GET request', async () => {
    const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: () => Promise.resolve({ data: 'success' }),
        text: () => Promise.resolve('{ "data": "success" }'),
    };
    mockFetch.mockResolvedValue(mockResponse);

    const details = { url: 'https://example.com/api/data', method: 'GET' };
    const result = await handleNetworkOperation(details);

    expect(mockFetch).toHaveBeenCalledWith('https://example.com/api/data', {
        method: 'GET',
        headers: undefined,
        body: undefined,
    });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ data: 'success' });
  });

  it('should handle a successful POST request with a body', async () => {
    const mockResponse = {
        ok: true,
        status: 201,
        headers: new Headers(),
        text: () => Promise.resolve('Created'),
    };
    mockFetch.mockResolvedValue(mockResponse);

    const details = {
        url: 'https://example.com/api/create',
        method: 'POST',
        headers: { 'X-Test': 'true' },
        body: { name: 'test' },
    };
    const result = await handleNetworkOperation(details);

    expect(mockFetch).toHaveBeenCalledWith('https://example.com/api/create', {
        method: 'POST',
        headers: { 'X-Test': 'true' },
        body: JSON.stringify({ name: 'test' }),
    });
    expect(result.status).toBe(201);
    expect(result.body).toBe('Created');
  });

  it('should handle a failed request', async () => {
    const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
        text: () => Promise.resolve('The requested resource was not found.'),
    };
    mockFetch.mockResolvedValue(mockResponse);

    // This function doesn't throw on non-ok status, it returns the status.
    // This is a design choice in the original code.
    const details = { url: 'https://example.com/api/nonexistent' };
    const result = await handleNetworkOperation(details);

    expect(result.status).toBe(404);
    expect(result.body).toBe('The requested resource was not found.');
  });

  it('should throw an error if no URL is provided', async () => {
    const details = {};
    await expect(handleNetworkOperation(details))
        .rejects.toThrow('Network operation requires a URL.');
  });
});
