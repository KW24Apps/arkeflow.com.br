ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS is_supervisor boolean NOT NULL DEFAULT false;
