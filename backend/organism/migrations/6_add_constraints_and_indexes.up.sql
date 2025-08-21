-- Add missing constraints and indexes for better performance and data integrity

-- Add indexes for better query performance
CREATE INDEX idx_organisms_capabilities ON organisms USING GIN (capabilities);
CREATE INDEX idx_organisms_learned_technologies ON organisms USING GIN (learned_technologies);
CREATE INDEX idx_organisms_performance_metrics ON organisms USING GIN (performance_metrics);
CREATE INDEX idx_tasks_assigned_organisms ON tasks USING GIN (assigned_organisms);
CREATE INDEX idx_tasks_requirements ON tasks USING GIN (requirements);
CREATE INDEX idx_tasks_progress ON tasks USING GIN (progress);
CREATE INDEX idx_knowledge_base_content ON knowledge_base USING GIN (content);

-- Add check constraints
ALTER TABLE organisms ADD CONSTRAINT check_generation_positive 
  CHECK (generation > 0);
ALTER TABLE tasks ADD CONSTRAINT check_complexity_range 
  CHECK (complexity_level >= 1 AND complexity_level <= 10);
ALTER TABLE knowledge_base ADD CONSTRAINT check_confidence_range 
  CHECK (confidence_score >= 0 AND confidence_score <= 1);

-- Add unique constraints where appropriate
CREATE UNIQUE INDEX idx_organisms_name_generation ON organisms(name, generation);

-- Add partial indexes for active organisms
CREATE INDEX idx_organisms_active ON organisms(status, last_active) 
  WHERE status = 'active';
CREATE INDEX idx_tasks_active ON tasks(status, updated_at) 
  WHERE status IN ('assigned', 'in_progress', 'merging');
