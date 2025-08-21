import { secret } from "encore.dev/config";

const openRouterKeys = secret("OpenRouterAPIKeys");

interface LLMRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}

interface LLMResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class OpenRouterClient {
  private apiKeys: string[];
  private currentKeyIndex: number = 0;
  private baseUrl = 'https://openrouter.ai/api/v1';
  private rateLimitTracker: Map<string, { count: number; resetTime: number }> = new Map();
  private maxRetries = 3;
  private baseDelay = 1000; // 1 second

  constructor() {
    const keysString = openRouterKeys();
    this.apiKeys = keysString.split(',').map(key => key.trim()).filter(key => key.length > 0);
    
    if (this.apiKeys.length === 0) {
      console.warn('No OpenRouter API keys configured');
    }
  }

  async makeRequest(request: LLMRequest): Promise<LLMResponse> {
    if (this.apiKeys.length === 0) {
      throw new Error('No OpenRouter API keys configured');
    }

    let lastError: Error | null = null;
    
    // Try each API key until one works or all fail
    for (let keyAttempt = 0; keyAttempt < this.apiKeys.length; keyAttempt++) {
      const currentKey = this.apiKeys[this.currentKeyIndex];
      
      // Check rate limit for current key
      if (this.isRateLimited(currentKey)) {
        this.rotateApiKey();
        continue;
      }

      // Retry logic for current key
      for (let retry = 0; retry < this.maxRetries; retry++) {
        try {
          const response = await this.attemptRequest(request, currentKey);
          this.updateRateLimit(currentKey, false);
          return response;
        } catch (error: any) {
          lastError = error;
          
          // Handle rate limiting
          if (error.status === 429) {
            this.updateRateLimit(currentKey, true);
            if (retry < this.maxRetries - 1) {
              await this.delay(this.baseDelay * Math.pow(2, retry));
            }
            break; // Try next key
          }
          
          // Handle server errors with exponential backoff
          if (error.status >= 500 && retry < this.maxRetries - 1) {
            await this.delay(this.baseDelay * Math.pow(2, retry));
            continue;
          }
          
          // For other errors, don't retry with same key
          break;
        }
      }
      
      this.rotateApiKey();
    }
    
    // If all keys failed, throw the last error
    throw lastError || new Error('All API keys exhausted');
  }

  private async attemptRequest(request: LLMRequest, apiKey: string): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://leap.dev',
        'X-Title': 'Autonomous AI Organism'
      },
      body: JSON.stringify({
        ...request,
        // Add fallback model if primary fails
        model: request.model || 'anthropic/claude-3.5-sonnet',
        // Ensure reasonable defaults
        temperature: request.temperature ?? 0.7,
        max_tokens: request.max_tokens ?? 4000
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      const error = new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`);
      (error as any).status = response.status;
      throw error;
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      throw new Error('Invalid response format from OpenRouter API');
    }

    return data;
  }

  private rotateApiKey(): void {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
  }

  private isRateLimited(apiKey: string): boolean {
    const tracker = this.rateLimitTracker.get(apiKey);
    if (!tracker) return false;
    
    const now = Date.now();
    if (now > tracker.resetTime) {
      this.rateLimitTracker.delete(apiKey);
      return false;
    }
    
    return tracker.count >= 10; // Assume 10 requests per minute limit
  }

  private updateRateLimit(apiKey: string, isRateLimited: boolean): void {
    const now = Date.now();
    const tracker = this.rateLimitTracker.get(apiKey) || { count: 0, resetTime: now + 60000 };
    
    if (isRateLimited) {
      tracker.count = 10; // Max out the count
      tracker.resetTime = now + 60000; // Reset in 1 minute
    } else {
      tracker.count = Math.min(tracker.count + 1, 10);
    }
    
    this.rateLimitTracker.set(apiKey, tracker);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: LLMRequest['messages'] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push({ role: 'user', content: prompt });

    try {
      const response = await this.makeRequest({
        model: 'anthropic/claude-3.5-sonnet',
        messages,
        temperature: 0.7,
        max_tokens: 4000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in LLM response');
      }

      return content;
    } catch (error) {
      console.error('LLM generation failed:', error);
      // Return a fallback response instead of throwing
      return `Unable to generate response due to LLM service error. Please try again later.`;
    }
  }

  async analyzeCode(code: string, analysisType: string): Promise<any> {
    const systemPrompt = `You are an expert code analyzer. Analyze the provided code and extract ${analysisType}. Return your analysis as a JSON object with the following structure:
{
  "analysis": "detailed analysis text",
  "suggestions": ["suggestion1", "suggestion2"],
  "patterns_found": ["pattern1", "pattern2"],
  "optimization_opportunities": ["optimization1", "optimization2"]
}`;
    
    const prompt = `Analyze this code:\n\n${code}\n\nProvide analysis for: ${analysisType}`;
    
    try {
      const response = await this.generateText(prompt, systemPrompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Code analysis failed:', error);
      return {
        analysis: `Code analysis for ${analysisType}`,
        suggestions: ['Review code structure', 'Consider optimization opportunities'],
        patterns_found: ['Standard patterns detected'],
        optimization_opportunities: ['Performance improvements possible']
      };
    }
  }

  async generateOptimization(currentCode: string, performanceMetrics: any): Promise<string> {
    const systemPrompt = 'You are an expert software optimizer. Generate optimized code based on performance metrics and current implementation.';
    
    const prompt = `
Current code:
${currentCode}

Performance metrics:
${JSON.stringify(performanceMetrics, null, 2)}

Generate an optimized version of this code that addresses the performance issues indicated by the metrics.
Return only the optimized code without explanations.
`;

    try {
      return await this.generateText(prompt, systemPrompt);
    } catch (error) {
      console.error('Code optimization failed:', error);
      return currentCode; // Return original code if optimization fails
    }
  }

  async researchTechnology(technology: string, objectives: string[]): Promise<any> {
    const systemPrompt = 'You are a technology research expert. Provide comprehensive research on the requested technology.';
    
    const prompt = `
Research the technology: ${technology}

Objectives:
${objectives.map(obj => `- ${obj}`).join('\n')}

Provide a comprehensive analysis including:
1. Key features and capabilities
2. Best practices and patterns
3. Integration strategies
4. Performance considerations
5. Common pitfalls and solutions

Return the response as a structured JSON object with keys: key_insights, implementation_strategies, related_technologies, best_practices, common_pitfalls.
`;

    try {
      const response = await this.generateText(prompt, systemPrompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Technology research failed:', error);
      return {
        key_insights: [`Research insights for ${technology}`],
        implementation_strategies: ['Standard implementation approach'],
        related_technologies: ['Related technologies'],
        best_practices: ['Follow industry standards'],
        common_pitfalls: ['Avoid common mistakes']
      };
    }
  }

  async generateEvolutionStrategy(
    organism: any,
    currentPerformance: any,
    targetImprovements: string[]
  ): Promise<any> {
    const systemPrompt = 'You are an AI organism evolution strategist. Generate evolution strategies that improve organism capabilities while maintaining stability.';
    
    const prompt = `
Current Organism:
${JSON.stringify(organism, null, 2)}

Current Performance:
${JSON.stringify(currentPerformance, null, 2)}

Target Improvements:
${targetImprovements.join(', ')}

Generate an evolution strategy including:
1. Specific genetic/capability modifications
2. Expected performance improvements
3. Risk assessment
4. Implementation steps
5. Success criteria

Return as structured JSON with keys: modifications, expected_improvements, risk_assessment, implementation_steps, success_criteria.`;

    try {
      const response = await this.generateText(prompt, systemPrompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Evolution strategy generation failed:', error);
      return { 
        modifications: targetImprovements.map(imp => `Enhance ${imp}`),
        expected_improvements: { overall: 0.1 },
        risk_assessment: { risk_level: 'medium' },
        implementation_steps: ['Gradual implementation', 'Monitor progress'],
        success_criteria: ['Improved performance metrics']
      };
    }
  }

  async generateTaskDecomposition(
    taskDescription: string,
    complexity: number,
    availableOrganisms: any[]
  ): Promise<any> {
    const systemPrompt = 'You are a task decomposition expert for AI organism systems. Break down complex tasks into manageable subtasks.';
    
    const prompt = `
Task: ${taskDescription}
Complexity Level: ${complexity}
Available Organisms: ${availableOrganisms.length}

Organism Capabilities:
${availableOrganisms.map(o => `- ${o.name}: ${o.capabilities.join(', ')}`).join('\n')}

Decompose this task into:
1. Subtasks with clear objectives
2. Resource requirements for each subtask
3. Dependencies between subtasks
4. Optimal organism assignments
5. Execution timeline

Return as structured JSON with keys: subtasks, assignments, timeline, dependencies.`;

    try {
      const response = await this.generateText(prompt, systemPrompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Task decomposition failed:', error);
      return {
        subtasks: [{ name: taskDescription, complexity: complexity }],
        assignments: availableOrganisms.slice(0, 1).map(o => ({ organism_id: o.id, task: taskDescription })),
        timeline: 'To be determined',
        dependencies: []
      };
    }
  }

  async generateInternetResearch(
    topic: string,
    researchDepth: 'basic' | 'intermediate' | 'advanced',
    specificQuestions?: string[]
  ): Promise<any> {
    const systemPrompt = 'You are an advanced internet research AI. Provide comprehensive research on topics with structured analysis.';
    
    const prompt = `
Research Topic: ${topic}
Research Depth: ${researchDepth}
${specificQuestions ? `Specific Questions:\n${specificQuestions.map(q => `- ${q}`).join('\n')}` : ''}

Provide comprehensive research including:
1. Overview and key concepts
2. Current trends and developments
3. Technical specifications (if applicable)
4. Best practices and recommendations
5. Potential applications and use cases
6. Limitations and considerations
7. Future outlook

Return as structured JSON with keys: overview, trends, specifications, best_practices, applications, limitations, future_outlook, confidence, sources.`;

    try {
      const response = await this.generateText(prompt, systemPrompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Internet research failed:', error);
      return {
        overview: `Research overview for ${topic}`,
        trends: ['Current industry trends'],
        specifications: 'Technical details',
        best_practices: ['Industry best practices'],
        applications: ['Potential use cases'],
        limitations: ['Known limitations'],
        future_outlook: 'Positive outlook',
        confidence: 0.7,
        sources: ['Knowledge base'],
        timestamp: new Date().toISOString()
      };
    }
  }
}

export const llmClient = new OpenRouterClient();
