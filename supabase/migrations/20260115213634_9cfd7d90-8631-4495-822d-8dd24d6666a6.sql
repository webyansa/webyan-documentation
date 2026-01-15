-- Create trigger to auto-update conversation last_message_at and last_message_preview
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.body, 100),
    unread_count = CASE 
      WHEN NEW.sender_type = 'agent' OR NEW.sender_type = 'system' THEN 0
      ELSE unread_count + 1
    END,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_message_insert ON conversation_messages;

-- Create the trigger
CREATE TRIGGER on_message_insert
AFTER INSERT ON conversation_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_on_message();