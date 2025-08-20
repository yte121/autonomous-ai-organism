CREATE TABLE memory_persistence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persistence_id TEXT NOT NULL UNIQUE,
  organism_id UUID NOT NULL REFERENCES organisms(id),
  persistence_level TEXT NOT NULL,
  memory_data JSONB NOT NULL,
  backup_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  restored_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_memory_persistence_organism ON memory_persistence(organism_id);
CREATE INDEX idx_memory_persistence_level ON memory_persistence(persistence_level);
CREATE INDEX idx_memory_persistence_created ON memory_persistence(created_at);
CREATE INDEX idx_memory_persistence_id ON memory_persistence(persistence_id);

-- Add memory management fields to organisms table
ALTER TABLE organisms ADD COLUMN memory_version INTEGER DEFAULT 1;
ALTER TABLE organisms ADD COLUMN memory_size_bytes INTEGER DEFAULT 0;
ALTER TABLE organisms ADD COLUMN last_memory_compression TIMESTAMP WITH TIME ZONE;
ALTER TABLE organisms ADD COLUMN memory_optimization_score FLOAT DEFAULT 0.5;

-- Create indexes for new fields
CREATE INDEX idx_organisms_memory_version ON organisms(memory_version);
CREATE INDEX idx_organisms_memory_size ON organisms(memory_size_bytes);
CREATE INDEX idx_organisms_last_compression ON organisms(last_memory_compression);
