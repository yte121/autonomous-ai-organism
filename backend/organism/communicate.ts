import { api } from "encore.dev/api";
import { organismDB } from "./db";
import type { Communication, CommunicationType } from "./types";

interface SendMessageRequest {
  sender_id: string;
  receiver_id?: string;
  message_type: CommunicationType;
  content: Record<string, any>;
  is_broadcast?: boolean;
}

// Sends a message between organisms or broadcasts to all.
export const sendMessage = api<SendMessageRequest, Communication>(
  { expose: true, method: "POST", path: "/communications" },
  async (req) => {
    const communication = await organismDB.queryRow<Communication>`
      INSERT INTO communications (sender_id, receiver_id, message_type, content, is_broadcast)
      VALUES (
        ${req.sender_id},
        ${req.receiver_id || null},
        ${req.message_type},
        ${JSON.stringify(req.content)},
        ${req.is_broadcast || false}
      )
      RETURNING *
    `;

    if (!communication) {
      throw new Error("Failed to send message");
    }

    // Process message based on type
    await processMessage(communication);

    return communication;
  }
);

// Retrieves messages for a specific organism.
export const getMessages = api<{ organism_id: string }, { messages: Communication[] }>(
  { expose: true, method: "GET", path: "/organisms/:organism_id/messages" },
  async (req) => {
    const messages = await organismDB.rawQueryAll<Communication>(
      `SELECT * FROM communications 
       WHERE receiver_id = $1 OR (is_broadcast = true AND sender_id != $1)
       ORDER BY created_at DESC
       LIMIT 100`,
      req.organism_id
    );

    return { messages };
  }
);

async function processMessage(communication: Communication): Promise<void> {
  switch (communication.message_type) {
    case 'knowledge_share':
      await handleKnowledgeShare(communication);
      break;
    
    case 'evolution_proposal':
      await handleEvolutionProposal(communication);
      break;
    
    case 'merge_request':
      await handleMergeRequest(communication);
      break;
    
    case 'error_report':
      await handleErrorReport(communication);
      break;
    
    case 'task_assignment':
      await handleTaskAssignment(communication);
      break;
    
    case 'status_update':
      await handleStatusUpdate(communication);
      break;
  }
}

async function handleKnowledgeShare(communication: Communication): Promise<void> {
  const { knowledge_data } = communication.content;
  
  if (communication.is_broadcast) {
    // Share knowledge with all active organisms
    const activeOrganisms = await organismDB.queryAll<{ id: string }>`
      SELECT id FROM organisms WHERE status = 'active' AND id != ${communication.sender_id}
    `;

    for (const organism of activeOrganisms) {
      await organismDB.exec`
        INSERT INTO knowledge_base (organism_id, knowledge_type, content, source, confidence_score)
        VALUES (
          ${organism.id},
          'shared_knowledge',
          ${JSON.stringify(knowledge_data)},
          ${`organism_${communication.sender_id}`},
          0.8
        )
      `;
    }
  } else if (communication.receiver_id) {
    // Share with specific organism
    await organismDB.exec`
      INSERT INTO knowledge_base (organism_id, knowledge_type, content, source, confidence_score)
      VALUES (
        ${communication.receiver_id},
        'shared_knowledge',
        ${JSON.stringify(knowledge_data)},
        ${`organism_${communication.sender_id}`},
        0.8
      )
    `;
  }
}

async function handleEvolutionProposal(communication: Communication): Promise<void> {
  const { proposed_improvements, target_organism_id } = communication.content;
  
  if (target_organism_id) {
    // Store evolution proposal for consideration
    await organismDB.exec`
      INSERT INTO knowledge_base (organism_id, knowledge_type, content, source, confidence_score)
      VALUES (
        ${target_organism_id},
        'evolution_proposal',
        ${JSON.stringify({
          proposed_improvements,
          proposer_id: communication.sender_id,
          proposal_timestamp: new Date()
        })},
        ${`organism_${communication.sender_id}`},
        0.7
      )
    `;
  }
}

async function handleMergeRequest(communication: Communication): Promise<void> {
  const { task_id, requesting_organisms } = communication.content;
  
  // Update task to indicate merge request
  await organismDB.exec`
    UPDATE tasks SET 
      status = 'merging',
      progress = jsonb_set(progress, '{current_phase}', '"merging_organisms"'),
      updated_at = NOW()
    WHERE id = ${task_id}
  `;
}

async function handleErrorReport(communication: Communication): Promise<void> {
  const { error_details, affected_organism_id } = communication.content;
  
  // Log error for analysis and potential healing
  await organismDB.exec`
    INSERT INTO knowledge_base (organism_id, knowledge_type, content, source, confidence_score)
    VALUES (
      ${affected_organism_id || communication.sender_id},
      'error_solution',
      ${JSON.stringify({
        error_details,
        reporter_id: communication.sender_id,
        report_timestamp: new Date()
      })},
      'error_reporting_system',
      0.9
    )
  `;
}

async function handleTaskAssignment(communication: Communication): Promise<void> {
  const { task_id, assignment_details } = communication.content;
  
  if (communication.receiver_id) {
    // Update organism's current task assignment
    const organism = await organismDB.queryRow<{ memory: any }>`
      SELECT memory FROM organisms WHERE id = ${communication.receiver_id}
    `;

    if (organism) {
      const updatedMemory = { ...organism.memory };
      updatedMemory.current_assignments = updatedMemory.current_assignments || [];
      updatedMemory.current_assignments.push({
        task_id,
        assignment_details,
        assigned_at: new Date()
      });

      await organismDB.exec`
        UPDATE organisms SET 
          memory = ${JSON.stringify(updatedMemory)},
          updated_at = NOW()
        WHERE id = ${communication.receiver_id}
      `;
    }
  }
}

async function handleStatusUpdate(communication: Communication): Promise<void> {
  const { status_data } = communication.content;
  
  // Update organism's last active timestamp
  await organismDB.exec`
    UPDATE organisms SET 
      last_active = NOW(),
      updated_at = NOW()
    WHERE id = ${communication.sender_id}
  `;
}
