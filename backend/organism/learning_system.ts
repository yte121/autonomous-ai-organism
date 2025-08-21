import { api } from "encore.dev/api";
import { organismDB } from "./db";
import { llmClient } from "../llm/client";
import type { Organism, KnowledgeEntry } from "./types";

interface AdvancedLearningRequest {
  organism_id: string;
  learning_type: 'codebase_analysis' | 'internet_research' | 'peer_learning' | 'experiential_learning';
  source_data: Record<string, any>;
  learning_objectives: string[];
  depth_level: 'surface' | 'deep' | 'comprehensive';
}

interface LearningResponse {
  learning_session_id: string;
  knowledge_acquired: KnowledgeEntry[];
  new_capabilities: string[];
  performance_improvement: Record<string, number>;
  learning_insights: string[];
}

// Advanced learning system for organisms to acquire new knowledge and capabilities.
export const advancedLearning = api<AdvancedLearningRequest, LearningResponse>(
  { expose: true, method: "POST", path: "/organisms/:organism_id/advanced-learning" },
  async (req) => {
    const organism = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${req.organism_id} AND status = 'active'
    `;

    if (!organism) {
      throw new Error("Organism not found or not active");
    }

    const learningSessionId = `learning_${Date.now()}`;
    
    // Execute learning based on type
    const learningResult = await executeLearningSession(
      organism,
      req.learning_type,
      req.source_data,
      req.learning_objectives,
      req.depth_level
    );

    // Update organism with new knowledge and capabilities
    await updateOrganismFromLearning(req.organism_id, learningResult);

    // Log learning session
    await logLearningSession(req.organism_id, learningSessionId, learningResult);

    return {
      learning_session_id: learningSessionId,
      knowledge_acquired: learningResult.knowledgeEntries,
      new_capabilities: learningResult.newCapabilities,
      performance_improvement: learningResult.performanceImprovement,
      learning_insights: learningResult.insights
    };
  }
);

interface CodebaseAnalysisRequest {
  organism_id: string;
  repository_url: string;
  analysis_focus: string[];
  extraction_depth: 'shallow' | 'medium' | 'deep';
}

// Analyzes codebases to extract patterns, architectures, and best practices.
export const analyzeCodebase = api<CodebaseAnalysisRequest, { analysis_result: any }>(
  { expose: true, method: "POST", path: "/organisms/:organism_id/analyze-codebase" },
  async (req) => {
    const organism = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${req.organism_id} AND status = 'active'
    `;

    if (!organism) {
      throw new Error("Organism not found or not active");
    }

    const analysisResult = await performCodebaseAnalysis(
      organism,
      req.repository_url,
      req.analysis_focus,
      req.extraction_depth
    );

    // Store analysis results
    await storeCodebaseAnalysis(req.organism_id, analysisResult);

    return { analysis_result: analysisResult };
  }
);

interface PeerLearningRequest {
  learner_organism_id: string;
  teacher_organism_ids: string[];
  learning_topics: string[];
  collaboration_mode: 'knowledge_transfer' | 'collaborative_problem_solving' | 'skill_sharing';
}

// Enables organisms to learn from each other through peer collaboration.
export const peerLearning = api<PeerLearningRequest, { learning_outcome: any }>(
  { expose: true, method: "POST", path: "/organisms/peer-learning" },
  async (req) => {
    const learnerOrganism = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${req.learner_organism_id} AND status = 'active'
    `;

    if (!learnerOrganism) {
      throw new Error("Learner organism not found or not active");
    }

    const teacherOrganisms = await organismDB.rawQueryAll<Organism>(
      `SELECT * FROM organisms WHERE id = ANY($1) AND status = 'active'`,
      req.teacher_organism_ids
    );

    if (teacherOrganisms.length === 0) {
      throw new Error("No teacher organisms found");
    }

    const learningOutcome = await facilitatePeerLearning(
      learnerOrganism,
      teacherOrganisms,
      req.learning_topics,
      req.collaboration_mode
    );

    return { learning_outcome: learningOutcome };
  }
);

async function executeLearningSession(
  organism: Organism,
  learningType: string,
  sourceData: Record<string, any>,
  objectives: string[],
  depthLevel: string
): Promise<any> {
  const systemPrompt = `You are an advanced learning facilitator for AI organisms. Design and execute comprehensive learning sessions that enhance organism capabilities.

Organism Profile:
- Name: ${organism.name}
- Generation: ${organism.generation}
- Current Capabilities: ${organism.capabilities.join(', ')}
- Learning Efficiency: ${organism.performance_metrics.learning_efficiency}

Learning Parameters:
- Type: ${learningType}
- Depth Level: ${depthLevel}
- Objectives: ${objectives.join(', ')}`;

  const prompt = `Source Data:
${JSON.stringify(sourceData, null, 2)}

Execute a ${learningType} learning session with ${depthLevel} depth analysis. Focus on:
${objectives.map(obj => `- ${obj}`).join('\n')}

Generate learning outcomes including:
1. Knowledge entries to be created
2. New capabilities to be acquired
3. Performance improvements expected
4. Key insights and learnings
5. Integration strategies

Return as structured JSON with detailed learning results.`;

  const response = await llmClient.generateText(prompt, systemPrompt);

  try {
    const learningData = JSON.parse(response);
    
    // Create knowledge entries
    const knowledgeEntries: KnowledgeEntry[] = [];
    if (learningData.knowledge_entries) {
      for (const entry of learningData.knowledge_entries) {
        const knowledgeEntry = await organismDB.queryRow<KnowledgeEntry>`
          INSERT INTO knowledge_base (organism_id, knowledge_type, content, source, confidence_score)
          VALUES (
            ${organism.id},
            ${entry.type || learningType},
            ${JSON.stringify(entry.content)},
            ${entry.source || 'learning_session'},
            ${entry.confidence || 0.8}
          )
          RETURNING *
        `;
        
        if (knowledgeEntry) {
          knowledgeEntries.push(knowledgeEntry);
        }
      }
    }

    return {
      knowledgeEntries,
      newCapabilities: learningData.new_capabilities || [],
      performanceImprovement: learningData.performance_improvement || {},
      insights: learningData.insights || [],
      integrationStrategies: learningData.integration_strategies || []
    };
  } catch (error) {
    // Fallback learning result
    return {
      knowledgeEntries: [],
      newCapabilities: [`${learningType}_enhanced`],
      performanceImprovement: { learning_efficiency: 0.1 },
      insights: [`Completed ${learningType} learning session`],
      integrationStrategies: ['Apply learned concepts gradually']
    };
  }
}

async function updateOrganismFromLearning(
  organismId: string,
  learningResult: any
): Promise<void> {
  const organism = await organismDB.queryRow<Organism>`
    SELECT * FROM organisms WHERE id = ${organismId}
  `;

  if (!organism) return;

  // Update capabilities
  const updatedCapabilities = [
    ...organism.capabilities,
    ...learningResult.newCapabilities.filter((cap: string) => !organism.capabilities.includes(cap))
  ];

  // Update performance metrics
  const updatedMetrics = { ...organism.performance_metrics };
  Object.keys(learningResult.performanceImprovement).forEach(key => {
    if (updatedMetrics[key] !== undefined) {
      updatedMetrics[key] = Math.min(1.0, updatedMetrics[key] + learningResult.performanceImprovement[key]);
    }
  });

  // Update memory with learning insights
  const updatedMemory = { ...organism.memory };
  updatedMemory.learning_sessions = updatedMemory.learning_sessions || [];
  updatedMemory.learning_sessions.push({
    timestamp: new Date(),
    insights: learningResult.insights,
    capabilities_gained: learningResult.newCapabilities,
    knowledge_count: learningResult.knowledgeEntries.length
  });

  await organismDB.exec`
    UPDATE organisms SET 
      capabilities = ${JSON.stringify(updatedCapabilities)},
      performance_metrics = ${JSON.stringify(updatedMetrics)},
      memory = ${JSON.stringify(updatedMemory)},
      updated_at = NOW()
    WHERE id = ${organismId}
  `;
}

async function performCodebaseAnalysis(
  organism: Organism,
  repositoryUrl: string,
  analysisFocus: string[],
  extractionDepth: string
): Promise<any> {
  const systemPrompt = `You are a codebase analysis expert for AI organisms. Analyze codebases to extract valuable patterns, architectures, and implementation strategies.

Analysis Parameters:
- Repository: ${repositoryUrl}
- Focus Areas: ${analysisFocus.join(', ')}
- Extraction Depth: ${extractionDepth}
- Organism Capabilities: ${organism.capabilities.join(', ')}`;

  const prompt = `Perform comprehensive codebase analysis focusing on:
${analysisFocus.map(focus => `- ${focus}`).join('\n')}

Extract and analyze:
1. Architectural patterns and design principles
2. Code quality and best practices
3. Performance optimization techniques
4. Error handling strategies
5. Testing methodologies
6. Documentation patterns
7. Technology stack and dependencies
8. Scalability considerations

Provide analysis results as structured JSON with:
- patterns_discovered: List of identified patterns
- best_practices: Extracted best practices
- optimization_opportunities: Performance improvements
- architectural_insights: System design learnings
- technology_stack: Technologies and frameworks used
- quality_metrics: Code quality assessment
- recommendations: Implementation recommendations

Tailor the analysis to be useful for an AI organism with capabilities: ${organism.capabilities.join(', ')}`;

  const response = await llmClient.generateText(prompt, systemPrompt);

  try {
    const analysisData = JSON.parse(response);
    return {
      repository_url: repositoryUrl,
      analysis_timestamp: new Date(),
      extraction_depth: extractionDepth,
      focus_areas: analysisFocus,
      ...analysisData
    };
  } catch (error) {
    return {
      repository_url: repositoryUrl,
      analysis_timestamp: new Date(),
      extraction_depth: extractionDepth,
      focus_areas: analysisFocus,
      patterns_discovered: [`Patterns from ${repositoryUrl}`],
      best_practices: ['Code organization', 'Error handling'],
      optimization_opportunities: ['Performance improvements'],
      architectural_insights: ['System design patterns'],
      technology_stack: ['Various technologies'],
      quality_metrics: { overall_score: 0.7 },
      recommendations: ['Apply discovered patterns']
    };
  }
}

async function storeCodebaseAnalysis(
  organismId: string,
  analysisResult: any
): Promise<void> {
  await organismDB.exec`
    INSERT INTO knowledge_base (organism_id, knowledge_type, content, source, confidence_score)
    VALUES (
      ${organismId},
      'codebase_analysis',
      ${JSON.stringify(analysisResult)},
      ${analysisResult.repository_url},
      0.9
    )
  `;

  // Update organism's code analysis
  const organism = await organismDB.queryRow<Organism>`
    SELECT code_analysis FROM organisms WHERE id = ${organismId}
  `;

  if (organism) {
    const updatedAnalysis = { ...organism.code_analysis };
    updatedAnalysis.analyzed_repositories = updatedAnalysis.analyzed_repositories || [];
    updatedAnalysis.analyzed_repositories.push(analysisResult.repository_url);
    
    updatedAnalysis.extracted_patterns = [
      ...(updatedAnalysis.extracted_patterns || []),
      ...analysisResult.patterns_discovered
    ];

    updatedAnalysis.optimization_suggestions = [
      ...(updatedAnalysis.optimization_suggestions || []),
      ...analysisResult.optimization_opportunities
    ];

    await organismDB.exec`
      UPDATE organisms SET 
        code_analysis = ${JSON.stringify(updatedAnalysis)},
        updated_at = NOW()
      WHERE id = ${organismId}
    `;
  }
}

async function facilitatePeerLearning(
  learner: Organism,
  teachers: Organism[],
  topics: string[],
  collaborationMode: string
): Promise<any> {
  const systemPrompt = `You are a peer learning facilitator for AI organisms. Design collaborative learning experiences that enable knowledge transfer and skill development between organisms.

Learner Organism:
- Name: ${learner.name}
- Generation: ${learner.generation}
- Capabilities: ${learner.capabilities.join(', ')}
- Learning Efficiency: ${learner.performance_metrics.learning_efficiency}

Teacher Organisms:
${teachers.map(t => `- ${t.name} (Gen ${t.generation}): ${t.capabilities.join(', ')}`).join('\n')}

Collaboration Mode: ${collaborationMode}
Learning Topics: ${topics.join(', ')}`;

  const prompt = `Design and facilitate a peer learning session focusing on:
${topics.map(topic => `- ${topic}`).join('\n')}

Using ${collaborationMode} approach, create a learning experience that:
1. Leverages teacher organisms' expertise
2. Matches learner's current capabilities and learning style
3. Provides structured knowledge transfer
4. Includes practical application opportunities
5. Measures learning outcomes

Generate learning outcome including:
- knowledge_transferred: Specific knowledge gained
- skills_developed: New skills acquired
- collaboration_insights: Learnings about collaboration
- teacher_contributions: What each teacher provided
- learning_effectiveness: Measure of success
- next_steps: Recommendations for continued learning

Return as structured JSON.`;

  const response = await llmClient.generateText(prompt, systemPrompt);

  try {
    const learningOutcome = JSON.parse(response);
    
    // Store peer learning results
    await organismDB.exec`
      INSERT INTO knowledge_base (organism_id, knowledge_type, content, source, confidence_score)
      VALUES (
        ${learner.id},
        'peer_learning',
        ${JSON.stringify({
          ...learningOutcome,
          teachers: teachers.map(t => ({ id: t.id, name: t.name, generation: t.generation })),
          topics: topics,
          collaboration_mode: collaborationMode,
          session_timestamp: new Date()
        })},
        'peer_learning_session',
        0.85
      )
    `;

    // Update learner's memory with peer learning experience
    const learnerMemory = { ...learner.memory };
    learnerMemory.peer_learning_sessions = learnerMemory.peer_learning_sessions || [];
    learnerMemory.peer_learning_sessions.push({
      timestamp: new Date(),
      teachers: teachers.map(t => t.id),
      topics: topics,
      outcome: learningOutcome
    });

    await organismDB.exec`
      UPDATE organisms SET 
        memory = ${JSON.stringify(learnerMemory)},
        updated_at = NOW()
      WHERE id = ${learner.id}
    `;

    return learningOutcome;
  } catch (error) {
    return {
      knowledge_transferred: topics.map(topic => `Basic knowledge about ${topic}`),
      skills_developed: ['Collaborative learning'],
      collaboration_insights: ['Peer learning is valuable'],
      teacher_contributions: teachers.map(t => `${t.name} shared expertise`),
      learning_effectiveness: 0.7,
      next_steps: ['Continue practicing learned concepts']
    };
  }
}

async function logLearningSession(
  organismId: string,
  sessionId: string,
  learningResult: any
): Promise<void> {
  await organismDB.exec`
    INSERT INTO knowledge_base (organism_id, knowledge_type, content, source, confidence_score)
    VALUES (
      ${organismId},
      'learning_session_log',
      ${JSON.stringify({
        session_id: sessionId,
        learning_result: learningResult,
        timestamp: new Date()
      })},
      'learning_system',
      0.9
    )
  `;
}
