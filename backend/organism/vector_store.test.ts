import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VectorStore } from './vector_store';

// Mock the hnswlib-node module to avoid native binding issues in test
vi.mock('hnswlib-node', () => {
  const HierarchicalNSW = vi.fn();
  HierarchicalNSW.prototype.initIndex = vi.fn();
  HierarchicalNSW.prototype.addPoint = vi.fn();
  HierarchicalNSW.prototype.searchKnn = vi.fn().mockReturnValue({ neighbors: [], distances: [] });
  HierarchicalNSW.prototype.writeIndex = vi.fn().mockResolvedValue(undefined);
  HierarchicalNSW.prototype.readIndex = vi.fn().mockResolvedValue(undefined);
  HierarchicalNSW.prototype.getMaxElements = vi.fn().mockReturnValue(10000);
  HierarchicalNSW.prototype.resizeIndex = vi.fn();
  return { HierarchicalNSW };
});

// Mock the fs/promises module to avoid actual file system operations
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockRejectedValue(new Error('File not found')), // Default to not finding files
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

describe('VectorStore', () => {
  let HierarchicalNSW: any;
  let fs: any;

  beforeEach(async () => {
    // Reset mocks and singleton before each test
    vi.clearAllMocks();
    (VectorStore as any).instance = undefined;

    // Import the mocked modules to access them in tests
    HierarchicalNSW = (await import('hnswlib-node')).HierarchicalNSW;
    fs = await import('fs/promises');
  });

  it('should initialize a singleton instance', async () => {
    const instance = await VectorStore.getInstance();
    expect(instance).toBeInstanceOf(VectorStore);
    const instance2 = await VectorStore.getInstance();
    expect(instance2).toBe(instance);
  });

  it('should initialize a new index if one does not exist', async () => {
    await VectorStore.getInstance();
    expect(HierarchicalNSW.prototype.initIndex).toHaveBeenCalledWith(10000);
  });

  it('should add a vector and its ID mapping', async () => {
    const instance = await VectorStore.getInstance();
    const vector = [1, 2, 3];
    const id = 'uuid-1';

    await instance.addVector(vector, id);

    expect(HierarchicalNSW.prototype.addPoint).toHaveBeenCalledWith(vector, 0);
  });

  it('should search for vectors and return mapped IDs', async () => {
    const instance = await VectorStore.getInstance();

    // Setup state
    await instance.addVector([1, 2, 3], 'uuid-1');
    await instance.addVector([4, 5, 6], 'uuid-2');

    // Configure mock response for search
    HierarchicalNSW.prototype.searchKnn.mockReturnValue({
      neighbors: [1, 0], // Corresponds to uuid-2, uuid-1
      distances: [0.1, 0.5],
    });

    const results = await instance.search([7, 8, 9], 2);

    expect(HierarchicalNSW.prototype.searchKnn).toHaveBeenCalledWith([7, 8, 9], 2);
    expect(results).toEqual([
      { id: 'uuid-2', distance: 0.1 },
      { id: 'uuid-1', distance: 0.5 },
    ]);
  });

  it('should save the index and the ID map', async () => {
    const instance = await VectorStore.getInstance();
    await instance.addVector([1, 2, 3], 'uuid-1');

    await instance.save();

    expect(HierarchicalNSW.prototype.writeIndex).toHaveBeenCalled();
    expect(fs.writeFile).toHaveBeenCalled();

    // Check if the map data is correctly stringified
    const mapData = JSON.parse(vi.mocked(fs.writeFile).mock.calls[0][1] as string);
    expect(mapData.nextLabel).toBe(1);
    expect(mapData.idToLabel).toEqual([['uuid-1', 0]]);
  });

  it('should load an existing index and ID map', async () => {
    // Mock the file system to return existing files
    const mapData = {
      labelToId: [[0, 'uuid-10'], [1, 'uuid-11']],
      idToLabel: [['uuid-10', 0], ['uuid-11', 1]],
      nextLabel: 2,
    };
    fs.readFile.mockResolvedValue(JSON.stringify(mapData));

    const instance = await VectorStore.getInstance();

    expect(HierarchicalNSW.prototype.readIndex).toHaveBeenCalled();
    expect(fs.readFile).toHaveBeenCalled();

    // Verify internal state was loaded correctly
    const results = await instance.search([1,1,1], 1);
    // Even with empty search results, we can check if the map was loaded
    // by seeing if searchKnn is called. If not initialized, it would throw.
    expect(HierarchicalNSW.prototype.searchKnn).toHaveBeenCalled();

    // A more direct way to test loaded state (if we expose it, but we don't)
    // So we test by side-effect: saving again should save the loaded data.
    await instance.save();
    const savedMapData = JSON.parse(vi.mocked(fs.writeFile).mock.calls[0][1] as string);
    expect(savedMapData.nextLabel).toBe(2);
    expect(savedMapData.idToLabel).toEqual([['uuid-10', 0], ['uuid-11', 1]]);
  });
});
