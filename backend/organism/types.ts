export interface Organism {
  id: string;
  name: string;
  generation: number;
  parent_id?: string;
  status: OrganismStatus;
  capabilities: string[];
  memory: Record<string, any>;
  performance_metrics: PerformanceMetrics;
  code_analysis: CodeAnalysis;
  learned_technologies: string[];
  created_at: Date;
  updated_at: Date;
  last_active: Date;
  memory_version?: number;
  memory_size_bytes?: number;
  last_memory_compression?: Date;
  memory_optimization_score?: number;
}

export type OrganismStatus = 'active' | 'evolving' | 'merging' | 'healing' | 'dormant' | 'deprecated';

export interface PerformanceMetrics {
  tasks_completed: number;
  success_rate: number;
  average_completion_time: number;
  error_recovery_rate: number;
  learning_efficiency: number;
}

export interface CodeAnalysis {
  analyzed_repositories: string[];
  extracted_patterns: string[];
  absorbed_functionalities: string[];
  optimization_suggestions: string[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  complexity_level: number;
  status: TaskStatus;
  assigned_organisms: string[];
  requirements: TaskRequirements;
  progress: TaskProgress;
  results: TaskResults;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
}

export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'merging' | 'completed' | 'failed';

export interface TaskRequirements {
  min_generation: number;
  required_capabilities: string[];
  estimated_complexity: number;
  deadline?: Date;
}

export interface TaskProgress {
  completion_percentage: number;
  current_phase: string;
  milestones_completed: string[];
  issues_encountered: string[];
}

export interface TaskResults {
  output: any;
  performance_data: Record<string, any>;
  lessons_learned: string[];
  new_capabilities_discovered: string[];
}

export interface Communication {
  id: string;
  sender_id: string;
  receiver_id?: string;
  message_type: CommunicationType;
  content: Record<string, any>;
  is_broadcast: boolean;
  created_at: Date;
}

export type CommunicationType = 'task_assignment' | 'merge_request' | 'knowledge_share' | 'evolution_proposal' | 'error_report' | 'status_update';

export interface KnowledgeEntry {
  id: string;
  organism_id: string;
  knowledge_type: KnowledgeType;
  content: Record<string, any>;
  source: string;
  confidence_score: number;
  created_at: Date;
  updated_at: Date;
}

export type KnowledgeType = 'codebase_analysis' | 'technology_pattern' | 'optimization_technique' | 'error_solution' | 'task_strategy' | 'internet_research' | 'memory_management' | 'shared_knowledge' | 'inherited_knowledge';

export interface CreateOrganismRequest {
  name: string;
  parent_id?: string;
  initial_capabilities?: string[];
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  complexity_level: number;
  requirements: TaskRequirements;
}

export interface MergeRequest {
  organism_ids: string[];
  task_id: string;
  merge_strategy: 'capability_combine' | 'knowledge_aggregate' | 'performance_optimize';
}

export interface EvolutionRequest {
  organism_id: string;
  evolution_triggers: string[];
  target_improvements: string[];
}

export interface LearningRequest {
  organism_id: string;
  source_type: 'codebase' | 'internet' | 'technology_docs';
  source_url?: string;
  learning_objectives: string[];
}

export interface MemoryPersistence {
  id: string;
  persistence_id: string;
  organism_id: string;
  persistence_level: 'session' | 'permanent' | 'critical_only';
  memory_data: Record<string, any>;
  backup_location?: string;
  created_at: Date;
  restored_at?: Date;
  is_active: boolean;
}
