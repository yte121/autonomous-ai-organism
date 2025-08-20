CREATE TABLE communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES organisms(id),
  receiver_id UUID REFERENCES organisms(id),
  message_type TEXT NOT NULL,
  content JSONB NOT NULL,
  is_broadcast BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_communications_sender ON communications(sender_id);
CREATE INDEX idx_communications_receiver ON communications(receiver_id);
CREATE INDEX idx_communications_type ON communications(message_type);
