ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS sessao_plataforma TEXT
    CHECK (sessao_plataforma IN ('web', 'mobile', 'desktop'));
