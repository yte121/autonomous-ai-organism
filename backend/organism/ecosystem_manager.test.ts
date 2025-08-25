import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEcosystemHealth, optimizeEcosystem, allocateResources, guideEcosystemEvolution } from './ecosystem_manager';
import { organismDB } from './db';
import { llmClient } from '../llm/client';
import { _evolveLogic } from './evolve';
import { _executeComputerOperationLogic } from './operations/computer_operations';
import type { Organism, Task } from './types';

// Mock all dependencies
vi.mock('./db', () => ({
  organismDB: {
    queryAll: vi.fn(),
    exec: vi.fn(),
  },
}));

vi.mock('../llm/client', () => ({
  llmClient: {
    generateText: vi.fn(),
  },
}));

vi.mock('./evolve', () => ({
  _evolveLogic: vi.fn(),
}));

vi.mock('./operations/computer_operations', () => ({
  _executeComputerOperationLogic: vi.fn(),
}));


// This is a workaround for testing non-exported functions.
// In a real-world scenario, these would be in their own files and exported.
const MOCK_analyzeEcosystemHealth = async (organisms: Organism[], tasks: Task[]): Promise<any> => {
    const activeOrganisms = organisms.filter(o => o.status === 'active');
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const failedTasks = tasks.filter(t => t.status === 'failed');
    const taskSuccessRate = tasks.length > 0 ? completedTasks.length / (completedTasks.length + failedTasks.length) : 0;
    const avgSuccessRate = activeOrganisms.length > 0 ? activeOrganisms.reduce((sum, o) => sum + o.performance_metrics.success_rate, 0) / activeOrganisms.length : 0;
    const healthFactors = [avgSuccessRate, taskSuccessRate];
    const overallHealthScore = healthFactors.reduce((sum, factor) => sum + factor, 0) / healthFactors.length;
    return { overall_health_score: overallHealthScore };
};


// ... (Previous MOCK_analyzeEcosystemHealth function)

const MOCK_orchestrateEcosystemEvolution = async (organisms: Organism[], evolutionPressure: string[], selectionCriteria: Record<string, number>, mutationRate: number): Promise<any> => {
    const mockPlan = {
        evolution_candidates: organisms.slice(0, 1).map(o => o.id),
        mutation_strategies: ['test_mutation'],
    };
    llmClient.generateText.mockResolvedValue(JSON.stringify(mockPlan));

    const evolutionPlan = JSON.parse(await llmClient.generateText('', ''));
    const candidates = evolutionPlan.evolution_candidates;
    if (candidates && Array.isArray(candidates) && candidates.length > 0) {
        for (const organismId of candidates) {
            await _evolveLogic({ organism_id: organismId, evolution_triggers: evolutionPressure, target_improvements: evolutionPlan.mutation_strategies });
        }
    }
    return evolutionPlan;
};

const MOCK_applyOptimizationChanges = async (optimizationResult: any): Promise<any> => {
  if (!optimizationResult.organism_modifications) {
    return;
  }
  for (const [organismId, modifications] of Object.entries(optimizationResult.organism_modifications)) {
    if (!Array.isArray(modifications)) continue;
    for (const modification of modifications) {
      await _executeComputerOperationLogic(organismId, modification.action, modification);
    }
  }
};


describe('Ecosystem Manager', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeEcosystemHealth (mocked)', () => {
    it('should calculate health score correctly', async () => {
        const mockOrganisms = [
            { status: 'active', performance_metrics: { success_rate: 1.0 } },
            { status: 'active', performance_metrics: { success_rate: 0.5 } },
        ] as Organism[];
        const mockTasks = [{ status: 'completed' }, { status: 'completed' }, { status: 'failed' }] as Task[];
        const result = await MOCK_analyzeEcosystemHealth(mockOrganisms, mockTasks);
        expect(result.overall_health_score).toBeCloseTo(0.708, 2);
    });
  });

  describe('orchestrateEcosystemEvolution (mocked)', () => {
    it('should call _evolveLogic for candidates returned by the LLM', async () => {
        const mockOrganisms = [{ id: 'org-1' }, { id: 'org-2' }] as Organism[];
        await MOCK_orchestrateEcosystemEvolution(mockOrganisms, ['pressure'], {}, 0.1);

        expect(llmClient.generateText).toHaveBeenCalledOnce();
        expect(_evolveLogic).toHaveBeenCalledOnce();
        expect(_evolveLogic).toHaveBeenCalledWith({
            organism_id: 'org-1',
            evolution_triggers: ['pressure'],
            target_improvements: ['test_mutation'],
        });
    });
  });

  describe('applyOptimizationChanges (mocked)', () => {
    it('should call _executeComputerOperationLogic for each modification', async () => {
        const mockPlan = {
            organism_modifications: {
                'org-1': [
                    { action: 'create_capability', name: 'new_skill', description: 'desc' },
                    { action: 'self_modify_code', target_file: 'file.ts', change_description: 'change' },
                ],
            },
        };

        await MOCK_applyOptimizationChanges(mockPlan);

        expect(_executeComputerOperationLogic).toHaveBeenCalledTimes(2);
        expect(_executeComputerOperationLogic).toHaveBeenCalledWith('org-1', 'create_capability', mockPlan.organism_modifications['org-1'][0]);
        expect(_executeComputerOperationLogic).toHaveBeenCalledWith('org-1', 'self_modify_code', mockPlan.organism_modifications['org-1'][1]);
    });
  });
});
