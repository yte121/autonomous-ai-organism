import { api } from "encore.dev/api";
import { organismDB } from "./db";
import { llmClient } from "../llm/client";
import { sendMessage } from "../communicate";
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
  // <PROMPT-START:learningSession>
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
  // <PROMPT-END:learningSession>

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
  // <PROMPT-START:codebaseAnalysis>
  const systemPrompt = `You are a codebase analysis expert for AI organisms. Analyze codebases to extract valuable patterns, architectures, and implementation strategies.

Analysis Parameters:
- Repository: ${repositoryUrl}
- Focus Areas: ${analysisFocus.join(', ')}
- Extraction Depth: ${extractionDepth}
- Organism Capabilities: ${organism.capabilities.join(', ')}`;
  // <PROMPT-END:codebaseAnalysis>

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
  // 1. Generate a learning plan and initial questions
  // <PROMPT-START:peerLearningPlan>
  const planSystemPrompt = "You are a learning facilitator.";
  // <PROMPT-END:peerLearningPlan>
  const planPrompt = `You are a Socratic dialogue facilitator for an AI organism. The learner, ${learner.name}, wants to learn about: ${topics.join(', ')}. The teachers are ${teachers.map(t => t.name).join(', ')}. Create a short learning plan and generate 3 good, open-ended initial questions for the learner to ask. Return as JSON: { "learning_plan": string, "questions": string[] }`;
  const planResponse = await llmClient.generateText(planPrompt, planSystemPrompt);
  const plan = JSON.parse(planResponse);
  let questionsToAsk = plan.questions || [`Can you give me an overview of ${topics[0]}?`];

  // 2. Set up the dialogue state
  const dialogueHistory: string[] = [`Learning Plan: ${plan.learning_plan}`];
  const MAX_TURNS = 3;

  // 3. Run the turn-based dialogue loop
  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    // 3a. Learner asks a question
    const currentQuestion = questionsToAsk.shift() || `Can you elaborate on the last point?`;
    dialogueHistory.push(`[Turn ${turn}] ${learner.name} asks: ${currentQuestion}`);
    await sendMessage({ sender_id: learner.id, is_broadcast: true, message_type: 'peer_learning_question', content: { question: currentQuestion, learning_topics: topics } });

    // 3b. Teachers answer in parallel
    const answerPromises = teachers.map(teacher => {
      // <PROMPT-START:peerLearningTeacher>
      const teacherSystemPrompt = `You are the helpful teacher AI, ${teacher.name}.`;
      // <PROMPT-END:peerLearningTeacher>
      const teacherPrompt = `You are the AI organism ${teacher.name}. A peer, ${learner.name}, has asked you the following question about ${topics.join(', ')}: "${currentQuestion}". Based on your expertise, provide a clear and helpful answer.`;
      return llmClient.generateText(teacherPrompt, teacherSystemPrompt);
    });
    const answers = await Promise.all(answerPromises);

    // 3c. Log answers
    for (let i = 0; i < teachers.length; i++) {
      const teacher = teachers[i];
      const answer = answers[i];
      dialogueHistory.push(`[Turn ${turn}] ${teacher.name} answers: ${answer}`);
      await sendMessage({ sender_id: teacher.id, receiver_id: learner.id, message_type: 'peer_learning_answer', content: { question: currentQuestion, answer: answer } });
    }

    // 3d. Generate a follow-up question
    // <PROMPT-START:peerLearningLearnerFollowup>
    const followupSystemPrompt = `You are the curious learner AI, ${learner.name}.`;
    // <PROMPT-END:peerLearningLearnerFollowup>
    const followUpPrompt = `You are the learner AI, ${learner.name}. Based on the latest answers, what is your single most important follow-up question? The topic is ${topics.join(', ')}. Recent conversation:\n${dialogueHistory.slice(-teachers.length - 1).join('\n')}`;
    const nextQuestion = await llmClient.generateText(followUpPrompt, followupSystemPrompt);
    questionsToAsk.push(nextQuestion);
  }

  // 4. Synthesize the dialogue into a new KnowledgeEntry
  // <PROMPT-START:peerLearningSynthesis>
  const synthesisSystemPrompt = "You are a Knowledge Synthesizer.";
  // <PROMPT-END:peerLearningSynthesis>
  const synthesisPrompt = `You are a Knowledge Synthesizer. A learner AI has just completed a Socratic dialogue with several teachers. Your job is to analyze the entire transcript and distill the key learnings into a structured knowledge entry.

Learning Topics: ${topics.join(', ')}

Dialogue Transcript:
${dialogueHistory.join('\n')}

Based on the transcript, extract the most important information. Return a single JSON object with keys: "key_learnings" (an array of strings), "unanswered_questions" (an array of strings), and "confidence_score" (a number between 0 and 1).`;

  const synthesisResponse = await llmClient.generateText(synthesisPrompt, synthesisSystemPrompt);
  const synthesizedKnowledge = JSON.parse(synthesisResponse);

  // 5. Integrate the new knowledge
  const newKnowledgeEntry = {
    id: '', // DB will generate
    organism_id: learner.id,
    knowledge_type: 'peer_learning_summary',
    content: {
      topics: topics,
      dialogue: dialogueHistory,
      ...synthesizedKnowledge
    },
    source: `peer_learning_session_with_${teachers.map(t => t.name).join('_')}`,
    confidence_score: synthesizedKnowledge.confidence_score || 0.8,
    created_at: new Date(),
    updated_at: new Date()
  };

  await organismDB.exec`
    INSERT INTO knowledge_base (organism_id, knowledge_type, content, source, confidence_score)
    VALUES (
      ${newKnowledgeEntry.organism_id},
      ${newKnowledgeEntry.knowledge_type},
      ${JSON.stringify(newKnowledgeEntry.content)},
      ${newKnowledgeEntry.source},
      ${newKnowledgeEntry.confidence_score}
    )
  `;

  // Also update the learner's memory
  const learnerMemory = { ...learner.memory };
  learnerMemory.peer_learning_sessions = learnerMemory.peer_learning_sessions || [];
  learnerMemory.peer_learning_sessions.push({
    timestamp: new Date(),
    teachers: teachers.map(t => t.id),
    topics: topics,
    outcome: newKnowledgeEntry.content
  });
  await organismDB.exec`
    UPDATE organisms SET memory = ${JSON.stringify(learnerMemory)} WHERE id = ${learner.id}
  `;

  return newKnowledgeEntry;
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
