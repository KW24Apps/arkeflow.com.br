# ARKEflow — Contexto do Projeto

> Atualizado em 2026-06-06 (sessão 2 — reflete estado pós-build do módulo Caixa/PDV).

---

## Visão Geral

ARKEflow é um SaaS de gestão para lojas de varejo (roupas, calçados, acessórios). Cada loja contratante recebe um banco PostgreSQL isolado (`loja_XXXXX`), provisionado automaticamente no cadastro. O painel roda em `app.arkeflow.com.br` (apontando para o VPS em 192.168.3.70).

**Público-alvo:** donos de pequenas e médias lojas físicas de moda, com foco em usabilidade mobile (PDV touch-friendly) e controle financeiro básico.

---

## Estado Atual (2026-06-06)

### Módulos funcionais

| Módulo | Backend | Frontend | Observações |
|--------|---------|----------|-------------|
| Autenticação | ✓ | ✓ | JWT em cookie, controle de horário por colaborador |
| Produtos | ✓ | ✓ | Variações, composição, campos fiscais, soft delete |
| Catálogos | ✓ | ✓ | Tipos, tamanhos, cores, composições, medidas |
| Clientes | ✓ | ✓ | Medidas corporais, contatos, soft delete |
| Estoque | ✓ | ✓ | Ajustes manuais, alertas de mínimo |
| Financeiro | ✓ | ✓ | Lançamentos, contas a receber, formas de pagamento |
| Vendas / PDV | ✓ | ✓ | CheckoutModal multi-método, cashback, promoções, sacolas, carrinho persistido em localStorage |
| Caixa | ✓ | ✓ | Turno scoped por usuario_id; sidebar modular (4 módulos); modal boas-vindas; CurrencyInput; página de resumo com histórico de vendas do turno |
| Colaboradores | ✓ | ✓ | Perfil completo, documentos, modelos de permissão |
| Promoções | ✓ | ✓ | Card grid redesenhado, inline form, busca em tempo real, ordenação por vencimento |
| Configurações | ✓ | ✓ | Dados da loja, regime tributário, certificado digital, logo |
| Fornecedores | ✓ | ✓ | CRUD com CNPJ, endereço, múltiplos telefones |
| NF-e / NFC-e | ✗ | ✗ | Tabela `notas_fiscais` criada, integração pendente |

### Design system

Todas as telas do painel seguem o padrão **Ocean Glass**:
- Cards: `rgba(8,18,30,0.48)` + `backdrop-blur(8px)` + borda `0.5px rgba(255,255,255,0.09)`
- Inputs/selects: `rgba(8,18,30,0.5)` + borda `0.5px rgba(255,255,255,0.12)`, foco em `rgba(0,239,255,0.4)`
- Accent: `#0ef` (electric cyan)
- Tipografia de label: `9px uppercase letter-spacing 0.1em rgba(255,255,255,0.35)`
- Componentes reutilizáveis: `GlassInput`, `GlassSelect` (global em `components/ui/`), `CurrencyInput` (entrada de centavos right-to-left, local em `caixa/page.tsx`)

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

---

## Próximas tarefas (backlog ordenado por prioridade)

### PDV / Checkout (curto prazo)

1. **Formas de pagamento — ordem fixa e desabilitar botão** — forçar exibição na ordem Dinheiro → PIX → Débito → Crédito → Crediário; desabilitar o botão "Fechar venda" enquanto sem itens.

2. **Promoções aplicadas automaticamente na venda** — o motor de cálculo (`calcularDesconto`) já existe; falta garantir que o backend aplique os descontos no registro da venda.

3. **Fluxo especial de crediário** — tela de entrada + parcelas com data de vencimento; validação de cliente obrigatório; geração de `parcelas_crediario`.

4. **Cashback no checkout** — toggle para usar saldo; abatimento automático do total.

5. **Múltiplos métodos de pagamento em uma venda** — já estruturado no CheckoutModal; validar fluxo completo (backend + histórico).

6. **Parcelamento de cartão de crédito** — UI de seleção de parcelas + envio do número de parcelas para o backend.

7. **Desconto máximo = menor limite entre as formas usadas** — regra de negócio a implementar no CheckoutModal quando há múltiplos métodos.

8. **Cliente opcional no checkout** — permitir finalizar venda sem cliente selecionado (sem cashback, sem promoção de primeira compra).

### Backoffice (médio prazo)

9. **Estoque — Entrada de mercadoria** — formulário vinculado a fornecedor, atualiza estoque das versões, gera lançamento financeiro de saída.

10. **CEP — preenchimento automático de endereço** — integrar ViaCEP nos formulários de cliente, colaborador e configurações da loja.

11. **Glass pattern nas telas pendentes** — revisar cadastros/tipos, cadastros/cores, cadastros/tamanhos.

### Futuro

12. **Relatórios** — produtos mais vendidos, fluxo financeiro, clientes com saldo.

13. **Caixa — dashboard gerencial** — visão consolidada de turnos para o dono da loja.

14. **NF-e / NFC-e** — integrar provedor (Nuvem Fiscal ou similar); campos fiscais já presentes em `produtos` e `lojas`.

15. **Tour de produto / onboarding** — guia interativo para novos usuários.

16. **Mensagens de boas-vindas configuráveis** — banco de frases no banco da plataforma em vez de hardcoded.

---

## Decisões técnicas relevantes

- **Multi-tenant por banco isolado** — escolhido em vez de schema-per-tenant ou row-level security para máxima isolação e facilidade de backup/restore por loja.
- **`SELECT *` no repositório de produtos** — aceito deliberadamente para evitar quebra ao adicionar colunas; a migração adiciona `IF NOT EXISTS`, tornando o processo seguro.
- **`composicao_itens JSONB`** — substituiu o campo `composicao TEXT` (livre) para permitir cálculo de percentuais e validação dos 100%.
- **`vendedor_id` sem FK** — usuários vivem no banco da plataforma; a venda registra apenas o ID e o nome desnormalizado (`vendedor_nome`) para evitar JOIN cross-database.
- **Regime tributário lido da loja no frontend** — a página de produto faz uma chamada extra a `/dados-loja` para saber se deve exibir o card Fiscal e qual conjunto de campos mostrar (CSOSN para Simples Nacional; CST + alíquotas para Lucro Presumido/Real).
- **Certificado digital** — armazenado em `/uploads/certificados/{loja_id}.{ext}` no servidor; a senha é gravada em texto no banco (criptografia em repouso deve ser implementada antes da emissão real de NF-e).
