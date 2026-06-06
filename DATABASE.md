# ARKEflow — Schema do Banco de Dados

> Last updated: 2026-06-06 (verificado na sessão 2 — sem alterações de schema)
> Derivado dos arquivos de migration — não conecta ao banco real.
> Platform: 14 migrations (001–014) | Tenant: 30 migrations (001–030)
>
> Nota: `turnos_caixa` retorna `total_sangrias` e `total_suprimentos` como agregados calculados pela API (não são colunas físicas).

---

## Seção 1 — Banco da Plataforma (`arkeflow_platform`)

### `lojas`
> Criada em 001. Alterada em 013 (endereço, logo, link) e 014 (dados fiscais).

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `nome` | TEXT | NOT NULL |
| `cnpj` | TEXT | UNIQUE |
| `telefone` | TEXT | |
| `email` | TEXT | |
| `banco_id` | TEXT | NOT NULL UNIQUE — nome do banco PostgreSQL da loja |
| `status` | TEXT | NOT NULL DEFAULT `'ativo'` — CHECK: `ativo`, `inativo`, `suspenso` |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| `logo_url` | TEXT | URL pública da logo (013) |
| `link_loja` | TEXT | Futuro subdomínio/domínio próprio (013) |
| `cep` | TEXT | (013) |
| `logradouro` | TEXT | (013) |
| `numero` | TEXT | (013) |
| `complemento` | TEXT | (013) |
| `bairro` | TEXT | (013) |
| `cidade` | TEXT | (013) |
| `estado` | CHAR(2) | (013) |
| `regime_tributario` | VARCHAR(30) | MEI, Simples Nacional, Lucro Presumido, Lucro Real (014) |
| `certificado_digital_path` | TEXT | Nome original do arquivo .pfx/.p12 (014) |
| `certificado_digital_senha` | TEXT | Senha do certificado — criptografar antes de emitir NF-e (014) |

---

### `planos`
> Criada em 002.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `nome` | TEXT | NOT NULL |
| `preco_mensal` | NUMERIC(10,2) | NOT NULL |
| `max_usuarios` | INT | NOT NULL DEFAULT 5 |
| `franquia_notas` | INT | NOT NULL DEFAULT 0 |
| `tem_financeiro` | BOOLEAN | NOT NULL DEFAULT false |
| `tem_cashback` | BOOLEAN | NOT NULL DEFAULT false |
| `tem_promocoes` | BOOLEAN | NOT NULL DEFAULT false |
| `ativo` | BOOLEAN | NOT NULL DEFAULT true |

---

### `assinaturas`
> Criada em 003.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `loja_id` | UUID | NOT NULL REFERENCES lojas(id) |
| `plano_id` | UUID | NOT NULL REFERENCES planos(id) |
| `inicio` | DATE | NOT NULL |
| `vencimento` | DATE | NOT NULL |
| `status` | TEXT | NOT NULL DEFAULT `'ativa'` — CHECK: `ativa`, `trial`, `suspensa`, `cancelada` |

---

### `pacotes_nota`
> Criada em 004.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `loja_id` | UUID | NOT NULL REFERENCES lojas(id) |
| `quantidade` | INT | NOT NULL |
| `utilizadas` | INT | NOT NULL DEFAULT 0 |
| `valor_pago` | NUMERIC(10,2) | NOT NULL |
| `validade` | DATE | NOT NULL |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

---

### `usuarios`
> Criada em 005. Alterada em 006 (permissoes), 007 (horário), 010 (modelo_permissao_id), 012 (username).

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `loja_id` | UUID | REFERENCES lojas(id) — NULL para admin_plataforma |
| `nome` | TEXT | NOT NULL |
| `email` | TEXT | NOT NULL UNIQUE |
| `senha_hash` | TEXT | NOT NULL |
| `nivel` | TEXT | NOT NULL — CHECK: `admin_plataforma`, `parceiro`, `dono_loja`, `vendedor` |
| `ativo` | BOOLEAN | NOT NULL DEFAULT true |
| `ultimo_acesso` | TIMESTAMPTZ | |
| `permissoes` | JSONB | NOT NULL DEFAULT `'[]'` — array de slugs (006) |
| `dias_semana` | JSONB | Ex: `[1,2,3,4,5]`; NULL = sem restrição (007) |
| `hora_inicio` | TIME | NULL = sem restrição (007) |
| `hora_fim` | TIME | NULL = sem restrição (007) |
| `modelo_permissao_id` | UUID | REFERENCES modelos_permissao(id) (010) |
| `username` | TEXT | UNIQUE — alternativa ao email no login (012) |

---

### `logs_acesso`
> Criada em 007.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `usuario_id` | UUID | NOT NULL REFERENCES usuarios(id) |
| `loja_id` | UUID | REFERENCES lojas(id) |
| `ip` | TEXT | |
| `tipo` | TEXT | NOT NULL — CHECK: `login`, `logout` |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

---

### `colaboradores_perfil`
> Criada em 008.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `usuario_id` | UUID | NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE |
| `cpf` | TEXT | |
| `rg` | TEXT | |
| `data_nascimento` | DATE | |
| `telefone` | TEXT | |
| `cargo` | TEXT | Ex: Vendedor, Caixa, Gerente |
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
| `pix` | TEXT | Chave PIX |
| `data_admissao` | DATE | |
| `salario` | NUMERIC(10,2) | |
| `tipo_contrato` | TEXT | CHECK: `clt`, `pj`, `mei`, `autonomo`, `estagio`, `outro` |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| `atualizado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

---

### `colaboradores_documentos`
> Criada em 009.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `usuario_id` | UUID | NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE |
| `nome` | TEXT | NOT NULL — nome de exibição do arquivo |
| `arquivo` | TEXT | NOT NULL — caminho no servidor |
| `tipo_mime` | TEXT | |
| `tamanho` | INT | Tamanho em bytes |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

---

### `modelos_permissao`
> Criada em 010. Alterada em 011 (flag `sistema`).

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `loja_id` | UUID | NOT NULL REFERENCES lojas(id) ON DELETE CASCADE |
| `nome` | TEXT | NOT NULL |
| `permissoes` | JSONB | NOT NULL DEFAULT `'[]'` |
| `sistema` | BOOLEAN | NOT NULL DEFAULT false — modelos do sistema não são editáveis (011) |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

---

### `lojas_contatos`
> Criada em 013.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `loja_id` | UUID | NOT NULL REFERENCES lojas(id) ON DELETE CASCADE |
| `tipo` | TEXT | NOT NULL — CHECK: `comercial`, `financeiro`, `socio` |
| `nome` | TEXT | NOT NULL |
| `telefone` | TEXT | |
| `email` | TEXT | |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

---

## Seção 2 — Banco da Loja (`loja_XXXXX`)

### `produtos`
> Criada em 001. Alterada em 009 (tipo_id, composicao), 013 (composicao_itens), 017 (codigo), 026 (arquivado), 028 (genero), 030 (campos fiscais).

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `nome` | TEXT | NOT NULL |
| `categoria` | TEXT | Legado — substituído por `tipo_id` |
| `marca` | TEXT | |
| `descricao` | TEXT | |
| `preco_base` | NUMERIC(10,2) | NOT NULL |
| `foto_url` | TEXT | |
| `controle_estoque` | BOOLEAN | NOT NULL DEFAULT true |
| `ativo` | BOOLEAN | NOT NULL DEFAULT true |
| `tipo_id` | UUID | REFERENCES tipos_produto(id) (009) |
| `composicao` | TEXT | Legado — substituído por `composicao_itens` (009) |
| `composicao_itens` | JSONB | NOT NULL DEFAULT `'[]'` — array `{material, percentual}` (013) |
| `codigo` | TEXT | SKU/referência interna (017) |
| `arquivado` | BOOLEAN | NOT NULL DEFAULT false — soft delete (026) |
| `genero` | TEXT | Ex: Masculino, Feminino, Unissex (028) |
| `ncm` | VARCHAR(10) | Nomenclatura Comum do Mercosul (030) |
| `cfop` | VARCHAR(10) | Código Fiscal de Operações e Prestações (030) |
| `origem_mercadoria` | SMALLINT | 0–8 conforme tabela ICMS (030) |
| `csosn` | VARCHAR(10) | Código de Situação da Operação — Simples Nacional (030) |
| `cst` | VARCHAR(10) | Código de Situação Tributária — Lucro Presumido/Real (030) |
| `icms_st` | DECIMAL(5,2) | Alíquota ICMS-ST em % (030) |
| `ipi` | DECIMAL(5,2) | Alíquota IPI em % (030) |
| `pis` | DECIMAL(5,2) | Alíquota PIS em % (030) |
| `cofins` | DECIMAL(5,2) | Alíquota COFINS em % (030) |

---

### `atributos_produto`
> Criada em 001.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `produto_id` | UUID | NOT NULL REFERENCES produtos(id) ON DELETE CASCADE |
| `nome` | TEXT | NOT NULL — Ex: `Tamanho`, `Cor` |

---

### `versoes`
> Criada em 001. Alterada em 017 (codigo_barras), 026 (arquivado).

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `produto_id` | UUID | NOT NULL REFERENCES produtos(id) ON DELETE CASCADE |
| `atributos_json` | JSONB | NOT NULL DEFAULT `'{}'` — Ex: `{"Tamanho":"M","Cor":"Azul"}` |
| `preco_especifico` | NUMERIC(10,2) | Sobrescreve preco_base se preenchido |
| `estoque_atual` | INT | NOT NULL DEFAULT 0 |
| `estoque_minimo` | INT | NOT NULL DEFAULT 0 |
| `ativo` | BOOLEAN | NOT NULL DEFAULT true |
| `codigo_barras` | TEXT | EAN-13, QR, etc. (017) |
| `arquivado` | BOOLEAN | NOT NULL DEFAULT false — soft delete (026) |

---

### `regras_cashback`
> Criada em 002. Alterada em 014 (validade_meses).

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `nome` | TEXT | NOT NULL |
| `percentual` | NUMERIC(5,2) | NOT NULL DEFAULT 0 |
| `padrao` | BOOLEAN | NOT NULL DEFAULT false — apenas uma pode ser padrão |
| `ativo` | BOOLEAN | NOT NULL DEFAULT true |
| `validade_meses` | INT | NULL = sem vencimento (014) |

---

### `clientes`
> Criada em 002. Alterada em 015 (ativo), 020 (medidas_json), 027 (arquivado).

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `nome` | TEXT | NOT NULL |
| `telefone` | TEXT | |
| `cpf` | TEXT | UNIQUE |
| `email` | TEXT | |
| `regra_cashback_id` | UUID | REFERENCES regras_cashback(id) |
| `saldo_cashback` | NUMERIC(10,2) | NOT NULL DEFAULT 0 |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| `ativo` | BOOLEAN | NOT NULL DEFAULT true (015) |
| `medidas_json` | JSONB | DEFAULT `'{}'` — medidas corporais (020) |
| `arquivado` | BOOLEAN | NOT NULL DEFAULT false — soft delete (027) |

---

### `clientes_contatos`
> Criada em 021.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `cliente_id` | UUID | NOT NULL REFERENCES clientes(id) ON DELETE CASCADE |
| `tipo` | TEXT | NOT NULL — CHECK: `comercial`, `financeiro`, `socio` |
| `nome` | TEXT | NOT NULL |
| `telefone` | TEXT | |
| `email` | TEXT | |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

---

### `formas_pagamento`
> Criada em 003. Seed padrão inserido em 007 (Dinheiro, PIX, Débito, Crédito, Crediário).

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `nome` | TEXT | NOT NULL |
| `tipo` | TEXT | NOT NULL — `dinheiro`, `pix`, `debito`, `credito`, `crediario`, `outro` |
| `padrao_sistema` | BOOLEAN | NOT NULL DEFAULT false — registros padrão não são excluídos |
| `desconto_percentual` | NUMERIC(5,2) | NOT NULL DEFAULT 0 |
| `desconto_maximo` | NUMERIC(10,2) | NOT NULL DEFAULT 0 — 0 = sem limite |
| `ativo` | BOOLEAN | NOT NULL DEFAULT true |

---

### `vendas`
> Criada em 004. Alterada em 025 (vendedor_id, vendedor_nome).

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `cliente_id` | UUID | REFERENCES clientes(id) |
| `usuario_id` | UUID | NOT NULL — ref plataforma, sem FK real |
| `promocao_id` | UUID | |
| `subtotal` | NUMERIC(10,2) | NOT NULL |
| `desconto_promocao` | NUMERIC(10,2) | NOT NULL DEFAULT 0 |
| `desconto_pagamento` | NUMERIC(10,2) | NOT NULL DEFAULT 0 |
| `cashback_usado` | NUMERIC(10,2) | NOT NULL DEFAULT 0 |
| `total` | NUMERIC(10,2) | NOT NULL |
| `cashback_gerado` | NUMERIC(10,2) | NOT NULL DEFAULT 0 |
| `status` | TEXT | NOT NULL DEFAULT `'finalizada'` — CHECK: `finalizada`, `cancelada`, `pendente_sync` |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| `vendedor_id` | UUID | ID do vendedor na plataforma (025) |
| `vendedor_nome` | TEXT | Nome desnormalizado para exibição (025) |

---

### `itens_venda`
> Criada em 004.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `venda_id` | UUID | NOT NULL REFERENCES vendas(id) ON DELETE CASCADE |
| `versao_id` | UUID | NOT NULL REFERENCES versoes(id) |
| `quantidade` | INT | NOT NULL |
| `preco_unitario` | NUMERIC(10,2) | NOT NULL |
| `desconto_item` | NUMERIC(10,2) | NOT NULL DEFAULT 0 |

---

### `pagamentos_venda`
> Criada em 004.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `venda_id` | UUID | NOT NULL REFERENCES vendas(id) ON DELETE CASCADE |
| `forma_pagamento_id` | UUID | NOT NULL REFERENCES formas_pagamento(id) |
| `valor` | NUMERIC(10,2) | NOT NULL |
| `parcelas` | INT | NOT NULL DEFAULT 1 |
| `detalhe` | TEXT | |

---

### `parcelas_crediario`
> Criada em 004. Gerada apenas quando a forma de pagamento é crediário.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `pagamento_venda_id` | UUID | NOT NULL REFERENCES pagamentos_venda(id) ON DELETE CASCADE |
| `numero_parcela` | INT | NOT NULL |
| `valor` | NUMERIC(10,2) | NOT NULL |
| `vencimento` | DATE | NOT NULL |
| `pago_em` | DATE | |
| `status` | TEXT | NOT NULL DEFAULT `'pendente'` — CHECK: `pendente`, `pago`, `vencido` |

---

### `historico_cashback`
> Criada em 004.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `cliente_id` | UUID | NOT NULL REFERENCES clientes(id) |
| `venda_id` | UUID | REFERENCES vendas(id) |
| `tipo` | TEXT | NOT NULL — CHECK: `ganho`, `resgate` |
| `valor` | NUMERIC(10,2) | NOT NULL |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

---

### `notas_fiscais`
> Criada em 004. Integração NF-e ainda não implementada.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `venda_id` | UUID | NOT NULL REFERENCES vendas(id) |
| `tipo` | TEXT | NOT NULL — CHECK: `nfe`, `nfce` |
| `numero` | TEXT | |
| `chave_acesso` | TEXT | UNIQUE |
| `status` | TEXT | NOT NULL DEFAULT `'pendente'` — CHECK: `pendente`, `autorizada`, `rejeitada`, `cancelada` |
| `xml_url` | TEXT | |
| `emitida_em` | TIMESTAMPTZ | |

---

### `lancamentos`
> Criada em 004 (junto com financeiro).

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `tipo` | TEXT | NOT NULL — CHECK: `entrada`, `saida` |
| `descricao` | TEXT | NOT NULL |
| `valor` | NUMERIC(10,2) | NOT NULL |
| `venda_id` | UUID | REFERENCES vendas(id) — NULL para lançamentos manuais |
| `data` | DATE | NOT NULL DEFAULT CURRENT_DATE |
| `categoria` | TEXT | |
| `status` | TEXT | NOT NULL DEFAULT `'realizado'` — CHECK: `realizado`, `pendente` |

---

### `promocoes`
> Criada em 006. Alterada em 018 (aplicacao, quantidade_compre) e 019 (categorias_alvo, aplica_todos, codigo).

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `nome` | TEXT | NOT NULL |
| `tipo` | TEXT | NOT NULL — CHECK: `desconto_percentual`, `desconto_fixo`, `segunda_peca`, `compre_ganhe`, `primeira_compra` |
| `valor_desconto` | NUMERIC(10,2) | |
| `unidade` | TEXT | `reais` ou `percentual` |
| `quantidade_minima` | INT | |
| `quantidade_brinde` | INT | |
| `percentual_brinde` | NUMERIC(5,2) | |
| `inicio` | DATE | |
| `fim` | DATE | |
| `categoria_alvo` | TEXT | Legado — substituído por `categorias_alvo` |
| `ativo` | BOOLEAN | NOT NULL DEFAULT true |
| `aplicacao` | TEXT | DEFAULT `'produtos_selecionados'` — CHECK: `produtos_selecionados`, `categoria`, `todos` (018) |
| `quantidade_compre` | INT | X em "compre X leve Y" (018) |
| `categorias_alvo` | JSONB | DEFAULT `'[]'` — múltiplas categorias (019) |
| `aplica_todos` | BOOLEAN | NOT NULL DEFAULT false (019) |
| `codigo` | TEXT | Código promocional futuro (019) |

---

### `promocoes_produtos`
> Criada em 006.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `promocao_id` | UUID | NOT NULL REFERENCES promocoes(id) ON DELETE CASCADE |
| `produto_id` | UUID | NOT NULL REFERENCES produtos(id) ON DELETE CASCADE |
| — | — | UNIQUE (promocao_id, produto_id) |

---

### `tipos_produto`
> Criada em 008. Seeds inseridos em 009.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `nome` | TEXT | NOT NULL UNIQUE |
| `ativo` | BOOLEAN | NOT NULL DEFAULT true |

---

### `tamanhos`
> Criada em 008. Seeds inseridos em 009 (PP–4XG, 34–54, 2–16, Único).

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `nome` | TEXT | NOT NULL UNIQUE |
| `ordem` | INT | NOT NULL DEFAULT 0 — controla exibição |
| `ativo` | BOOLEAN | NOT NULL DEFAULT true |

---

### `cores`
> Criada em 008. Seeds inseridos em 009 (26 cores básicas com hex).

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `nome` | TEXT | NOT NULL UNIQUE |
| `hex_cor` | TEXT | Código hexadecimal — NULL para estampado/mescla |
| `ativo` | BOOLEAN | NOT NULL DEFAULT true |

---

### `composicoes`
> Criada em 008. Seeds inseridos em 009 (13 composições padrão).

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `nome` | TEXT | NOT NULL UNIQUE |
| `ativo` | BOOLEAN | NOT NULL DEFAULT true |

---

### `medidas`
> Criada em 011. Seeds inseridos em 011 (9 medidas corporais padrão).

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `nome` | TEXT | NOT NULL UNIQUE |
| `ativo` | BOOLEAN | NOT NULL DEFAULT true |

---

### `ajustes_estoque`
> Criada em 016.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `versao_id` | UUID | NOT NULL REFERENCES versoes(id) |
| `tipo` | TEXT | NOT NULL — CHECK: `entrada`, `saida`, `ajuste` |
| `quantidade` | INT | NOT NULL |
| `motivo` | TEXT | |
| `usuario_id` | UUID | NOT NULL — ref plataforma, sem FK real |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

---

### `configuracoes_loja`
> Criada em 017 (singleton — sempre 1 linha). Alterada em 022 (logo_url, link_loja).

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `controle_estoque` | BOOLEAN | NOT NULL DEFAULT true |
| `atualizado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| `logo_url` | TEXT | (022) |
| `link_loja` | TEXT | (022) |

---

### `turnos_caixa`
> Criada em 023.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `usuario_id` | UUID | NOT NULL — quem abriu o caixa |
| `saldo_inicial` | NUMERIC(10,2) | NOT NULL DEFAULT 0 |
| `saldo_final` | NUMERIC(10,2) | Preenchido no fechamento |
| `observacao` | TEXT | |
| `status` | TEXT | NOT NULL DEFAULT `'aberto'` — CHECK: `aberto`, `fechado` |
| `aberto_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| `fechado_em` | TIMESTAMPTZ | |

---

### `movimentos_caixa`
> Criada em 023.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `turno_id` | UUID | NOT NULL REFERENCES turnos_caixa(id) |
| `tipo` | TEXT | NOT NULL — CHECK: `sangria`, `suprimento` |
| `valor` | NUMERIC(10,2) | NOT NULL |
| `motivo` | TEXT | |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

---

### `sacolas`
> Criada em 024.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `criado_por` | UUID | usuario_id da plataforma |
| `nome_vendedor` | TEXT | Desnormalizado para exibição rápida |
| `cliente_id` | UUID | |
| `cliente_nome` | TEXT | |
| `status` | TEXT | NOT NULL DEFAULT `'aguardando'` — CHECK: `aguardando`, `em_atendimento`, `finalizada`, `cancelada` |
| `observacao` | TEXT | |
| `criado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| `atualizado_em` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

---

### `sacola_itens`
> Criada em 024.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `sacola_id` | UUID | NOT NULL REFERENCES sacolas(id) ON DELETE CASCADE |
| `versao_id` | UUID | NOT NULL — sem FK (cross-table lookup) |
| `produto_id` | UUID | NOT NULL — sem FK (cross-table lookup) |
| `nome` | TEXT | NOT NULL — desnormalizado |
| `atributos` | JSONB | NOT NULL DEFAULT `'{}'` |
| `preco_unitario` | NUMERIC(10,2) | NOT NULL |
| `quantidade` | INTEGER | NOT NULL DEFAULT 1 |
| `codigo_barras` | TEXT | |

---

### `fornecedores`
> Criada em 029.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID PK | `DEFAULT uuid_generate_v4()` |
| `razao_social` | TEXT | NOT NULL |
| `nome_fantasia` | TEXT | |
| `cnpj` | TEXT | UNIQUE |
| `email` | TEXT | |
| `telefones` | JSONB | NOT NULL DEFAULT `'[]'` — array de strings |
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
