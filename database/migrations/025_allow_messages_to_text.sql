-- Migration: Change allow_messages from boolean to text with options
-- Options: 'everyone', 'reports_only', 'nobody'

-- Step 1: Add new text column
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS allow_messages_new TEXT DEFAULT 'everyone';

-- Step 2: Migrate existing data (true -> 'everyone', false -> 'nobody')
UPDATE user_settings 
SET allow_messages_new = CASE 
    WHEN allow_messages = true THEN 'everyone'
    WHEN allow_messages = false THEN 'nobody'
    ELSE 'everyone'
END;

-- Step 3: Drop old boolean column
ALTER TABLE user_settings DROP COLUMN IF EXISTS allow_messages;

-- Step 4: Rename new column
ALTER TABLE user_settings RENAME COLUMN allow_messages_new TO allow_messages;

-- Step 5: Add check constraint for valid values
ALTER TABLE user_settings ADD CONSTRAINT allow_messages_valid_values 
    CHECK (allow_messages IN ('everyone', 'reports_only', 'nobody'));
