CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organism_id UUID NOT NULL REFERENCES organisms(id),
  knowledge_type TEXT NOT NULL,
  content JSONB NOT NULL,
  source TEXT NOT NULL,
  confidence_score FLOAT DEFAULT 0.5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_knowledge_organism ON knowledge_base(organism_id);
CREATE INDEX idx_knowledge_type ON knowledge_base(knowledge_type);
CREATE INDEX idx_knowledge_confidence ON knowledge_base(confidence_score);
