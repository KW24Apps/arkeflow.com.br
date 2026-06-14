# ARKEflow — Contexto do Projeto

> Atualizado em 2026-06-14 (sessões 11–14 — fix caixa fan-out, mobile relatorio.tsx + OTA, resumo viewMode, platform migs 018–020, tenant migs 055–057).

---

## Visão Geral

ARKEflow é um SaaS de gestão para lojas de varejo (roupas, calçados, acessórios). Cada loja contratante recebe um banco PostgreSQL isolado (`loja_XXXXX`), provisionado automaticamente no cadastro.

**Domínios:**
- `arkeflow.com.br` — empresa mãe / plataforma SaaS; painel web roda em `app.arkeflow.com.br` (VPS 192.168.3.70)
- `arkevest.com.br` — app mobile para vendedores de campo (React Native / Expo)

**Público-alvo:** donos de pequenas e médias lojas físicas de moda, com foco em usabilidade mobile (PDV touch-friendly) e controle financeiro básico.

---

## ARKEVest — App Mobile

App React Native construído com Expo SDK 54, distribuído via EAS Build (APK Android) e atualizado via EAS Update (OTA). Vendedores externos usam o app para criar sacolas, adicionar produtos e gerenciar clientes sem precisar acessar o painel web.

**Contas:**
- expo.dev: `gabriel.acker@gmail.com`, organização: `arkeflow`, projeto: `arkevest`
- Play Store: `gabriel.acker@gmail.com` (conta criada, taxa de $25 paga)
- EAS project ID: `83cd8f1c-59e2-42f2-b7c0-c1a7a2be891e`

**Build atual:** APK `c39157fd` · runtime `1.0.0` · branch `preview`

---

## Estado Atual (2026-06-14)

### Módulos funcionais

| Módulo | Backend | Frontend | Observações |
|--------|---------|----------|-------------|
| Autenticação | ✓ | ✓ | JWT em cookie, controle de horário por colaborador |
| Produtos | ✓ | ✓ | Variações, composição, campos fiscais, soft delete; `aceita_desconto` por produto (mig 033); `codigo_barras` em produto e versão com índice único (mig 035); busca two-level: versão > produto |
| Catálogos | ✓ | ✓ | Tipos, tamanhos, cores, composições, medidas |
| Clientes | ✓ | ✓ | Medidas corporais, contatos, soft delete; endereço completo (cep…estado, mig 036); ViaCEP auto-fill em ClienteDadosModal; crédito liberado + limite (`clientes_credito`, mig 038) — disponível calculado; obrigatório CPF + endereço quando ativo |
| Estoque | ✓ | ✓ | Ajustes manuais, alertas de mínimo |
| Financeiro | ✓ | ✓ | Lançamentos, contas a receber, formas de pagamento |
| Formas de pagamento | ✓ | ✓ | `formas_pagamento.ativo` é a única fonte de verdade para habilitar/desabilitar no caixa; `aceita_desconto` controla se desconto é aplicável; colunas de desconto per-forma removidas do tenant (mig 037) |
| Vendas / PDV | ✓ | ✓ | CheckoutModal multi-método, cashback, promoções, sacolas, carrinho persistido em localStorage; troco gravado por pagamento; motor de desconto de caixa no CheckoutModal (teto % e R$ + toggle com/sem + restrição por forma); ClienteDadosModal (edição de dados do cliente dentro do PDV); scan two-level com prefixo de quantidade (`3-7891234`) |
| Caixa | ✓ | ✓ | Turno scoped por usuario_id; "Caixa em dinheiro" = saldo_inicial + vendas_dinheiro + suprimentos − sangrias; `GET /caixa/vendas` usa subquery correlacionada para pagamentos (evita fan-out N×M); página de resumo com lógica de viewMode corrigida (useEffect por `[ehOperador, temVendas]`) |
| Colaboradores | ✓ | ✓ | Perfil completo, documentos, modelos de permissão |
| Promoções | ✓ | ✓ | Status redesign completo: Ativas/Finalizadas (tabs URL-based via topbar), cards por status (Em execução/Agendadas/Encerradas), badge "DD/MM · Xd", Encerrar + Duplicar; accordion seletor por tipo; conflito com aviso (1 produto + 2+ produtos); `primeira_compra` bloqueada se já existe uma ativa (API + frontend); date picker abre no click; tipo bloqueado na edição; cross-page Duplicar via `?dup=<id>` param |
| Configurações / Sistema | ✓ | ✓ | Layout de cards quadrados (Logo, Estoque, Desconto, Supervisão) + painel full-width expansível; clica no card para abrir, clica novamente para fechar; nada aberto por padrão. Supervisão: toggle-mãe, senha mestra bcrypt, supervisores chips + modal Gerenciar, toggles de ações protegidas (fechar falta, fechar sobra, cancelar item). Migs 044 + platform 015. |
| Configurações / Dados da loja | ✓ | ✓ | Regime tributário, certificado digital, logo |
| Fornecedores | ✓ | ✓ | CRUD com CNPJ, endereço, múltiplos telefones |
| Ajuda (Suporte / Tutoriais / Novidades) | — | ✓ | Páginas web-only na seção Ajuda da sidebar |
| Crediário | ✓ | ✓ | Peça A + Peça B concluídas. Peça A: `clientes_credito`, colunas `crediario_*` em `configuracoes_loja`, `parcelas_crediario.cliente_id`. Peça B: fluxo de checkout com tela de entrada (valor + forma) + geração de `parcelas_crediario`, juros calculados, seleção de parcelas no cartão. Config migrada para `formas_pagamento.config` JSONB (mig 042/043). |
| Supervisão | ✓✓ | ✓✓ | Config: card Supervisão em Configurações/Sistema; toggle-mãe, senha mestra bcrypt, chips de supervisores, toggles de ações protegidas. Caixa: modal auth gate em cancelar item e fechar com divergência; valida supervisor (senha) ou senha mestra; grava `autorizacoes_log`; dono e supervisores não precisam de senha para cancelar item; justificativa obrigatória no fechamento com divergência. Migs 044–046 (tenant) + 015 (platform). |
| Atalhos do caixa | ✓✓ | ✓✓ | F2–F10 padrão hardcoded no frontend. Config de atalhos Alt+letra/número armazenada em `atalhos_caixa JSONB` (mig 048). Overlay fullscreen de captura ao editar. Conflito de teclas bloqueado silenciosamente. |
| Sangria com limite | ✓✓ | ✓✓ | Partes 1+2: limite configurável (valor + fundo de troco + modo avisar/obrigar); modo obrigar trava a venda sem escapatória (não cancelável por Esc/backdrop, persiste no reload); mig 047. |
| Cashback | ✓✓ | ✓✓ | Config completa: 8 colunas em `configuracoes_loja` (mig 050); card Cashback em Configurações/Sistema; habilitar/desabilitar + regras (promoção, desconto, crediário) + limite (livre/percentual) + carência (dias) + validade (meses). Checkout: toggle dentro do CheckoutModal com elegibilidade calculada; `cashbackAplicado` deduzido de `totalFinal`; FIFO por lote com `disponivel_a_partir_de` e `expira_em` (mig 049). Geração de cashback na venda gateada por `cashback_habilitado`. Resumo da venda: linha "Cashback usado" exibida quando `cashback_usado > 0`. |
| NF-e / NFC-e | ✗ | ✗ | Tabela `notas_fiscais` criada, integração pendente |

### Design system

Todas as telas do painel seguem o padrão **Ocean Glass**:
- Cards: `rgba(8,18,30,0.48)` + `backdrop-blur(8px)` + borda `0.5px rgba(255,255,255,0.09)`
- Inputs/selects: `rgba(8,18,30,0.5)` + borda `0.5px rgba(255,255,255,0.12)`, foco em `rgba(0,239,255,0.4)`
- Accent: `#0ef` (electric cyan)
- Tipografia de label: `9px uppercase letter-spacing 0.1em rgba(255,255,255,0.35)`
- Componentes reutilizáveis em `components/ui/`: `Button`, `Input`, `GlassSelect`, `CurrencyInput` (centavos right-to-left), `ConfirmModal`

---

## Migrations executadas até agora

### Platform (`arkeflow_platform`)

| # | Arquivo | O que faz |
|---|---------|-----------|
| 001 | `create_lojas` | Tabela `lojas` (id, nome, cnpj, banco_id, status) |
| 002 | `create_planos` | Tabela `planos` (franquias, flags de features) |
| 003 | `create_assinaturas` | Tabela `assinaturas` (loja ↔ plano) |
| 004 | `create_pacotes_nota` | Tabela `pacotes_nota` (créditos NF adicionais) |
| 005 | `create_usuarios` | Tabela `usuarios` (auth + nível de acesso) |
| 006 | `usuarios_permissoes` | Adiciona coluna `permissoes JSONB` aos usuários |
| 007 | `seguranca_acesso` | Restrição de horário, tabela `logs_acesso` |
| 008 | `colaboradores_perfil` | Tabela `colaboradores_perfil` (dados pessoais/empregatícios) |
| 009 | `colaboradores_documentos` | Tabela `colaboradores_documentos` (upload de arquivos) |
| 010 | `modelos_permissao` | Tabela `modelos_permissao`, FK `modelo_permissao_id` em usuarios |
| 011 | `modelos_sistema` | Flag `sistema` em modelos de permissão (não editáveis) |
| 012 | `usuarios_username` | Coluna `username` opcional para login alternativo |
| 013 | `lojas_config` | Endereço da loja, `logo_url`, `link_loja`, tabela `lojas_contatos` |
| 014 | `lojas_fiscal` | Regime tributário, caminho e senha do certificado digital |
| 015 | `usuarios_is_supervisor` | Adiciona `is_supervisor BOOLEAN NOT NULL DEFAULT false` a `usuarios` |
| 016 | `usuarios_sessao` | Adiciona `sessao_atual UUID`, `sessao_ip TEXT`, `sessao_em TIMESTAMPTZ` a `usuarios` — controle de sessão ativa |
| 017 | `usuarios_sessao_plataforma` | Adiciona `sessao_plataforma TEXT CHECK ('web','mobile','desktop')` a `usuarios` — sessão mobile não conflita com web/desktop |
| 018 | `usuarios_sessao_split` | Substitui sessão unificada por colunas per-plataforma: `sessao_web/ip/em` + `sessao_mobile/ip/em` em `usuarios` |
| 019 | `usuarios_ultimo_acesso_split` | Adiciona `ultimo_acesso_web TIMESTAMPTZ` + `ultimo_acesso_mobile TIMESTAMPTZ` a `usuarios` |
| 020 | `logs_acesso_plataforma_motivo` | Adiciona `plataforma TEXT` + `motivo TEXT` a `logs_acesso` |

### Tenant (`loja_XXXXX`)

| # | Arquivo | O que faz |
|---|---------|-----------|
| 001 | `create_produtos` | Tabelas `produtos`, `atributos_produto`, `versoes` |
| 002 | `create_clientes` | Tabelas `clientes`, `regras_cashback` |
| 003 | `create_formas_pagamento` | Tabela `formas_pagamento` |
| 004 | `create_vendas` | Tabelas `vendas`, `itens_venda`, `pagamentos_venda`, `parcelas_crediario`, `historico_cashback`, `notas_fiscais`, `lancamentos` |
| 005 | `create_financeiro` | (incluído em 004) |
| 006 | `create_promocoes` | Tabelas `promocoes`, `promocoes_produtos` |
| 007 | `seed_formas_pagamento` | Insere Dinheiro, PIX, Débito, Crédito, Crediário |
| 008 | `create_catalogos` | Tabelas `tipos_produto`, `tamanhos`, `cores`, `composicoes` |
| 009 | `update_produtos_catalogos` | FK `tipo_id` em produtos; seeds de tipos, tamanhos, cores, composições |
| 010 | `seed_catalogos` | (incluído em 009) |
| 011 | `create_medidas` | Tabela `medidas`; seeds de medidas corporais padrão |
| 012 | `seed_medidas` | (incluído em 011) |
| 013 | `composicao_itens` | Substitui `composicao TEXT` por `composicao_itens JSONB` |
| 014 | `cashback_validade` | Coluna `validade_meses` em `regras_cashback` |
| 015 | `clientes_ativo` | Coluna `ativo` em `clientes` |
| 016 | `ajustes_estoque` | Tabela `ajustes_estoque` (entrada, saída, ajuste manual) |
| 017 | `configuracoes_e_codigos` | Tabela `configuracoes_loja`; código/SKU em produtos; código de barras em versões |
| 018 | `update_promocoes` | Adiciona `aplicacao` e `quantidade_compre` em promoções |
| 019 | `promocoes_multicategoria` | Adiciona `categorias_alvo`, `aplica_todos`, `codigo` em promoções |
| 020 | `clientes_medidas` | Coluna `medidas_json JSONB` em clientes |
| 021 | `clientes_contatos` | Tabela `clientes_contatos` |
| 022 | `configuracoes_logo` | Colunas `logo_url` e `link_loja` em `configuracoes_loja` |
| 023 | `turnos_caixa` | Tabelas `turnos_caixa`, `movimentos_caixa` |
| 024 | `sacolas` | Tabelas `sacolas`, `sacola_itens` |
| 025 | `add_vendedor_to_vendas` | Colunas `vendedor_id`, `vendedor_nome` em vendas |
| 026 | `soft_delete_produtos` | Coluna `arquivado` em `produtos` e `versoes` |
| 027 | `soft_delete_clientes` | Coluna `arquivado` em `clientes` |
| 028 | `produtos_genero` | Coluna `genero` em `produtos` |
| 029 | `create_fornecedores` | Tabela `fornecedores` (razão social, CNPJ, endereço, telefones JSONB) |
| 030 | `produtos_fiscal` | Campos fiscais em produtos: `ncm`, `cfop`, `origem_mercadoria`, `csosn`, `cst`, `icms_st`, `ipi`, `pis`, `cofins` |
| 031 | `pagamentos_venda_troco` | Colunas `valor_recebido` e `troco` em `pagamentos_venda` — registra troco por pagamento em dinheiro |
| 032 | `desconto_global_e_aceita_desconto` | Colunas `desconto_max_percentual`, `desconto_max_valor`, `promocao_aceita_desconto` em `configuracoes_loja`; coluna `aceita_desconto` em `formas_pagamento` |
| 033 | `produtos_aceita_desconto` | Coluna `aceita_desconto BOOLEAN NOT NULL DEFAULT true` em `produtos` — controla se itens do produto participam do teto de desconto no caixa |
| 034 | `configuracoes_desconto_restringe_formas` | Coluna `desconto_restringe_formas BOOLEAN NOT NULL DEFAULT false` em `configuracoes_loja` — quando true, formas com `aceita_desconto = false` são ocultadas do CheckoutModal ao aplicar desconto |
| 035 | `produto_codigo_barras` | Coluna `codigo_barras TEXT` em `produtos` (barcode universal do produto); índices únicos parciais em `produtos.codigo_barras` e `versoes.codigo_barras` (apenas quando NOT NULL) |
| 036 | `clientes_endereco` | Colunas de endereço em `clientes`: `cep`, `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `estado CHAR(2)` |
| 037 | `drop_formas_pagamento_dead_discount_cols` | Remove `desconto_percentual` e `desconto_maximo` de `formas_pagamento` |
| 038 | `create_clientes_credito` | Tabela `clientes_credito` (PK = cliente_id, `credito_liberado`, `limite`) |
| 039 | `configuracoes_crediario` | Adiciona 11 colunas `crediario_*` a `configuracoes_loja` (+ `crediario_habilitado`, removida em 041) |
| 040 | `parcelas_crediario_cliente_id_indexes` | Coluna `cliente_id` em `parcelas_crediario` + 2 índices de performance |
| 041 | `drop_crediario_habilitado` | Remove `crediario_habilitado` de `configuracoes_loja` (modelo simplificado: presença de crediário como forma implica habilitado) |
| 042 | `formas_pagamento_config` | Adiciona `config JSONB NOT NULL DEFAULT '{}'` a `formas_pagamento` — armazena configurações específicas por forma (crediário, cartão) |
| 043 | `migrate_crediario_config_to_forma` | Migra config do crediário das colunas `crediario_*` em `configuracoes_loja` para `formas_pagamento.config` da forma tipo `crediario` |
| 044 | `supervisao_configuracoes` | Adiciona 6 colunas de supervisão a `configuracoes_loja`: `supervisao_habilitada`, `senha_mestra_habilitada`, `senha_mestra_hash`, `exige_auth_fechar_falta`, `exige_auth_fechar_sobra`, `exige_auth_cancelar_item` |
| 045 | `create_autorizacoes_log` | Cria tabela `autorizacoes_log`: log de cada autorização concedida no caixa (ação, método, supervisor_id, autorizado_nome, justificativa, turno_id, detalhe JSONB) |
| 046 | `turnos_caixa_divergencia` | Adiciona 4 colunas a `turnos_caixa`: `valor_esperado`, `divergencia`, `divergencia_justificativa`, `autorizacao_id` FK → autorizacoes_log |
| 047 | `configuracoes_sangria_limite` | Adiciona 4 colunas a `configuracoes_loja`: `sangria_limite_habilitado`, `sangria_limite_valor`, `sangria_fundo_troco`, `sangria_limite_modo` (avisar/obrigar) |
| 048 | `configuracoes_atalhos_caixa` | Adiciona `atalhos_caixa JSONB NOT NULL DEFAULT '{}'` a `configuracoes_loja` |
| 049 | `historico_cashback_datas` | Adiciona `disponivel_a_partir_de DATE` e `expira_em DATE` a `historico_cashback` — suporte a carência e validade por lote (FIFO) |
| 050 | `configuracoes_cashback` | Adiciona 8 colunas de config de cashback a `configuracoes_loja`: `cashback_habilitado`, `cashback_aceita_promocao`, `cashback_aceita_desconto`, `cashback_aceita_crediario`, `cashback_limite_modo`, `cashback_limite_percentual`, `cashback_carencia_dias`, `cashback_validade_meses` |
| 051 | `fix_primeira_compra_aplicacao` | Data fix: seta `aplicacao = 'todos'` e `aplica_todos = true` em promoções `primeira_compra` existentes com aplicação incorreta |
| 052 | `itens_venda_promocao_nome` | Adiciona `promocao_nome TEXT` a `itens_venda` — desnormalização do nome da promoção aplicada para histórico de vendas |
| 053 | `fix_categorias_alvo_empty_object` | Data fix: corrige rows onde `categorias_alvo` foi gravada como `{}` (objeto vazio) em vez de `[]` (array vazio) |
| 054 | `promocoes_encerrada` | Adiciona `encerrada BOOLEAN NOT NULL DEFAULT false` a `promocoes` — flag de encerramento definitivo (diferente de `ativo = false` que pode ser reativado) |
| 055 | `configuracoes_inatividade` | Adiciona `inatividade_minutos INTEGER NOT NULL DEFAULT 360` a `configuracoes_loja` |
| 056 | `configuracoes_cadastro_cliente` | Adiciona 8 flags a `configuracoes_loja`: `cadastro_exige_cpf/email/endereco`, `crediario_exige_email/endereco`, `prova_exige_cpf/email/endereco` |
| 057 | `vendas_turno_id` | Adiciona `turno_id UUID REFERENCES turnos_caixa(id)` + índice a `vendas` — vincula venda ao turno do operador no momento da finalização |

---

## Próximas tarefas (roadmap V1 — meta 08/08/2026)

### Curto prazo (sessão atual / próxima)

1. **Padronização de cards** — config/catálogo; alinhamento visual entre telas (prazo: 12–13/06)

2. **Estoque — revisar layout + funções** (14–16/06)

3. **Financeiro — revisar layout + funções** (17–20/06)

4. **Relatórios — revisar layout + funções** (21–22/06)

5. **Sacolas + Prova em Casa (web)** — revisar módulos existentes (tabelas `sacolas` + `sacola_itens` desde mig 024; rotas em `sacolas.routes.ts`); integrar com PDV (23–27/06)

### Médio prazo

6. **NF-e / NFC-e** — integrar Focus NFe; campos fiscais já em `produtos` e `lojas`; tabela `notas_fiscais` criada (28/06–04/07)

7. **Pagamento integrado (maquininha)** (05–09/07)

8. **App mobile V1** (10–18/07)

9. **App desktop (Electron, offline)** (19–26/07)

10. **Painel ADM** (27/07–02/08)

11. **Site institucional** (paralelo, aos poucos)

### Backlog V1 (entra durante o cronograma)

- Permissões de colaborador (menu/submenu + casos isolados)
- Sidebar: item ativo destacado + recolher/expandir
- Date picker reformado (todo o sistema)
- Resumo bloquear sem turno aberto
- Baixa de estoque na venda (confirmar se já funciona)

### V2+ (depois do lançamento)

- Multi-loja/filial (sessão dedicada)
- Crediário rede (crédito compartilhado entre filiais)
- WhatsApp integrado + chat interno
- Redesenho completo de layout/home
- Relatórios avançados / dashboard gerencial
- Onboarding/tour + mensagens de boas-vindas
- Supervisor na criação de colaborador

---

## Decisões técnicas relevantes

- **Multi-tenant por banco isolado** — escolhido em vez de schema-per-tenant ou row-level security para máxima isolação e facilidade de backup/restore por loja.
- **`SELECT *` no repositório de produtos** — aceito deliberadamente para evitar quebra ao adicionar colunas; a migração adiciona `IF NOT EXISTS`, tornando o processo seguro.
- **`composicao_itens JSONB`** — substituiu o campo `composicao TEXT` (livre) para permitir cálculo de percentuais e validação dos 100%.
- **`vendedor_id` sem FK** — usuários vivem no banco da plataforma; a venda registra apenas o ID e o nome desnormalizado (`vendedor_nome`) para evitar JOIN cross-database.
- **Regime tributário lido da loja no frontend** — a página de produto faz uma chamada extra a `/dados-loja` para saber se deve exibir o card Fiscal e qual conjunto de campos mostrar (CSOSN para Simples Nacional; CST + alíquotas para Lucro Presumido/Real).
- **Certificado digital** — armazenado em `/uploads/certificados/{loja_id}.{ext}` no servidor; a senha é gravada em texto no banco (criptografia em repouso deve ser implementada antes da emissão real de NF-e).
- **Desconto global (032)** — o modelo de desconto foi migrado: a loja configura um teto global (% e R$) e cada forma de pagamento tem flag `aceita_desconto`. As colunas antigas `desconto_percentual` / `desconto_maximo` em `formas_pagamento` foram mantidas no banco mas o código não as usa.
- **`calcularDesconto.ts`** — motor de cálculo de desconto por promoções (client-side); não confundir com `calcularDescontoPagamento.ts` (este foi removido — era o motor per-forma depreciado).
- **Motor de desconto de caixa (checkout)** — separado do motor de promoções: lê `configuracoes_loja` + `formas_pagamento.aceita_desconto` + `produto.aceita_desconto` no momento da abertura do CheckoutModal. Teto = `min(baseElegivel × pct%, R$ teto)`. Toggle "Sem/Com desconto" é um choice único no header; ao selecionar, apaga pagamentos registrados e refiltra formas permitidas.
- **`tipo_id` obrigatório em produtos** — Zod schema exige UUID válido para `tipo_id` tanto no create quanto no update. A coluna na DB é nullable (migration 009 usou `ADD COLUMN` sem NOT NULL), mas a API rejeita produtos sem tipo.
- **Scan two-level com prefixo de quantidade** — input do PDV aceita formato `N-CODIGO` (ex: `3-7891234`) para adicionar N unidades de uma vez. Busca: variação exata primeiro, depois produto universal; single-variation vai direto pro carrinho, multi-variation abre o picker.
- **`ClienteDadosModal`** — modal fixo `zIndex: 200` (acima do TopBar em 100) para edição inline de dados do cliente durante a venda. Salva apenas colunas escalares (`telefone`, `email`, não arrays). ViaCEP busca ao sair do campo CEP ou ao clicar Buscar.
- **"Caixa em dinheiro"** no resumo do turno = `saldo_inicial + Σ(vendas em dinheiro) + Σ(suprimentos) − Σ(sangrias)`, calculado no frontend via dados do turno.
