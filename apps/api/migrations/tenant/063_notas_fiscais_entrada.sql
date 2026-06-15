-- NF-e de entrada: cabeçalho + itens
-- Necessário para SPED Fiscal Bloco C (entradas) e EFD-Contribuições (PIS/COFINS por nota)

CREATE TABLE IF NOT EXISTS notas_fiscais_entrada (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identificação da NF-e
  chave_acesso     CHAR(44)      NOT NULL UNIQUE,
  numero           TEXT          NOT NULL,
  serie            CHAR(3)       NOT NULL,
  data_emissao     DATE          NOT NULL,
  data_entrada     DATE          NOT NULL,

  -- Dados do emitente (fornecedor)
  emitente_cnpj    CHAR(14)      NOT NULL,
  emitente_nome    TEXT          NOT NULL,
  emitente_ie      TEXT,
  emitente_uf      CHAR(2)       NOT NULL,
  fornecedor_id    UUID          REFERENCES fornecedores(id) ON DELETE SET NULL,

  -- Totais financeiros — SPED Bloco C100
  vl_produtos      NUMERIC(12,2) NOT NULL DEFAULT 0,
  vl_frete         NUMERIC(12,2) NOT NULL DEFAULT 0,
  vl_seguro        NUMERIC(12,2) NOT NULL DEFAULT 0,
  vl_desconto      NUMERIC(12,2) NOT NULL DEFAULT 0,
  vl_outros        NUMERIC(12,2) NOT NULL DEFAULT 0,
  vl_ipi           NUMERIC(12,2) NOT NULL DEFAULT 0,
  vl_icms          NUMERIC(12,2) NOT NULL DEFAULT 0,
  vl_pis           NUMERIC(12,2) NOT NULL DEFAULT 0,
  vl_cofins        NUMERIC(12,2) NOT NULL DEFAULT 0,
  vl_total         NUMERIC(12,2) NOT NULL,

  -- Controle
  status           TEXT          NOT NULL DEFAULT 'pendente'
                     CHECK (status IN ('pendente', 'confirmada', 'cancelada')),
  xml_original     TEXT          NOT NULL,
  importado_por    UUID          NOT NULL,
  criado_em        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  confirmado_em    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notas_fiscais_entrada_itens (
  id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  nota_id        UUID          NOT NULL REFERENCES notas_fiscais_entrada(id) ON DELETE CASCADE,

  -- Dados do item extraídos do XML
  numero_item    SMALLINT      NOT NULL,
  cprod          TEXT          NOT NULL,
  xprod          TEXT          NOT NULL,
  ean            TEXT,
  ncm            VARCHAR(10),
  cfop           VARCHAR(10)   NOT NULL,
  ucom           TEXT          NOT NULL,
  qcom           NUMERIC(12,4) NOT NULL,
  vuncom         NUMERIC(12,4) NOT NULL,
  vprod          NUMERIC(12,2) NOT NULL,

  -- Tributos por item — SPED Bloco C170 e EFD-Contribuições
  icms_cst       VARCHAR(4)    NOT NULL DEFAULT '0',
  icms_base      NUMERIC(12,2) NOT NULL DEFAULT 0,
  icms_aliq      NUMERIC(5,2)  NOT NULL DEFAULT 0,
  icms_valor     NUMERIC(12,2) NOT NULL DEFAULT 0,
  ipi_valor      NUMERIC(12,2) NOT NULL DEFAULT 0,
  pis_aliq       NUMERIC(5,2)  NOT NULL DEFAULT 0,
  pis_valor      NUMERIC(12,2) NOT NULL DEFAULT 0,
  cofins_aliq    NUMERIC(5,2)  NOT NULL DEFAULT 0,
  cofins_valor   NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Vinculação com variação cadastrada
  versao_id      UUID          REFERENCES versoes(id) ON DELETE SET NULL,
  matched        BOOLEAN       NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_nfe_itens_nota_id
  ON notas_fiscais_entrada_itens (nota_id);

CREATE INDEX IF NOT EXISTS idx_nfe_itens_versao_id
  ON notas_fiscais_entrada_itens (versao_id)
  WHERE versao_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nfe_itens_ean
  ON notas_fiscais_entrada_itens (ean)
  WHERE ean IS NOT NULL;
