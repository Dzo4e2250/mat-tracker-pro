-- Kanban Tasks Table
-- Tabela za naloge z drag & drop funkcionalnostjo

CREATE TABLE IF NOT EXISTS mat_tracker.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  salesperson_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES mat_tracker.companies(id) ON DELETE SET NULL,
  reminder_id UUID REFERENCES mat_tracker.reminders(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL DEFAULT 'simple',
  checklist_items JSONB DEFAULT '[]',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indeksi za hitrejše poizvedbe
CREATE INDEX IF NOT EXISTS idx_tasks_salesperson_id ON mat_tracker.tasks(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON mat_tracker.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON mat_tracker.tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_archived_at ON mat_tracker.tasks(archived_at);
CREATE INDEX IF NOT EXISTS idx_tasks_position ON mat_tracker.tasks(position);

-- RLS politike
ALTER TABLE mat_tracker.tasks ENABLE ROW LEVEL SECURITY;

-- Prodajalci lahko vidijo samo svoje naloge
CREATE POLICY "Users can view their own tasks" ON mat_tracker.tasks
  FOR SELECT USING (auth.uid() = salesperson_id);

-- Prodajalci lahko ustvarjajo svoje naloge
CREATE POLICY "Users can create their own tasks" ON mat_tracker.tasks
  FOR INSERT WITH CHECK (auth.uid() = salesperson_id);

-- Prodajalci lahko posodabljajo svoje naloge
CREATE POLICY "Users can update their own tasks" ON mat_tracker.tasks
  FOR UPDATE USING (auth.uid() = salesperson_id);

-- Prodajalci lahko brišejo svoje naloge
CREATE POLICY "Users can delete their own tasks" ON mat_tracker.tasks
  FOR DELETE USING (auth.uid() = salesperson_id);

-- Trigger za posodobitev updated_at
CREATE OR REPLACE FUNCTION mat_tracker.update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON mat_tracker.tasks
  FOR EACH ROW
  EXECUTE FUNCTION mat_tracker.update_tasks_updated_at();

-- Avtomatsko nastavi completed_at ko se status spremeni na 'done'
CREATE OR REPLACE FUNCTION mat_tracker.set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    NEW.completed_at = now();
  ELSIF NEW.status != 'done' AND OLD.status = 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_completed_at
  BEFORE UPDATE ON mat_tracker.tasks
  FOR EACH ROW
  EXECUTE FUNCTION mat_tracker.set_task_completed_at();
