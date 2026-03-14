-- ============================================
-- Migration 024: Messaging System Schema
-- ============================================

-- Conversations table - tracks conversations between two users
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_one UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    participant_two UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    report_id UUID,
    report_source TEXT, -- 'missing' or 'sighting'
    last_message_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_conversation UNIQUE (participant_one, participant_two),
    CONSTRAINT no_self_conversation CHECK (participant_one <> participant_two)
);

-- Messages table - stores individual messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add allow_messages column to user_settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS allow_messages BOOLEAN NOT NULL DEFAULT true;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_participant_one ON conversations(participant_one);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_two ON conversations(participant_two);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_conversations_report ON conversations(report_id, report_source);

-- RLS Policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversations: users can only see their own conversations
CREATE POLICY "Users can view own conversations"
    ON conversations FOR SELECT
    USING (auth.uid() = participant_one OR auth.uid() = participant_two);

CREATE POLICY "Users can insert conversations they are part of"
    ON conversations FOR INSERT
    WITH CHECK (auth.uid() = participant_one OR auth.uid() = participant_two);

-- Messages: users can see messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
    ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = messages.conversation_id
            AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
        )
    );

CREATE POLICY "Users can insert messages in their conversations"
    ON messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = messages.conversation_id
            AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
        )
    );

CREATE POLICY "Users can update read status of messages sent to them"
    ON messages FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = messages.conversation_id
            AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
        )
        AND sender_id <> auth.uid()
    );
