-- Add RLS policies for reminders table

-- Enable RLS on reminders table (if not already enabled)
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own reminders
CREATE POLICY "Users can view own reminders"
ON reminders FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Users can create their own reminders
CREATE POLICY "Users can create own reminders"
ON reminders FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own reminders
CREATE POLICY "Users can update own reminders"
ON reminders FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own reminders
CREATE POLICY "Users can delete own reminders"
ON reminders FOR DELETE
TO authenticated
USING (user_id = auth.uid());
