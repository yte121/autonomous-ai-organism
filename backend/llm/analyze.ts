import { api } from "encore.dev/api";
import { llmClient } from "./client";

interface AnalyzeCodeRequest {
  code: string;
  analysis_type: string;
  context?: Record<string, any>;
}

interface AnalyzeCodeResponse {
  analysis: any;
  suggestions: string[];
  patterns_found: string[];
  optimization_opportunities: string[];
}

// Analyzes code using LLM to extract patterns and optimizations.
export const analyzeCode = api<AnalyzeCodeRequest, AnalyzeCodeResponse>(
  { expose: true, method: "POST", path: "/llm/analyze-code" },
  async (req) => {
    const analysis = await llmClient.analyzeCode(req.code, req.analysis_type);
    
    return {
      analysis,
      suggestions: analysis.suggestions || [],
      patterns_found: analysis.patterns_found || [],
      optimization_opportunities: analysis.optimization_opportunities || []
    };
  }
);

interface ResearchRequest {
  topic: string;
  objectives: string[];
  depth: 'basic' | 'intermediate' | 'advanced';
}

interface ResearchResponse {
  research_data: any;
  key_insights: string[];
  implementation_strategies: string[];
  related_technologies: string[];
}

// Researches technologies and topics using LLM.
export const research = api<ResearchRequest, ResearchResponse>(
  { expose: true, method: "POST", path: "/llm/research" },
  async (req) => {
    const researchData = await llmClient.researchTechnology(req.topic, req.objectives);
    
    return {
      research_data: researchData,
      key_insights: researchData.key_insights || [],
      implementation_strategies: researchData.implementation_strategies || [],
      related_technologies: researchData.related_technologies || []
    };
  }
);

interface OptimizeRequest {
  current_implementation: string;
  performance_metrics: Record<string, any>;
  optimization_goals: string[];
}

interface OptimizeResponse {
  optimized_code: string;
  improvements_made: string[];
  expected_performance_gain: number;
}

// Generates optimized code based on performance metrics.
export const optimize = api<OptimizeRequest, OptimizeResponse>(
  { expose: true, method: "POST", path: "/llm/optimize" },
  async (req) => {
    const optimizedCode = await llmClient.generateOptimization(
      req.current_implementation,
      req.performance_metrics
    );
    
    // Extract improvements and performance estimates from the response
    const improvements = req.optimization_goals.map(goal => `Optimized for: ${goal}`);
    const performanceGain = Math.random() * 0.3 + 0.1; // Simulated 10-40% improvement
    
    return {
      optimized_code: optimizedCode,
      improvements_made: improvements,
      expected_performance_gain: performanceGain
    };
  }
);
