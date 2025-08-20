import { api } from "encore.dev/api";
import { organismDB } from "./db";
import type { Task, CreateTaskRequest, Organism } from "./types";

// Creates a new task for organisms to execute.
export const createTask = api<CreateTaskRequest, Task>(
  { expose: true, method: "POST", path: "/tasks" },
  async (req) => {
    const task = await organismDB.queryRow<Task>`
      INSERT INTO tasks (title, description, complexity_level, requirements, progress, results)
      VALUES (
        ${req.title},
        ${req.description},
        ${req.complexity_level},
        ${JSON.stringify(req.requirements)},
        ${JSON.stringify({
          completion_percentage: 0,
          current_phase: 'initialization',
          milestones_completed: [],
          issues_encountered: []
        })},
        ${JSON.stringify({
          output: null,
          performance_data: {},
          lessons_learned: [],
          new_capabilities_discovered: []
        })}
      )
      RETURNING *
    `;

    if (!task) {
      throw new Error("Failed to create task");
    }

    // Auto-assign suitable organisms
    await autoAssignOrganisms(task);

    return task;
  }
);

// Retrieves all tasks with optional filtering.
export const listTasks = api<void, { tasks: Task[] }>(
  { expose: true, method: "GET", path: "/tasks" },
  async () => {
    const tasks = await organismDB.queryAll<Task>`
      SELECT * FROM tasks ORDER BY created_at DESC
    `;
    return { tasks };
  }
);

// Updates task progress and handles completion.
export const updateTaskProgress = api<{
  task_id: string;
  progress_update: Partial<Task['progress']>;
  results_update?: Partial<Task['results']>;
}, Task>(
  { expose: true, method: "PUT", path: "/tasks/:task_id/progress" },
  async (req) => {
    const task = await organismDB.queryRow<Task>`
      SELECT * FROM tasks WHERE id = ${req.task_id}
    `;

    if (!task) {
      throw new Error("Task not found");
    }

    const updatedProgress = { ...task.progress, ...req.progress_update };
    const updatedResults = req.results_update ? { ...task.results, ...req.results_update } : task.results;
    
    let newStatus = task.status;
    if (updatedProgress.completion_percentage >= 100) {
      newStatus = 'completed';
    } else if (updatedProgress.completion_percentage > 0) {
      newStatus = 'in_progress';
    }

    const updatedTask = await organismDB.queryRow<Task>`
      UPDATE tasks SET 
        status = ${newStatus},
        progress = ${JSON.stringify(updatedProgress)},
        results = ${JSON.stringify(updatedResults)},
        updated_at = NOW(),
        completed_at = ${newStatus === 'completed' ? 'NOW()' : null}
      WHERE id = ${req.task_id}
      RETURNING *
    `;

    if (!updatedTask) {
      throw new Error("Failed to update task");
    }

    // If task is completed, handle post-completion actions
    if (newStatus === 'completed') {
      await handleTaskCompletion(updatedTask);
    }

    return updatedTask;
  }
);

async function autoAssignOrganisms(taskToAssign: Task): Promise<void> {
  // Find suitable organisms based on requirements
  const suitableOrganisms = await organismDB.rawQueryAll<Organism>(
    `SELECT * FROM organisms 
     WHERE status = 'active' 
     AND generation >= $1
     ORDER BY generation DESC, performance_metrics->>'success_rate' DESC
     LIMIT 5`,
    taskToAssign.requirements.min_generation || 1
  );

  if (suitableOrganisms.length === 0) {
    return;
  }

  // Determine if task needs multiple organisms based on complexity
  const assignedOrganisms = taskToAssign.complexity_level > 7 
    ? suitableOrganisms.slice(0, Math.min(3, suitableOrganisms.length))
    : [suitableOrganisms[0]];

  const organismIds = assignedOrganisms.map(o => o.id);

  await organismDB.exec`
    UPDATE tasks SET 
      assigned_organisms = ${JSON.stringify(organismIds)},
      status = 'assigned',
      updated_at = NOW()
    WHERE id = ${taskToAssign.id}
  `;

  // If multiple organisms assigned, trigger merge
  if (assignedOrganisms.length > 1) {
    await organismDB.exec`
      UPDATE tasks SET status = 'merging', updated_at = NOW()
      WHERE id = ${taskToAssign.id}
    `;
  }
}

async function handleTaskCompletion(task: Task): Promise<void> {
  // Update performance metrics for assigned organisms
  for (const organismId of task.assigned_organisms) {
    const organism = await organismDB.queryRow<Organism>`
      SELECT * FROM organisms WHERE id = ${organismId}
    `;

    if (organism) {
      const updatedMetrics = { ...organism.performance_metrics };
      updatedMetrics.tasks_completed += 1;
      
      // Calculate new success rate
      const totalTasks = updatedMetrics.tasks_completed;
      const successfulTasks = task.status === 'completed' ? totalTasks : totalTasks - 1;
      updatedMetrics.success_rate = successfulTasks / totalTasks;

      await organismDB.exec`
        UPDATE organisms SET 
          performance_metrics = ${JSON.stringify(updatedMetrics)},
          updated_at = NOW(),
          last_active = NOW()
        WHERE id = ${organismId}
      `;
    }
  }

  // Clean up deprecated organisms if task was successful
  if (task.results.performance_data && Object.keys(task.results.performance_data).length > 0) {
    await cleanupDeprecatedOrganisms();
  }
}

async function cleanupDeprecatedOrganisms(): Promise<void> {
  // Remove deprecated organisms that haven't been active for a while
  await organismDB.exec`
    DELETE FROM organisms 
    WHERE status = 'deprecated' 
    AND updated_at < NOW() - INTERVAL '1 hour'
  `;
}
