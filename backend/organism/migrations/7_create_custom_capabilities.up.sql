CREATE TABLE IF NOT EXISTS custom_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organism_id UUID NOT NULL REFERENCES organisms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    code_body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organism_id, name)
);

CREATE INDEX IF NOT EXISTS idx_custom_capabilities_organism_id ON custom_capabilities(organism_id);
