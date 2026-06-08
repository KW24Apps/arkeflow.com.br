# ARKEflow — Schema do Banco de Dados

> Gerado em 2026-06-08 a partir de dumps reais (`pg_dump --schema-only`).
> Fonte: `docs/schema_platform.sql` (arkeflow_platform) e `docs/schema_tenant.sql` (loja_teste).
> PostgreSQL 14.23 (Ubuntu 14.23-0ubuntu0.22.04.1).
>
> **Notas importantes:**
> - `turnos_caixa` retorna `total_sangrias` e `total_suprimentos` como agregados calculados pela API — não são colunas físicas.
> - `formas_pagamento.desconto_percentual` e `desconto_maximo` **ainda existem** em ambos os bancos (não foram droppadas), mas estão depreciadas — o código não as lê nem escreve. O modelo atual usa o limite global em `configuracoes_loja` e `formas_pagamento.aceita_desconto`.
> - As migrações do platform e do tenant são independentes. O tenant (loja_XXXXX) tem colunas adicionais em várias tabelas que o platform não possui.

---

## Arquitetura Multi-Tenant

| Banco | Papel |
|-------|-------|
| `arkeflow_platform` | Controle de plataforma: lojas, usuários, planos, assinaturas. Também contém as tabelas de negócio (legado — dados históricos e ambiente compartilhado). |
| `loja_XXXXX` | Banco por loja. Contém apenas tabelas de negócio. Schema mais atualizado — todas as migrações de tenant são aplicadas aqui. |

O pool da plataforma (`platformPool`) conecta ao `arkeflow_platform`. Para cada requisição autenticada, `getTenantPool(banco_id)` troca o nome do banco na connection string e retorna um pool isolado para a loja.

---

## Seção 1 — Banco da Plataforma (`arkeflow_platform`)

### Tabelas exclusivas do platform

---

### `lojas`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | DEFAULT uuid_generate_v4() |
| `nome` | TEXT | NOT NULL |
| `cnpj` | TEXT | UNIQUE |
| `telefone` | TEXT | |
| `email` | TEXT | |
| `banco_id` | TEXT | NOT NULL UNIQUE — nome do banco PostgreSQL da loja |
| `status` | TEXT | NOT NULL DEFAULT `'ativo'` — CHECK: `ativo`, `inativo`, `suspenso` |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| `logo_url` | TEXT | |
| `link_loja` | TEXT | |
| `cep` | TEXT | |
| `logradouro` | TEXT | |
| `numero` | TEXT | |
| `complemento` | TEXT | |
| `bairro` | TEXT | |
| `cidade` | TEXT | |
| `estado` | CHAR(2) | |
| `regime_tributario` | VARCHAR(30) | MEI, Simples Nacional, Lucro Presumido, Lucro Real |
| `certificado_digital_path` | TEXT | Nome do arquivo .pfx/.p12 |
| `certificado_digital_senha` | TEXT | Senha do certificado |

---

### `planos`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `nome` | TEXT | NOT NULL |
| `preco_mensal` | NUMERIC(10,2) | NOT NULL |
| `max_usuarios` | INTEGER | NOT NULL DEFAULT 5 |
| `franquia_notas` | INTEGER | NOT NULL DEFAULT 0 |
| `tem_financeiro` | BOOLEAN | NOT NULL DEFAULT false |
| `tem_cashback` | BOOLEAN | NOT NULL DEFAULT false |
| `tem_promocoes` | BOOLEAN | NOT NULL DEFAULT false |
| `ativo` | BOOLEAN | NOT NULL DEFAULT true |

---

### `assinaturas`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `loja_id` | UUID | NOT NULL FK → lojas.id |
| `plano_id` | UUID | NOT NULL FK → planos.id |
| `inicio` | DATE | NOT NULL |
| `vencimento` | DATE | NOT NULL |
| `status` | TEXT | NOT NULL DEFAULT `'ativa'` — CHECK: `ativa`, `trial`, `suspensa`, `cancelada` |

---

### `pacotes_nota`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `loja_id` | UUID | NOT NULL FK → lojas.id |
| `quantidade` | INTEGER | NOT NULL |
| `utilizadas` | INTEGER | NOT NULL DEFAULT 0 |
| `valor_pago` | NUMERIC(10,2) | NOT NULL |
| `validade` | DATE | NOT NULL |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

---

### `usuarios`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `loja_id` | UUID | FK → lojas.id (NULL = admin plataforma) |
| `nome` | TEXT | NOT NULL |
| `email` | TEXT | NOT NULL UNIQUE |
| `username` | TEXT | UNIQUE |
| `senha_hash` | TEXT | NOT NULL |
| `nivel` | TEXT | NOT NULL — CHECK: `admin_plataforma`, `parceiro`, `dono_loja`, `vendedor` |
| `ativo` | BOOLEAN | NOT NULL DEFAULT true |
| `ultimo_acesso` | TIMESTAMPTZ | |
| `permissoes` | JSONB | NOT NULL DEFAULT `[]` |
| `modelo_permissao_id` | UUID | FK → modelos_permissao.id |
| `dias_semana` | JSONB | Restrição de dias da semana |
| `hora_inicio` | TIME | |
| `hora_fim` | TIME | |

**Índices:** `idx_usuarios_loja (loja_id)`, `idx_usuarios_username (username)` (UNIQUE)

---

### `modelos_permissao`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `loja_id` | UUID | NOT NULL FK → lojas.id ON DELETE CASCADE |
| `nome` | TEXT | NOT NULL |
| `permissoes` | JSONB | NOT NULL DEFAULT `[]` |
| `sistema` | BOOLEAN | NOT NULL DEFAULT false |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

**Índices:** `idx_modelos_permissao_loja (loja_id)`

---

### `logs_acesso`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `usuario_id` | UUID | NOT NULL FK → usuarios.id |
| `loja_id` | UUID | FK → lojas.id |
| `ip` | TEXT | |
| `tipo` | TEXT | NOT NULL — CHECK: `login`, `logout` |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

**Índices:** `idx_logs_acesso_loja (loja_id, criado_em DESC)`, `idx_logs_acesso_usuario (usuario_id, criado_em DESC)`

---

### `lojas_contatos`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `loja_id` | UUID | NOT NULL FK → lojas.id ON DELETE CASCADE |
| `tipo` | TEXT | NOT NULL — CHECK: `comercial`, `financeiro`, `socio` |
| `nome` | TEXT | NOT NULL |
| `telefone` | TEXT | |
| `email` | TEXT | |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

**Índices:** `idx_lojas_contatos_loja (loja_id)`

---

### `colaboradores_perfil`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `usuario_id` | UUID | NOT NULL UNIQUE FK → usuarios.id ON DELETE CASCADE |
| `cpf` | TEXT | |
| `rg` | TEXT | |
| `data_nascimento` | DATE | |
| `telefone` | TEXT | |
| `cargo` | TEXT | |
| `cep` | TEXT | |
| `logradouro` | TEXT | |
| `numero` | TEXT | |
| `complemento` | TEXT | |
| `bairro` | TEXT | |
| `cidade` | TEXT | |
| `estado` | CHAR(2) | |
| `banco` | TEXT | |
| `agencia` | TEXT | |
| `conta` | TEXT | |
| `conta_digito` | TEXT | |
| `tipo_conta` | TEXT | CHECK: `corrente`, `poupanca` |
| `pix` | TEXT | |
| `data_admissao` | DATE | |
| `salario` | NUMERIC(10,2) | |
| `tipo_contrato` | TEXT | CHECK: `clt`, `pj`, `mei`, `autonomo`, `estagio`, `outro` |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| `atualizado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

---

### `colaboradores_documentos`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `usuario_id` | UUID | NOT NULL FK → usuarios.id ON DELETE CASCADE |
| `nome` | TEXT | NOT NULL |
| `arquivo` | TEXT | NOT NULL |
| `tipo_mime` | TEXT | |
| `tamanho` | INTEGER | Tamanho em bytes |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

**Índices:** `idx_docs_usuario (usuario_id)`

---

## Seção 2 — Banco por Loja (`loja_XXXXX`)

> As tabelas abaixo são o schema real de `loja_teste` (dump de 2026-06-08).
> Tabelas marcadas com ⚠️ diferem do banco da plataforma.

---

### `clientes` ⚠️

> Tenant tem `arquivado` + 7 campos de endereço que o platform não possui (migração 036).

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `nome` | TEXT | NOT NULL |
| `telefone` | TEXT | Contato principal |
| `cpf` | TEXT | UNIQUE |
| `email` | TEXT | |
| `regra_cashback_id` | UUID | FK → regras_cashback.id |
| `saldo_cashback` | NUMERIC(10,2) | NOT NULL DEFAULT 0 |
| `medidas_json` | JSONB | DEFAULT `{}` |
| `ativo` | BOOLEAN | NOT NULL DEFAULT true — soft-delete via `UPDATE SET ativo = false` |
| `arquivado` | BOOLEAN | NOT NULL DEFAULT false |
| `cep` | TEXT | |
| `logradouro` | TEXT | |
| `numero` | TEXT | |
| `complemento` | TEXT | |
| `bairro` | TEXT | |
| `cidade` | TEXT | |
| `estado` | CHAR(2) | |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

---

### `clientes_contatos`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `cliente_id` | UUID | NOT NULL FK → clientes.id ON DELETE CASCADE |
| `tipo` | TEXT | NOT NULL — CHECK: `comercial`, `financeiro`, `socio` |
| `nome` | TEXT | NOT NULL |
| `telefone` | TEXT | |
| `email` | TEXT | |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

**Índices:** `idx_clientes_contatos_cliente (cliente_id)`

---

### `produtos` ⚠️

> Tenant tem campos fiscais (NCM, CFOP, CSOSN/CST, alíquotas), `aceita_desconto`, `codigo_barras`, `arquivado`, `genero`.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `nome` | TEXT | NOT NULL |
| `codigo` | TEXT | Código interno |
| `tipo_id` | UUID | FK → tipos_produto.id |
| `categoria` | TEXT | |
| `marca` | TEXT | |
| `descricao` | TEXT | Descrição curta |
| `descricao2` | TEXT | Descrição longa / composição textual |
| `composicao` | TEXT | |
| `composicao_itens` | JSONB | NOT NULL DEFAULT `[]` |
| `preco_base` | NUMERIC(10,2) | NOT NULL |
| `foto_url` | TEXT | |
| `controle_estoque` | BOOLEAN | NOT NULL DEFAULT true |
| `aceita_desconto` | BOOLEAN | NOT NULL DEFAULT true |
| `codigo_barras` | TEXT | Barcode universal do produto (nível produto); UNIQUE WHERE NOT NULL |
| `genero` | TEXT | |
| `ncm` | VARCHAR(10) | Nomenclatura Comum do Mercosul |
| `cfop` | VARCHAR(10) | Código Fiscal de Operações |
| `origem_mercadoria` | SMALLINT | |
| `csosn` | VARCHAR(10) | Simples Nacional |
| `cst` | VARCHAR(10) | Regime Normal |
| `icms_st` | NUMERIC(5,2) | |
| `ipi` | NUMERIC(5,2) | |
| `pis` | NUMERIC(5,2) | |
| `cofins` | NUMERIC(5,2) | |
| `ativo` | BOOLEAN | NOT NULL DEFAULT true |
| `arquivado` | BOOLEAN | NOT NULL DEFAULT false — soft-delete padrão |

**Índices:** `idx_produtos_codigo (codigo)`, `uniq_produtos_codigo_barras (codigo_barras) WHERE NOT NULL` (UNIQUE)
**FK:** `tipo_id → tipos_produto.id`

---

### `versoes` ⚠️

> Tenant tem `arquivado`. Barcode único via partial index.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `produto_id` | UUID | NOT NULL FK → produtos.id ON DELETE CASCADE |
| `atributos_json` | JSONB | NOT NULL DEFAULT `{}` — ex: `{"Cor":"Azul","Tamanho":"M"}` |
| `preco_especifico` | NUMERIC(10,2) | NULL = usa preco_base do produto |
| `estoque_atual` | INTEGER | NOT NULL DEFAULT 0 |
| `estoque_minimo` | INTEGER | NOT NULL DEFAULT 0 |
| `codigo_barras` | TEXT | Barcode da variação; UNIQUE WHERE NOT NULL |
| `ativo` | BOOLEAN | NOT NULL DEFAULT true |
| `arquivado` | BOOLEAN | NOT NULL DEFAULT false |

**Índices:** `idx_versoes_produto (produto_id)`, `idx_versoes_atributos (atributos_json) GIN`, `idx_versoes_codigo_barras (codigo_barras)`, `uniq_versoes_codigo_barras (codigo_barras) WHERE NOT NULL` (UNIQUE)

---

### `atributos_produto`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `produto_id` | UUID | NOT NULL FK → produtos.id ON DELETE CASCADE |
| `nome` | TEXT | NOT NULL — nome do atributo (ex: "Cor", "Tamanho") |

---

### `ajustes_estoque`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `versao_id` | UUID | NOT NULL FK → versoes.id |
| `tipo` | TEXT | NOT NULL — CHECK: `entrada`, `saida`, `ajuste` |
| `quantidade` | INTEGER | NOT NULL |
| `motivo` | TEXT | |
| `usuario_id` | UUID | NOT NULL — ID do usuário que realizou |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

**Índices:** `idx_ajustes_versao (versao_id)`

---

### `tipos_produto`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `nome` | TEXT | NOT NULL UNIQUE |
| `ativo` | BOOLEAN | NOT NULL DEFAULT true |

---

### `cores`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `nome` | TEXT | NOT NULL UNIQUE |
| `hex_cor` | TEXT | Ex: `#FF0000` |
| `ativo` | BOOLEAN | NOT NULL DEFAULT true |

---

### `tamanhos`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `nome` | TEXT | NOT NULL UNIQUE |
| `ordem` | INTEGER | NOT NULL DEFAULT 0 — para ordenação na UI |
| `ativo` | BOOLEAN | NOT NULL DEFAULT true |

---

### `medidas`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `nome` | TEXT | NOT NULL UNIQUE |
| `ativo` | BOOLEAN | NOT NULL DEFAULT true |

---

### `composicoes`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `nome` | TEXT | NOT NULL UNIQUE |
| `ativo` | BOOLEAN | NOT NULL DEFAULT true |

---

### `vendas`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `cliente_id` | UUID | FK → clientes.id |
| `usuario_id` | UUID | NOT NULL — operador do caixa |
| `vendedor_id` | UUID | Vendedor atribuído (pode diferir do operador) |
| `vendedor_nome` | TEXT | Desnormalizado para histórico |
| `promocao_id` | UUID | |
| `subtotal` | NUMERIC(10,2) | NOT NULL — sem descontos |
| `desconto_promocao` | NUMERIC(10,2) | NOT NULL DEFAULT 0 |
| `desconto_pagamento` | NUMERIC(10,2) | NOT NULL DEFAULT 0 |
| `cashback_usado` | NUMERIC(10,2) | NOT NULL DEFAULT 0 |
| `cashback_gerado` | NUMERIC(10,2) | NOT NULL DEFAULT 0 |
| `total` | NUMERIC(10,2) | NOT NULL — valor final cobrado |
| `status` | TEXT | NOT NULL DEFAULT `'finalizada'` — CHECK: `finalizada`, `cancelada`, `pendente_sync` |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

**FK:** `cliente_id → clientes.id`, `usuario_id` e `vendedor_id` são UUIDs de usuário (sem FK física no tenant)

---

### `itens_venda`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `venda_id` | UUID | NOT NULL FK → vendas.id ON DELETE CASCADE |
| `versao_id` | UUID | NOT NULL FK → versoes.id |
| `quantidade` | INTEGER | NOT NULL |
| `preco_unitario` | NUMERIC(10,2) | NOT NULL |
| `desconto_item` | NUMERIC(10,2) | NOT NULL DEFAULT 0 |

**Índices:** `idx_itens_venda (venda_id)`

---

### `formas_pagamento` ⚠️

> Tenant tem `aceita_desconto` (controla se desconto do caixa é aplicável nessa forma).

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `nome` | TEXT | NOT NULL |
| `tipo` | TEXT | NOT NULL — ex: `dinheiro`, `pix`, `cartao_credito`, `cartao_debito`, `crediario` |
| `padrao_sistema` | BOOLEAN | NOT NULL DEFAULT false |
| `desconto_percentual` | NUMERIC(5,2) | NOT NULL DEFAULT 0 — **depreciado** |
| `desconto_maximo` | NUMERIC(10,2) | NOT NULL DEFAULT 0 — **depreciado** |
| `aceita_desconto` | BOOLEAN | NOT NULL DEFAULT true — controle atual de desconto |
| `ativo` | BOOLEAN | NOT NULL DEFAULT true |

---

### `pagamentos_venda` ⚠️

> Tenant tem `valor_recebido` e `troco`.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `venda_id` | UUID | NOT NULL FK → vendas.id ON DELETE CASCADE |
| `forma_pagamento_id` | UUID | NOT NULL FK → formas_pagamento.id |
| `valor` | NUMERIC(10,2) | NOT NULL — valor cobrado |
| `valor_recebido` | NUMERIC(10,2) | Valor entregue pelo cliente (para dinheiro) |
| `troco` | NUMERIC(10,2) | |
| `parcelas` | INTEGER | NOT NULL DEFAULT 1 |
| `detalhe` | TEXT | NSU, comprovante, etc. |

**Índices:** `idx_pagamentos_venda (venda_id)`

---

### `parcelas_crediario`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `pagamento_venda_id` | UUID | NOT NULL FK → pagamentos_venda.id ON DELETE CASCADE |
| `numero_parcela` | INTEGER | NOT NULL |
| `valor` | NUMERIC(10,2) | NOT NULL |
| `vencimento` | DATE | NOT NULL |
| `pago_em` | DATE | |
| `status` | TEXT | NOT NULL DEFAULT `'pendente'` — CHECK: `pendente`, `pago`, `vencido` |

---

### `regras_cashback`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `nome` | TEXT | NOT NULL |
| `percentual` | NUMERIC(5,2) | NOT NULL DEFAULT 0 |
| `padrao` | BOOLEAN | NOT NULL DEFAULT false — regra aplicada automaticamente a novos clientes |
| `validade_meses` | INTEGER | NULL = sem validade |
| `ativo` | BOOLEAN | NOT NULL DEFAULT true |

---

### `historico_cashback`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `cliente_id` | UUID | NOT NULL FK → clientes.id |
| `venda_id` | UUID | FK → vendas.id |
| `tipo` | TEXT | NOT NULL — CHECK: `ganho`, `resgate` |
| `valor` | NUMERIC(10,2) | NOT NULL |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

**Índices:** `idx_cashback_cliente (cliente_id)`

---

### `promocoes`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `nome` | TEXT | NOT NULL |
| `tipo` | TEXT | NOT NULL — CHECK: `desconto_percentual`, `desconto_fixo`, `segunda_peca`, `compre_ganhe`, `primeira_compra` |
| `codigo` | TEXT | Cupom de desconto; UNIQUE WHERE NOT NULL |
| `aplicacao` | TEXT | DEFAULT `'produtos_selecionados'` — CHECK: `produtos_selecionados`, `categoria`, `todos` |
| `aplica_todos` | BOOLEAN | NOT NULL DEFAULT false |
| `valor_desconto` | NUMERIC(10,2) | |
| `unidade` | TEXT | `%` ou `R$` |
| `percentual_brinde` | NUMERIC(5,2) | |
| `quantidade_minima` | INTEGER | |
| `quantidade_brinde` | INTEGER | |
| `quantidade_compre` | INTEGER | Para tipo `compre_ganhe` |
| `categoria_alvo` | TEXT | |
| `categorias_alvo` | JSONB | DEFAULT `[]` |
| `inicio` | DATE | |
| `fim` | DATE | |
| `ativo` | BOOLEAN | NOT NULL DEFAULT true |

**Índices:** `idx_promocoes_codigo (codigo) WHERE NOT NULL` (UNIQUE)

---

### `promocoes_produtos`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `promocao_id` | UUID | NOT NULL FK → promocoes.id ON DELETE CASCADE |
| `produto_id` | UUID | NOT NULL FK → produtos.id ON DELETE CASCADE |

**Constraint:** UNIQUE `(promocao_id, produto_id)`

---

### `turnos_caixa`

> `total_sangrias` e `total_suprimentos` são calculados pela API via `movimentos_caixa` — não são colunas físicas.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `usuario_id` | UUID | NOT NULL |
| `saldo_inicial` | NUMERIC(10,2) | NOT NULL DEFAULT 0 |
| `saldo_final` | NUMERIC(10,2) | NULL enquanto aberto |
| `observacao` | TEXT | |
| `status` | TEXT | NOT NULL DEFAULT `'aberto'` — CHECK: `aberto`, `fechado` |
| `aberto_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| `fechado_em` | TIMESTAMPTZ | |

---

### `movimentos_caixa`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `turno_id` | UUID | NOT NULL FK → turnos_caixa.id |
| `tipo` | TEXT | NOT NULL — CHECK: `sangria`, `suprimento` |
| `valor` | NUMERIC(10,2) | NOT NULL |
| `motivo` | TEXT | |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

---

### `sacolas`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `criado_por` | UUID | ID do usuário |
| `nome_vendedor` | TEXT | Desnormalizado |
| `cliente_id` | UUID | |
| `cliente_nome` | TEXT | Desnormalizado |
| `status` | TEXT | NOT NULL DEFAULT `'aguardando'` — CHECK: `aguardando`, `em_atendimento`, `finalizada`, `cancelada` |
| `observacao` | TEXT | |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| `atualizado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

**Índices:** `sacolas_status_idx (status)`, `sacolas_criado_em_idx (criado_em DESC)`

---

### `sacola_itens`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `sacola_id` | UUID | NOT NULL FK → sacolas.id ON DELETE CASCADE |
| `versao_id` | UUID | NOT NULL |
| `produto_id` | UUID | NOT NULL |
| `nome` | TEXT | NOT NULL — desnormalizado |
| `atributos` | JSONB | NOT NULL DEFAULT `{}` |
| `preco_unitario` | NUMERIC(10,2) | NOT NULL |
| `quantidade` | INTEGER | NOT NULL DEFAULT 1 |
| `codigo_barras` | TEXT | |

**Índices:** `sacola_itens_sacola_id_idx (sacola_id)`

---

### `lancamentos`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `tipo` | TEXT | NOT NULL — CHECK: `entrada`, `saida` |
| `descricao` | TEXT | NOT NULL |
| `valor` | NUMERIC(10,2) | NOT NULL |
| `venda_id` | UUID | FK → vendas.id |
| `data` | DATE | NOT NULL DEFAULT CURRENT_DATE |
| `categoria` | TEXT | |
| `status` | TEXT | NOT NULL DEFAULT `'realizado'` — CHECK: `realizado`, `pendente` |

**Índices:** `idx_lancamentos_data (data)`

---

### `notas_fiscais`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `venda_id` | UUID | NOT NULL FK → vendas.id |
| `tipo` | TEXT | NOT NULL — CHECK: `nfe`, `nfce` |
| `numero` | TEXT | |
| `chave_acesso` | TEXT | UNIQUE |
| `status` | TEXT | NOT NULL DEFAULT `'pendente'` — CHECK: `pendente`, `autorizada`, `rejeitada`, `cancelada` |
| `xml_url` | TEXT | |
| `emitida_em` | TIMESTAMPTZ | |

---

### `fornecedores` _(tenant only — não existe no platform)_

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `razao_social` | TEXT | NOT NULL |
| `nome_fantasia` | TEXT | |
| `cnpj` | TEXT | |
| `email` | TEXT | |
| `telefones` | JSONB | NOT NULL DEFAULT `[]` — array de strings |
| `cep` | TEXT | |
| `logradouro` | TEXT | |
| `numero` | TEXT | |
| `complemento` | TEXT | |
| `bairro` | TEXT | |
| `cidade` | TEXT | |
| `estado` | TEXT | |
| `ativo` | BOOLEAN | NOT NULL DEFAULT true |
| `arquivado` | BOOLEAN | NOT NULL DEFAULT false |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

---

### `configuracoes_loja` ⚠️

> Tenant tem 4 colunas extras de controle de desconto.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | |
| `controle_estoque` | BOOLEAN | NOT NULL DEFAULT true |
| `logo_url` | TEXT | |
| `link_loja` | TEXT | |
| `desconto_max_percentual` | NUMERIC(5,2) | NOT NULL DEFAULT 0 — tenant only |
| `desconto_max_valor` | NUMERIC(10,2) | NOT NULL DEFAULT 0 — tenant only |
| `promocao_aceita_desconto` | BOOLEAN | NOT NULL DEFAULT false — tenant only |
| `desconto_restringe_formas` | BOOLEAN | NOT NULL DEFAULT false — tenant only |
| `atualizado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

---

### `_migrations`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `name` | TEXT PK | Nome do arquivo de migration |
| `run_at` | TIMESTAMPTZ | DEFAULT NOW() |

---

## Diferenças Platform vs Tenant (resumo)

| Tabela | Platform | Tenant | Diferença |
|--------|----------|--------|-----------|
| `clientes` | ✓ | ✓ | Tenant tem `arquivado` + 7 campos de endereço |
| `configuracoes_loja` | ✓ | ✓ | Tenant tem 4 colunas de desconto |
| `formas_pagamento` | ✓ | ✓ | Tenant tem `aceita_desconto` |
| `pagamentos_venda` | ✓ | ✓ | Tenant tem `valor_recebido`, `troco` |
| `produtos` | ✓ | ✓ | Tenant tem `arquivado`, `genero`, campos fiscais, `aceita_desconto`, `codigo_barras` |
| `versoes` | ✓ | ✓ | Tenant tem `arquivado`; índice UNIQUE em `codigo_barras` |
| `fornecedores` | ✗ | ✓ | Existe apenas no tenant |
| `lojas` | ✓ | ✗ | Existe apenas no platform |
| `usuarios` | ✓ | ✗ | Existe apenas no platform |
| `planos` | ✓ | ✗ | Existe apenas no platform |
| `assinaturas` | ✓ | ✗ | Existe apenas no platform |
| `pacotes_nota` | ✓ | ✗ | Existe apenas no platform |
| `modelos_permissao` | ✓ | ✗ | Existe apenas no platform |
| `logs_acesso` | ✓ | ✗ | Existe apenas no platform |
| `lojas_contatos` | ✓ | ✗ | Existe apenas no platform |
| `colaboradores_perfil` | ✓ | ✗ | Existe apenas no platform |
| `colaboradores_documentos` | ✓ | ✗ | Existe apenas no platform |
