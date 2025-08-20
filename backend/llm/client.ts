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

  constructor() {
    const keysString = openRouterKeys();
    this.apiKeys = keysString.split(',').map(key => key.trim()).filter(key => key.length > 0);
  }

  async makeRequest(request: LLMRequest): Promise<LLMResponse> {
    let lastError: Error | null = null;
    
    // Try each API key until one works or all fail
    for (let attempt = 0; attempt < this.apiKeys.length; attempt++) {
      try {
        const response = await this.attemptRequest(request);
        return response;
      } catch (error: any) {
        lastError = error;
        
        // If rate limited (429), try next key
        if (error.status === 429) {
          this.rotateApiKey();
          continue;
        }
        
        // For other errors, throw immediately
        throw error;
      }
    }
    
    // If all keys failed, throw the last error
    throw lastError || new Error('All API keys exhausted');
  }

  private async attemptRequest(request: LLMRequest): Promise<LLMResponse> {
    const currentKey = this.apiKeys[this.currentKeyIndex];
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://leap.dev',
        'X-Title': 'Autonomous AI Organism'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = new Error(`OpenRouter API error: ${response.statusText}`);
      (error as any).status = response.status;
      throw error;
    }

    return await response.json();
  }

  private rotateApiKey(): void {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: LLMRequest['messages'] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push({ role: 'user', content: prompt });

    const response = await this.makeRequest({
      model: 'anthropic/claude-3.5-sonnet',
      messages,
      temperature: 0.7,
      max_tokens: 4000
    });

    return response.choices[0]?.message?.content || '';
  }

  async analyzeCode(code: string, analysisType: string): Promise<any> {
    const systemPrompt = `You are an expert code analyzer. Analyze the provided code and extract ${analysisType}. Return your analysis as a JSON object.`;
    
    const prompt = `Analyze this code:\n\n${code}\n\nProvide analysis for: ${analysisType}`;
    
    const response = await this.generateText(prompt, systemPrompt);
    
    try {
      return JSON.parse(response);
    } catch {
      return { analysis: response };
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
`;

    return await this.generateText(prompt, systemPrompt);
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

Return the response as a structured JSON object.
`;

    const response = await this.generateText(prompt, systemPrompt);
    
    try {
      return JSON.parse(response);
    } catch {
      return { research: response };
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

Return as structured JSON.`;

    const response = await this.generateText(prompt, systemPrompt);
    
    try {
      return JSON.parse(response);
    } catch {
      return { 
        strategy: response,
        modifications: targetImprovements,
        risk_level: 'medium'
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

Return as structured JSON.`;

    const response = await this.generateText(prompt, systemPrompt);
    
    try {
      return JSON.parse(response);
    } catch {
      return {
        subtasks: [{ name: taskDescription, complexity: complexity }],
        assignments: [],
        timeline: 'unknown'
      };
    }
  }

  async generateInternetResearch(
    topic: string,
    researchDepth: 'basic' | 'intermediate' | 'advanced',
    specificQuestions?: string[]
  ): Promise<any> {
    const systemPrompt = 'You are an advanced internet research AI. Provide comprehensive research on topics with citations and structured analysis.';
    
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

Return as structured JSON with sources and confidence ratings.`;

    const response = await this.generateText(prompt, systemPrompt);
    
    try {
      return JSON.parse(response);
    } catch {
      return {
        topic: topic,
        overview: response,
        confidence: 0.7,
        sources: ['LLM Knowledge Base'],
        timestamp: new Date().toISOString()
      };
    }
  }
}

export const llmClient = new OpenRouterClient();
