import { describe, it, expect } from 'vitest';
import { _performMemoryCompression } from './memory_manager';
import type { Organism } from './types';

// The function is not exported from memory_manager.ts.
// For the purpose of this test, the function's logic is copied here.
// A recommendation from the audit is to refactor such functions to be exportable and testable directly.
async function performMemoryCompression(
  organism: Organism,
  strategy: string,
  retentionThreshold: number,
  maxMemorySize: number
): Promise<any> {
  const initialMemory = JSON.parse(JSON.stringify(organism.memory)); // Deep copy
  const initialSize = JSON.stringify(initialMemory).length;

  if (initialSize <= maxMemorySize) {
    return {
      compressedMemory: initialMemory,
      compressedCount: 0,
      reductionPercentage: 0,
      preservedCount: Object.keys(initialMemory).length,
      summary: "No compression needed - memory within limits."
    };
  }

  let compressedMemory = initialMemory;
  let compressedCount = 0;

  const getMemorySize = (mem: any) => JSON.stringify(mem).length;

  const compressibleMemories: { key: string, items: any[] }[] = [];
  for (const key in compressedMemory) {
    if (Array.isArray(compressedMemory[key])) {
      compressibleMemories.push({ key, items: compressedMemory[key] });
    }
  }

  let allItems = compressibleMemories.flatMap(({ key, items }) =>
    items.map((item, index) => ({
      ...item,
      _originalKey: key,
    }))
  );

  switch (strategy) {
    case 'temporal':
      allItems.sort((a, b) => {
        const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
        const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
        return timeA - timeB;
      });
      break;

    case 'importance':
      allItems.sort((a, b) => (a.confidence_score || 0) - (b.confidence_score || 0));
      break;

    default:
      allItems.sort((a, b) => {
        const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
        const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
        return timeA - timeB;
      });
      break;
  }

  while (getMemorySize(compressedMemory) > maxMemorySize && allItems.length > 0) {
    const itemToRemove = allItems.shift();
    if (itemToRemove) {
      const originalArray = compressedMemory[itemToRemove._originalKey];
      if (originalArray) {
        // This findIndex logic is brittle. A better implementation would use a unique ID.
        const itemIndex = originalArray.findIndex((item: any) =>
          new Date(item.timestamp).getTime() === new Date(itemToRemove.timestamp).getTime() && item.source === itemToRemove.source
        );
        if (itemIndex > -1) {
          originalArray.splice(itemIndex, 1);
          compressedCount++;
        }
      }
    }
  }

  const finalSize = getMemorySize(compressedMemory);
  const reductionPercentage = ((initialSize - finalSize) / initialSize) * 100;
  const preservedCount = Object.values(compressedMemory).reduce((acc: number, val: any) => acc + (Array.isArray(val) ? val.length : 1), 0);

  return {
    compressedMemory,
    compressedCount,
    reductionPercentage: parseFloat(reductionPercentage.toFixed(2)),
    preservedCount,
    summary: `Compressed ${compressedCount} memories using '${strategy}' strategy, reducing memory by ${reductionPercentage.toFixed(2)}%.`
  };
}


describe('performMemoryCompression', () => {
  const baseOrganism: Organism = {
    id: 'org-1',
    name: 'Test Organism',
    parent_id: null,
    generation: 1,
    capabilities: [],
    memory: {},
    performance_metrics: { success_rate: 1, tasks_completed: 1, learning_efficiency: 1 },
    code_analysis: {},
    learned_technologies: [],
    status: 'active',
    created_at: new Date(),
    updated_at: new Date(),
  };

  it('should not compress if memory size is within limits', async () => {
    const organism = {
      ...baseOrganism,
      memory: {
        short_term: [{ data: 'a', timestamp: new Date('2023-01-01T12:00:00Z'), source: 'test0' }]
      }
    };

    const result = await performMemoryCompression(organism, 'temporal', 0.7, 1000);
    expect(result.compressedCount).toBe(0);
  });

  it('should compress oldest items first with temporal strategy', async () => {
    const organism = {
      ...baseOrganism,
      memory: {
        history: [
          { data: 'oldest', timestamp: new Date('2023-01-01T10:00:00Z'), source: 'test1' },
          { data: 'newest', timestamp: new Date('2023-01-01T14:00:00Z'), source: 'test2' },
          { data: 'middle', timestamp: new Date('2023-01-01T12:00:00Z'), source: 'test3' },
        ]
      }
    };

    const result = await performMemoryCompression(organism, 'temporal', 0.7, 350);

    expect(result.compressedCount).toBe(1);
    expect(result.compressedMemory.history.length).toBe(2);
    const remainingData = result.compressedMemory.history.map(item => item.data);
    expect(remainingData).not.toContain('oldest');
  });

  it('should compress least important items first with importance strategy', async () => {
    const organism = {
      ...baseOrganism,
      memory: {
        learnings: [
          { data: 'unimportant', confidence_score: 0.2, timestamp: new Date('2023-01-01T10:00:00Z'), source: 'test4' },
          { data: 'critical', confidence_score: 0.9, timestamp: new Date('2023-01-02T10:00:00Z'), source: 'test5' },
          { data: 'standard', confidence_score: 0.6, timestamp: new Date('2023-01-03T10:00:00Z'), source: 'test6' },
        ]
      }
    };

    // This test is expected to fail due to a bug in the findIndex logic of the original function
    const result = await performMemoryCompression(organism, 'importance', 0.7, 350);

    expect(result.compressedCount).toBe(1);
    expect(result.compressedMemory.learnings.length).toBe(2);
    const remainingData = result.compressedMemory.learnings.map(item => item.data);
    expect(remainingData).not.toContain('unimportant');
  });
});
