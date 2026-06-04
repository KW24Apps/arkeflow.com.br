CREATE TABLE colaboradores_documentos (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id  UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome        TEXT        NOT NULL,          -- nome do arquivo exibido
  arquivo     TEXT        NOT NULL,          -- caminho no servidor
  tipo_mime   TEXT,
  tamanho     INT,                           -- bytes
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_docs_usuario ON colaboradores_documentos(usuario_id);
