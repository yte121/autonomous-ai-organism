CREATE TABLE organisms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  generation INTEGER NOT NULL DEFAULT 1,
  parent_id UUID REFERENCES organisms(id),
  status TEXT NOT NULL DEFAULT 'active',
  capabilities JSONB NOT NULL DEFAULT '[]',
  memory JSONB NOT NULL DEFAULT '{}',
  performance_metrics JSONB NOT NULL DEFAULT '{}',
  code_analysis JSONB NOT NULL DEFAULT '{}',
  learned_technologies JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_organisms_status ON organisms(status);
CREATE INDEX idx_organisms_generation ON organisms(generation);
CREATE INDEX idx_organisms_parent_id ON organisms(parent_id);
