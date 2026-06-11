ALTER TABLE promocoes
  ADD COLUMN IF NOT EXISTS encerrada boolean NOT NULL DEFAULT false;
