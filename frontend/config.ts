// OpenRouter API configuration
// The OpenRouter API keys are now configured in the backend
export const openRouterApiKeys = "";

// Application configuration
export const appConfig = {
  // Maximum number of organisms that can be active simultaneously
  maxActiveOrganisms: 100,
  
  // Default evolution triggers
  defaultEvolutionTriggers: [
    'performance_optimization',
    'capability_enhancement',
    'error_recovery_improvement',
    'learning_efficiency_boost',
    'autonomous_operation_enhancement'
  ],
  
  // Task complexity thresholds for auto-merging
  complexityThresholds: {
    simple: 3,
    medium: 6,
    complex: 10
  },
  
  // Auto-cleanup settings
  cleanup: {
    deprecatedOrganismRetentionHours: 24,
    completedTaskRetentionDays: 30
  },
  
  // Autonomous operation settings
  autonomous: {
    maxConcurrentOperations: 10,
    safetyValidationLevel: 'comprehensive',
    defaultPriority: 'medium',
    autoReplicationThreshold: 0.8
  },
  
  // RAG 3.0 configuration
  rag: {
    maxContextLength: 10000,
    defaultConfidenceThreshold: 0.5,
    semanticSearchLimit: 20,
    knowledgeChunkSize: 500
  },
  
  // Computer operation safety constraints
  computerOperations: {
    allowedOperations: [
      'file_system',
      'network',
      'process',
      'system_info',
      'automation'
    ],
    safetyConstraints: [
      'no_system_modification',
      'read_only_access',
      'sandboxed_execution'
    ]
  }
};
