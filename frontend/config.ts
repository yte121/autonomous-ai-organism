// OpenRouter API configuration
// TODO: Set your OpenRouter API keys (comma-separated) in the Infrastructure tab
export const openRouterApiKeys = "";

// Application configuration
export const appConfig = {
  // Maximum number of organisms that can be active simultaneously
  maxActiveOrganisms: 50,
  
  // Default evolution triggers
  defaultEvolutionTriggers: [
    'performance_optimization',
    'capability_enhancement',
    'error_recovery_improvement'
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
  }
};
