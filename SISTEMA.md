# ARKEflow — Documentação do Sistema

> Este arquivo descreve as regras de negócio, decisões de design e funcionamento de cada módulo.
> Deve ser atualizado a cada nova funcionalidade ou mudança de comportamento.
> Objetivo: permitir que qualquer novo contexto (novo chat, novo dev) entenda o sistema sem precisar ler o código.

---

## Arquitetura Geral

### Multi-tenant com banco isolado por loja
Cada loja cliente tem seu próprio banco PostgreSQL. O banco `arkeflow_platform` é o banco central da plataforma.

- **arkeflow_platform**: lojas, planos, assinaturas, usuarios, logs_acesso, modelos_permissao, colaboradores_perfil, colaboradores_documentos
- **loja_XXXXX** (um por loja): produtos, versoes, clientes, vendas, estoque, formas_pagamento, etc.

Quando uma nova loja é cadastrada, um novo banco é criado e as migrations de tenant são aplicadas automaticamente.

### Stack
- Backend: Node.js + Fastify v5 + TypeScript
- Frontend: Next.js 14 (App Router) + Tailwind CSS + Zustand
- Banco: PostgreSQL 14
- Monorepo: pnpm workspaces + Turborepo
- Deploy: VPS Linux, Nginx como proxy, PM2 como process manager

### URLs
- `app.arkeflow.com.br` → sistema (Next.js + API)
- `www.arkeflow.com.br` → página em construção (HTML estático)
- `/api/*` → Nginx faz proxy para Fastify porta 3001 (stripa o `/api/`)
- `/*` → Nginx serve Next.js porta 3000

---

## Autenticação e Sessão

### Login
- Campo aceita **email ou username** (username é opcional por usuário)
- Erros diferenciados: "Senha incorreta" vs "Entre em contato com o administrador"
- JWT com payload: `{ id, email, nivel, loja_id, banco_id, permissoes }`
- Token expira em 7 dias
- Ao logar: atualiza `ultimo_acesso` e grava em `logs_acesso` com IP

### Níveis de usuário
| Nível | Descrição |
|---|---|
| `admin_plataforma` | Dono da plataforma ARKEflow — acesso total |
| `dono_loja` | Primeiro usuário de cada loja — acesso total à loja |
| `vendedor` | Colaborador — acesso limitado pelos modelos de permissão |

### Logout
Ao sair: grava `tipo='logout'` em `logs_acesso`, limpa token e cookie.

### Restrição de horário (colaboradores)
Campos `dias_semana` (array 0-6), `hora_inicio`, `hora_fim` no usuário.
Se configurados, o login é bloqueado fora do período. Só se aplica ao nível `vendedor`.

---

## Permissões de Colaboradores

### Modelos de Permissão
Criados pelo `dono_loja` em Cadastro > Colaboradores > Modelos de Permissão.
Cada modelo tem um nome (ex: "Caixa") e uma lista de slugs de menu.
O modelo é vinculado ao colaborador via `modelo_permissao_id`.

**Modelo Administrador**: criado automaticamente por loja, `sistema=true`, não pode ser editado/deletado.

### Slugs de permissão disponíveis
```
dashboard | caixa | caixa/notas-fiscais
promocoes
estoque | estoque/alertas | estoque/ajustes
financeiro | financeiro/contas-receber
relatorios
cadastro-produtos | cadastro-produtos/lista | cadastro-produtos/tamanhos | cadastro-produtos/cores | cadastro-produtos/tipos | cadastro-produtos/composicoes | cadastro-produtos/medidas
cadastro-clientes | cadastro-clientes/lista | cadastro-clientes/cashback
cadastro-colaboradores | cadastro-colaboradores/permissoes
cadastro-financeiro
```

### Como funciona
- `['*']` = acesso total (dono_loja sempre recebe isso)
- Slug pai (ex: `caixa`) = acesso a toda a seção
- Sub-slug (ex: `caixa/notas-fiscais`) = acesso só àquela sub-página
- Se tem qualquer sub-slug, a seção aparece na sidebar
- A barra horizontal de sub-itens filtra pelo que o usuário tem permissão

### Visual no seletor
- ✓ cheio = acesso total a todos os sub-itens
- — traço = acesso parcial (alguns sub-itens marcados)
- vazio = sem acesso

---

## Navegação do Painel

### Estrutura
**Sidebar — Operacional:**
Dashboard → Caixa (sub: Notas Fiscais) → Promoções → Estoque (sub: Posição, Alertas, Ajustes) → Financeiro (sub: Fluxo de Caixa, Contas a Receber) → Relatórios

**Sidebar — Cadastro:**
Produtos (sub: Lista, Tamanhos, Cores, Tipos, Composições, Medidas) → Clientes (sub: Lista, Regras de Cashback) → Colaboradores (sub: Lista, Modelos de Permissão) → Financeiro (sub: Formas de Pagamento) → Configurações

**Rodapé sidebar:** ⚙️ Configurações · 🚪 Sair

### PDV (Vendedor - mobile)
Layout separado com bottom navigation. Acessa `/pdv`.
Não tem sidebar. Telas: Venda (sacola), Busca, Histórico.

---

## Produtos

### Estrutura de dados
- `produtos`: info principal (nome, tipo, marca, preço base, composição em JSON, controle_estoque, ativo)
- `atributos_produto`: quais atributos o produto usa (ex: "tamanho", "cor")
- `versoes`: cada combinação de atributos (ex: G/Azul). Tem `atributos_json`, `preco_especifico`, `estoque_atual`, `estoque_minimo`, `codigo_barras`

### Preço
Versão tem `preco_especifico` (opcional). Se vazio → usa `preco_base` do produto.

### Controle de estoque
- Global: `configuracoes_loja.controle_estoque` — se false, toda a loja ignora estoque
- Por produto: `produtos.controle_estoque` — override individual
- Lógica: `estoque_visivel = config_global AND produto.controle_estoque`

### Variações
Criadas uma a uma manualmente (não geração automática de combinações).
Cada variação pode ter: Tamanho (do catálogo), Cor (do catálogo), Medidas (de catálogo, armazenadas em `atributos_json`).

### Código de barras
Campo `codigo_barras` em cada versão. Endpoint `GET /produtos/barcode/:codigo` para busca pelo scanner do PDV.
O scanner envia o código + Enter → sistema identifica a variação automaticamente.

### Catálogos (por loja)
Tabelas: `tamanhos`, `cores`, `tipos_produto`, `composicoes`, `medidas`
Pré-populados com padrões brasileiros. Lojista pode adicionar/remover.

### Composição
Armazenada como JSON: `[{"material":"Algodão","percentual":70},{"material":"Poliéster","percentual":30}]`
Validação: soma dos percentuais deve ser 100%.

### Proteção de deleção
- Produto com vendas → só pode desativar (não deletar)
- Variação com vendas → só pode desativar
- Sem vendas → pode deletar permanentemente

### Toggle ativo/inativo
Na lista de produtos há toggle liga/desliga. Produtos inativos continuam visíveis para o dono (para reativar), mas não aparecem no PDV/catálogo.

---

## Clientes

### Dados
Nome (obrigatório), telefone, CPF, email, regra de cashback vinculada, saldo_cashback.

### Cashback
- Regras: nome, percentual, validade em meses (null = ilimitado), padrao (bool)
- Novo cliente → vinculado automaticamente à regra padrão
- Saldo: acumulado nas compras, pode ser usado como desconto no PDV
- Histórico por cliente em `historico_cashback`

### Perfil
Aba "Dados" + aba "Compras" (histórico de vendas com cashback gerado).

---

## Colaboradores

### Dados
Cadastro completo em abas: Acesso, Pessoal (CPF/RG/cargo/contrato/salário), Endereço, Bancário (conta/pix), Documentos (upload), Logs.

### Acesso
- Email único (obrigatório)
- Username (opcional, aceito no login junto com email)
- Toggle ativo/bloqueado no topo da aba Acesso
- Modelo de permissão (dropdown — não edição direta de checkboxes)
- Restrição de horário por dia da semana + hora entrada/saída

### Documentos
Upload de arquivos (PDF, imagem, Word) vinculados ao colaborador.
Armazenados em `/uploads/colaboradores/{usuario_id}/`.

### Proteção
- `dono_loja` nunca pode ser bloqueado nem deletado via interface
- Colaborador com histórico de acessos → só bloquear, não deletar
- Sem histórico → pode deletar permanentemente

### Logs de acesso
Cada login e logout é gravado em `logs_acesso` com IP e timestamp.
Dashboard mostra quem está "online agora" (último acesso < 30 minutos).

---

## Estoque

### Posição atual
Lista todas as variações com `controle_estoque = true`, ordenadas por alerta (estoque ≤ mínimo).

### Ajustes
Tipos: `entrada`, `saida`, `ajuste`.
Cada ajuste é gravado em `ajustes_estoque` com tipo, quantidade, motivo e usuário.
Não pode gerar saldo negativo (saída bloqueada se insuficiente).

### Alertas
Variações com `estoque_atual <= estoque_minimo` aparecem destacadas em amarelo.

---

## Financeiro

### Lançamentos
Toda venda finalizada gera automaticamente um lançamento de entrada.
Despesas são lançadas manualmente pelo dono.
Campos: tipo (entrada/saida), descrição, valor, data, categoria, status (realizado/pendente).

### Contas a Receber
Parcelas de crediário pendentes, filtráveis por status (pendente/vencido/pago).
Baixar uma parcela cria automaticamente um lançamento de entrada.

### Formas de Pagamento
5 formas padrão do sistema (Dinheiro, PIX, Débito, Crédito, Crediário) — `padrao_sistema=true`, não podem ser deletadas.
Lojista pode adicionar formas personalizadas.
Cada forma tem `desconto_percentual` e `desconto_maximo` — o menor dos dois é aplicado.

---

## Configurações da Loja

Tabela `configuracoes_loja` (um registro por banco de loja).
Campos atuais: `controle_estoque` (bool).
Acessível em Cadastro > Configurações.

---

## PDV / Caixa (A CONSTRUIR)

**Status:** esqueleto criado em `/pdv`, aguardando os pré-requisitos estarem prontos.

### Pré-requisitos necessários
Produtos ✓ | Clientes ✓ | Estoque ✓ | Formas de Pagamento ✓ | Promoções (pendente)

### Regras previstas
- Vendedor acessa pelo celular via `/pdv`
- Busca produto por nome ou leitura de código de barras (Enter = busca automática)
- Sem estoque (com controle ativo) → produto bloqueado no PDV
- Uma venda pode ter múltiplas formas de pagamento (split)
- Crediário gera parcelas em `parcelas_crediario`
- Venda finalizada → debita estoque + gera lançamento + calcula cashback
- Offline-first: vendas salvas em IndexedDB, sincronizadas ao reconectar
- Modo consinação ("levar para experimentar") → previsto para versão futura

---

## Promoções (A DISCUTIR/CONSTRUIR)

**Status:** menu criado na navegação, aguarda discussão antes de implementar.

### Tipos planejados
| Tipo | Descrição |
|---|---|
| `desconto_produto` | Desconto em produto(s) específico(s) — % ou valor |
| `desconto_categoria` | Desconto em categoria inteira |
| `segunda_peca` | 2ª peça com X% de desconto |
| `primeira_compra` | Desconto para cliente sem histórico |
| `compre_x_leve_y` | Compre X ganhe Y |
| `desconto_progressivo` | Mais itens = mais desconto |

### Campos previstos
nome, tipo, aplicacao (produto/categoria/todos), produtos_selecionados[], categoria_alvo, percentual_desconto, valor_desconto_fixo, quantidade_minima, quantidade_brinde, inicio, fim (null = sem vencimento), codigo (para cupom — futuro), ativo

---

## Relatórios (A CONSTRUIR)

**Status:** páginas stub criadas, sem dados reais ainda.
Sub-páginas planejadas: Vendas, Produtos, Financeiro, Clientes.

---

## Informações de Deploy

### VPS de teste
- IP local: 192.168.3.70 (porta SSH 4030, usuário kw24)
- Banco plataforma: `arkeflow_platform` (user: arkeflow, senha: arkeflow_dev)
- Banco loja teste: `loja_teste`
- Usuários teste: `admin@arkeflow.com.br` / `Admin@2025` e `dono@teste.com.br` / `123456`

### Fluxo de deploy
```
git push → SSH no VPS → git pull → pm2 restart arkeflow-api → migrate:platform/tenant → pnpm build → cp static files → pm2 restart arkeflow-web
```

### Variáveis de ambiente importantes
- `DATABASE_URL`: banco da plataforma
- `JWT_SECRET`: mesmo valor em API e web (para middleware Next.js validar token)
- `NEXT_PUBLIC_API_URL=/api` (relativo — funciona em qualquer domínio)

---

## Decisões Técnicas Importantes

| Decisão | Motivo |
|---|---|
| `usuario_id` em `vendas` sem FK | Usuário está no banco da plataforma, venda no banco da loja — cross-DB |
| `atributos_json` como JSONB | Flexibilidade para qualquer combinação de atributos sem schema fixo |
| `composicao_itens` como JSONB | Permite múltiplos materiais com percentual sem tabela extra |
| Token JWT no cookie + localStorage | Cookie para middleware Next.js (proteção de rotas), Zustand persist para o cliente |
| URL relativa `/api` | Funciona independente do domínio ou IP de acesso |
| `output: standalone` no Next.js | Deploy no VPS com PM2 sem dependência do node_modules completo |
| Soft delete em tudo | Preserva histórico — só deletar hard se sem vínculos em vendas |
