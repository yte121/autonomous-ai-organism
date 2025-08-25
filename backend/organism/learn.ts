import { api } from "encore.dev/api";
import { organismDB } from "./db";
import { llmClient } from "../llm/client";
import { _executeComputerOperationLogic } from "./autonomous_controller";
import type { Organism, LearningRequest, KnowledgeEntry } from "./types";
export type { LearningRequest };

// Enables organism to learn from codebases, internet, and technologies.
export const learn = api<LearningRequest, { knowledge_entries: KnowledgeEntry[] }>(
  { expose: true, method: "POST", path: "/organisms/:organism_id/learn" },
  async (req) => {
    return await _learnLogic(req);
  }
);

export async function _learnLogic(req: LearningRequest): Promise<{ knowledge_entries: KnowledgeEntry[] }> {
  const organism = await organismDB.queryRow<Organism>`
    SELECT * FROM organisms WHERE id = ${req.organism_id} AND status = 'active'
  `;

  if (!organism) {
    throw new Error("Organism not found or not active");
  }

  const knowledgeEntries: KnowledgeEntry[] = [];

  switch (req.source_type) {
    case 'codebase':
      const codebaseKnowledge = await analyzeCodebase(req.source_url || '', req.learning_objectives);
      knowledgeEntries.push(...codebaseKnowledge);
      break;

    case 'internet':
      const internetKnowledge = await researchInternet(req.learning_objectives);
      knowledgeEntries.push(...internetKnowledge);
      break;

    case 'technology_docs':
      const techKnowledge = await analyzeTechnologyDocs(req.source_url || '', req.learning_objectives);
      knowledgeEntries.push(...techKnowledge);
      break;
  }

  // Store knowledge entries
  for (const entry of knowledgeEntries) {
    await organismDB.exec`
      INSERT INTO knowledge_base (organism_id, knowledge_type, content, source, confidence_score)
      VALUES (
        ${req.organism_id},
        ${entry.knowledge_type},
        ${JSON.stringify(entry.content)},
        ${entry.source},
        ${entry.confidence_score}
      )
    `;
  }

  // Update organism's learned technologies and capabilities
  await updateOrganismLearning(req.organism_id, knowledgeEntries);

  return { knowledge_entries: knowledgeEntries };
}

async function analyzeCodebase(sourceUrl: string, objectives: string[]): Promise<KnowledgeEntry[]> {
  if (!sourceUrl || !sourceUrl.startsWith('https://')) {
    throw new Error("A valid Git repository URL is required for codebase analysis.");
  }

  const repoName = sourceUrl.split('/').pop()?.replace('.git', '') || `repo-${Date.now()}`;
  const tempDir = `cloned/${repoName}`;
  const fullTempPath = `organism_sandbox/${tempDir}`;

  try {
    // 1. Clone the repository
    await _executeComputerOperationLogic('process', {
      command: `git clone ${sourceUrl} ${tempDir}`
    });

    // 2. List files in the repository
    const lsResult = await _executeComputerOperationLogic('process', {
      command: `ls -F ${tempDir}`
    });
    const files = (lsResult.stdout || '').split('\n').filter(f => f && !f.endsWith('/')); // Exclude directories

    // 3. Select a few key files to analyze
    const keyFileIdentifiers = ['package.json', 'requirements.txt', 'main.', 'index.', 'app.', 'server.'];
    const filesToRead = files
      .filter(file => keyFileIdentifiers.some(id => file.includes(id)))
      .slice(0, 5); // Limit to max 5 files to keep context manageable

    if (filesToRead.length === 0 && files.length > 0) {
      // If no key files found, take the first few files
      filesToRead.push(...files.slice(0, 3));
    }

    // 4. Read the content of the selected files
    let combinedCode = '';
    for (const file of filesToRead) {
      const filePath = `${tempDir}/${file}`;
      const content = await _executeComputerOperationLogic('file_system', {
        action: 'readFile',
        path: filePath
      });
      combinedCode += `\n\n--- File: ${file} ---\n\n${content}`;
    }

    if (combinedCode.trim() === '') {
      throw new Error("Could not read any files from the repository.");
    }

    // 5. Analyze the code using the LLM
    const analysisPrompt = `Analyze the following code from the repository '${sourceUrl}'. Focus on these objectives: ${objectives.join(', ')}.`;
    const analysis = await llmClient.analyzeCode(analysisPrompt + combinedCode, objectives.join(', '));

    // 6. Format the analysis into a KnowledgeEntry
    const knowledgeContent = {
      repository: sourceUrl,
      files_analyzed: filesToRead,
      analysis: analysis.analysis,
      suggestions: analysis.suggestions,
      patterns_found: analysis.patterns_found,
      optimization_opportunities: analysis.optimization_opportunities
    };

    return [{
      id: '',
      organism_id: '',
      knowledge_type: 'codebase_analysis',
      content: knowledgeContent,
      source: sourceUrl,
      confidence_score: 0.85,
      created_at: new Date(),
      updated_at: new Date()
    }];

  } finally {
    // 7. Clean up the cloned repository
    await _executeComputerOperationLogic('process', {
      command: `rm -rf ${tempDir}`
    });
  }
}

async function researchInternet(objectives: string[]): Promise<KnowledgeEntry[]> {
  const entries: KnowledgeEntry[] = [];
  
  for (const objective of objectives) {
    // Use the llmClient to perform research.
    // We can use 'intermediate' as a good default depth for autonomous research.
    const researchData = await llmClient.generateInternetResearch(objective, 'intermediate');

    // The llmClient returns a structured object. We need to format it
    // into the KnowledgeEntry format that the 'learn' function expects.
    const content = {
      topic: objective,
      research_summary: researchData.overview,
      key_insights: researchData.trends,
      related_technologies: researchData.related_technologies,
      implementation_strategies: researchData.best_practices,
      applications: researchData.applications,
      limitations: researchData.limitations,
      future_outlook: researchData.future_outlook
    };

    entries.push({
      id: '', // Will be generated by DB
      organism_id: '', // Will be assigned by the caller
      knowledge_type: 'internet_research',
      content: content,
      source: researchData.sources.join(', ') || 'internet_research',
      confidence_score: researchData.confidence || 0.75,
      created_at: new Date(researchData.timestamp || Date.now()),
      updated_at: new Date(researchData.timestamp || Date.now())
    });
  }

  return entries;
}

async function analyzeTechnologyDocs(sourceUrl: string, objectives: string[]): Promise<KnowledgeEntry[]> {
  const entries: KnowledgeEntry[] = [];
  
  // Simulate technology documentation analysis
  for (const objective of objectives) {
    entries.push({
      id: '',
      organism_id: '',
      knowledge_type: 'technology_pattern',
      content: {
        technology: objective,
        documentation_summary: `Documentation analysis for ${objective}`,
        api_patterns: [`API pattern for ${objective}`],
        usage_examples: [`Usage example for ${objective}`],
        optimization_tips: [`Optimization tip for ${objective}`]
      },
      source: sourceUrl,
      confidence_score: 0.9,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  return entries;
}

async function updateOrganismLearning(organismId: string, knowledgeEntries: KnowledgeEntry[]): Promise<void> {
  const organism = await organismDB.queryRow<Organism>`
    SELECT * FROM organisms WHERE id = ${organismId}
  `;

  if (!organism) return;

  const newTechnologies = new Set(organism.learned_technologies);
  const newCapabilities = new Set(organism.capabilities);
  const updatedAnalysis = { ...organism.code_analysis };

  // Extract new technologies and capabilities from knowledge
  knowledgeEntries.forEach(entry => {
    if (entry.knowledge_type === 'technology_pattern') {
      newTechnologies.add(entry.content.technology);
      newCapabilities.add(`${entry.content.technology}_integration`);
    }
    
    if (entry.knowledge_type === 'codebase_analysis') {
      updatedAnalysis.extracted_patterns = updatedAnalysis.extracted_patterns || [];
      updatedAnalysis.extracted_patterns.push(entry.content.pattern_type);
      newCapabilities.add(`${entry.content.pattern_type}_implementation`);
    }
  });

  // Update learning efficiency
  const updatedMetrics = { ...organism.performance_metrics };
  updatedMetrics.learning_efficiency = Math.min(1.0, updatedMetrics.learning_efficiency + 0.1);

  await organismDB.exec`
    UPDATE organisms SET 
      learned_technologies = ${JSON.stringify(Array.from(newTechnologies))},
      capabilities = ${JSON.stringify(Array.from(newCapabilities))},
      code_analysis = ${JSON.stringify(updatedAnalysis)},
      performance_metrics = ${JSON.stringify(updatedMetrics)},
      updated_at = NOW()
    WHERE id = ${organismId}
  `;
}
