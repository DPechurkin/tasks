CREATE TABLE recurrence_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('weekly','monthly','yearly')),
  days_of_week TEXT,
  days_of_month TEXT,
  month INTEGER,
  day INTEGER,
  time_from TEXT NOT NULL,
  time_to TEXT NOT NULL,
  end_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
--> statement-breakpoint
ALTER TABLE scheduled_slots ADD COLUMN recurrence_rule_id INTEGER REFERENCES recurrence_rules(id) ON DELETE SET NULL;
