CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  complexity_level INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_organisms JSONB NOT NULL DEFAULT '[]',
  requirements JSONB NOT NULL DEFAULT '{}',
  progress JSONB NOT NULL DEFAULT '{}',
  results JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_complexity ON tasks(complexity_level);
