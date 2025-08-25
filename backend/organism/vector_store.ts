import { HierarchicalNSW } from 'hnswlib-node';
import * as fs from 'fs/promises';
import * as path from 'path';

const DIMENSIONS = 384; // For sentence-transformers/all-minilm-l6-v2
const MAX_ELEMENTS = 10000; // Max number of items to store
const INDEX_PATH = path.resolve(process.cwd(), 'organism_sandbox', 'vector_index.bin');
const MAP_PATH = path.resolve(process.cwd(), 'organism_sandbox', 'vector_index_map.json');

/**
 * A singleton class to manage the vector store using HNSWLib.
 * It handles loading, saving, and searching the vector index,
 * and maintains a mapping between HNSWLib's integer labels and
 * the application's string-based database IDs.
 */
export class VectorStore {
  private static instance: VectorStore;
  private index: HierarchicalNSW;
  private labelToIdMap: Map<number, string> = new Map();
  private idToLabelMap: Map<string, number> = new Map();
  private nextLabel: number = 0;
  private isInitialized: boolean = false;

  private constructor() {
    this.index = new HierarchicalNSW('l2', DIMENSIONS);
  }

  public static async getInstance(): Promise<VectorStore> {
    if (!VectorStore.instance) {
      VectorStore.instance = new VectorStore();
      await VectorStore.instance.initialize();
    }
    return VectorStore.instance;
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Ensure the directory exists
      await fs.mkdir(path.dirname(INDEX_PATH), { recursive: true });

      // Load the index and map if they exist
      await this.load();
      console.log('Vector store initialized from existing files.');
    } catch (error) {
      // If files don't exist or are corrupt, initialize a new index
      console.log('No existing vector store found. Initializing a new one.');
      this.index.initIndex(MAX_ELEMENTS);
    }

    this.isInitialized = true;
  }

  public async addVector(vector: number[], id: string): Promise<void> {
    if (!this.isInitialized) await this.initialize();

    // If the ID already has a label, we don't add it again.
    // A more advanced implementation might update the vector.
    if (this.idToLabelMap.has(id)) {
      console.warn(`Vector with ID ${id} already exists in the store. Skipping.`);
      return;
    }

    const label = this.nextLabel++;
    this.index.addPoint(vector, label);

    this.labelToIdMap.set(label, id);
    this.idToLabelMap.set(id, label);
  }

  public async search(queryVector: number[], k: number): Promise<{ id: string; distance: number }[]> {
    if (!this.isInitialized) await this.initialize();

    const result = this.index.searchKnn(queryVector, k);

    return result.neighbors.map((label, index) => ({
      id: this.labelToIdMap.get(label)!,
      distance: result.distances[index],
    })).filter(item => item.id !== undefined);
  }

  public async save(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      // Save the HNSW index
      await this.index.writeIndex(INDEX_PATH);

      // Save the ID map
      const mapData = JSON.stringify({
        labelToId: Array.from(this.labelToIdMap.entries()),
        idToLabel: Array.from(this.idToLabelMap.entries()),
        nextLabel: this.nextLabel,
      });
      await fs.writeFile(MAP_PATH, mapData, 'utf8');

      console.log('Vector store saved successfully.');
    } catch (error) {
      console.error('Failed to save vector store:', error);
    }
  }

  private async load(): Promise<void> {
    // Load the HNSW index
    await this.index.readIndex(INDEX_PATH);

    // Load the ID map
    const mapData = await fs.readFile(MAP_PATH, 'utf8');
    const { labelToId, idToLabel, nextLabel } = JSON.parse(mapData);

    this.labelToIdMap = new Map(labelToId);
    this.idToLabelMap = new Map(idToLabel);
    this.nextLabel = nextLabel;

    // Set the max elements for the loaded index
    this.index.resizeIndex(this.index.getMaxElements());
  }
}
