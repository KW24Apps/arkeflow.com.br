# ARKEflow — Checklist de Implementação

> Ordem: Backend → Frontend por fase. Cada fase deve ser testada antes de avançar.
> Comentários no código: pontuais e curtos — explicar o **porquê** de um trecho não óbvio, nunca descrever o que o código já diz por si.

---

## FASE 0 — Setup e Infraestrutura Base

### Backend
- [ ] Inicializar projeto Node.js + TypeScript (`/backend`)
- [ ] Escolher e configurar framework HTTP (Fastify recomendado pela performance)
- [ ] Estrutura de pastas: `routes / controllers / services / repositories / middlewares`
- [ ] Configurar conexão PostgreSQL com pool (pg + variáveis de ambiente)
- [ ] Sistema de roteamento multi-tenant: por requisição, resolver qual banco usar via `banco_id` da loja
- [ ] Migration banco da plataforma: `lojas`, `planos`, `assinaturas`, `pacotes_nota`, `usuarios`
- [ ] Seed inicial: planos padrão + usuário `admin_plataforma`
- [ ] Script de provisionamento de banco por loja (criar schema + migrations ao cadastrar loja)
- [ ] Configurar `.env` e `.env.example`

### Frontend
- [ ] Inicializar projeto Next.js + TypeScript (`/frontend`)
- [ ] Configurar Tailwind CSS com tokens de cor da marca (ver `/docs/design-tokens`)
- [ ] Carregar fonte Inter via `next/font`
- [ ] Criar `globals.css` com variáveis CSS da paleta ARKEflow
- [ ] Estrutura de pastas: `app / components / lib / hooks / store`

---

## FASE 1 — Autenticação e Sessão

### Backend
- [ ] `POST /auth/login` — valida email+senha no banco da plataforma, retorna JWT
- [ ] JWT payload: `{ id, email, nivel, loja_id, banco_id }`
- [ ] Middleware `auth` — valida token, injeta `req.user`
- [ ] Middleware `authorize(nivel[])` — rejeita nível insuficiente
- [ ] `POST /auth/refresh` — renovar token
- [ ] `POST /auth/logout`

### Frontend
- [ ] Tela de login com brand ARKEflow (fundo Midnight, CTA Electric Cyan)
- [ ] `AuthContext` — armazena token e dados do usuário logado
- [ ] Middleware Next.js — redireciona para `/pdv` se vendedor, `/painel` se dono
- [ ] HOC `withAuth` para rotas protegidas
- [ ] Interceptor HTTP — injeta token em todas as requisições

---

## FASE 2 — Cadastro de Produtos e Versões

### Backend
- [ ] `GET/POST /produtos`
- [ ] `GET/PUT/DELETE /produtos/:id`
- [ ] `POST /produtos/:id/atributos` — define quais atributos o produto usa
- [ ] `GET/POST /produtos/:id/versoes` — lista/cria versões
- [ ] `PUT/DELETE /versoes/:id`
- [ ] Lógica de preço: retornar `preco_especifico` se preenchido, senão `preco_base`
- [ ] Upload de foto (multer + salvar em `/uploads` ou S3)
- [ ] Validação: `atributos_json` deve bater com os `atributos_produto` do produto

### Frontend
- [ ] Listagem de produtos (tabela com busca e filtro por categoria/marca)
- [ ] Formulário criar/editar produto
- [ ] Interface de atributos: adicionar campos dinâmicos (tamanho, cor, modelo…)
- [ ] Interface de versões: combinar atributos → gerar grade de versões
- [ ] Upload e preview de foto
- [ ] Toggle `controle_estoque` com aviso de impacto

---

## FASE 3 — Controle de Estoque

### Backend
- [ ] `GET /estoque` — listagem com filtro por estoque baixo
- [ ] `POST /estoque/ajuste` — entrada/saída manual com motivo
- [ ] Endpoint de alertas: versões com `estoque_atual <= estoque_minimo`
- [ ] Estoque ignorado automaticamente quando `controle_estoque = false` no produto

### Frontend
- [ ] Dashboard de estoque com indicadores (normal / baixo / zerado)
- [ ] Formulário de ajuste manual
- [ ] Lista de alertas de estoque mínimo
- [ ] Filtro por categoria / marca

---

## FASE 4 — Cadastro de Clientes

### Backend
- [ ] `GET/POST /clientes`
- [ ] `GET/PUT/DELETE /clientes/:id`
- [ ] `GET /clientes/:id/historico` — compras + cashback
- [ ] Busca por nome, CPF ou telefone (usado no PDV)

### Frontend
- [ ] Listagem de clientes com busca rápida
- [ ] Formulário criar/editar cliente
- [ ] Perfil do cliente: histórico de compras, saldo cashback (Fase 2)

---

## FASE 5 — Formas de Pagamento

### Backend
- [ ] `GET /formas-pagamento`
- [ ] `POST /formas-pagamento` — cadastrar forma personalizada
- [ ] `PUT /formas-pagamento/:id`
- [ ] `DELETE /formas-pagamento/:id` — bloquear se `padrao_sistema = true`
- [ ] Lógica de desconto: aplicar o menor entre `desconto_percentual` e `desconto_maximo`

### Frontend
- [ ] Listagem com badge "padrão do sistema" (não deletável)
- [ ] Formulário criar/editar (tipo, desconto, limite)
- [ ] Visualização do desconto calculado por exemplo

---

## FASE 6 — PDV (Ponto de Venda) — CORE DO MVP

### Backend
- [ ] `GET /versoes/busca?q=` — busca por nome/código para o PDV
- [ ] `GET /versoes/:id` — dados completos da versão incluindo produto e preço
- [ ] `POST /vendas` — criar venda completa:
  - Validar estoque de cada versão (se `controle_estoque = true`)
  - Calcular desconto por promoção
  - Calcular desconto por forma de pagamento
  - Deduzir cashback se usado
  - Debitar estoque
  - Criar `itens_venda`
  - Criar `pagamentos_venda`
  - Criar `parcelas_crediario` se forma = crediário
  - Criar `lancamentos` de entrada
  - Calcular e registrar `cashback_gerado` em `historico_cashback`
- [ ] `GET /vendas/:id` — detalhe da venda finalizada
- [ ] `GET /vendas` — histórico de vendas

### Frontend (PWA — mobile first)
- [ ] Layout responsivo otimizado para celular
- [ ] Configurar PWA: `manifest.json`, service worker
- [ ] Tela de sacola: lista de itens + totalizador
- [ ] Busca de produto por texto
- [ ] Leitura de QR Code (via câmera do celular)
- [ ] Modal de seleção de versão (atributos disponíveis)
- [ ] Busca/seleção de cliente (opcional na venda)
- [ ] Seleção de formas de pagamento com split (múltiplas formas)
- [ ] Tela de fechamento: resumo com todos descontos separados
- [ ] Tela de venda finalizada com opção de emitir NF
- [ ] **Modo offline:** salvar venda em IndexedDB quando sem internet
- [ ] **Sincronização:** enviar vendas offline quando reconectar, tratar conflitos de estoque

---

## FASE 7 — Notas Fiscais

### Backend
- [ ] Integrar API terceirizada (Focus NFe ou eNotas)
- [ ] `POST /notas-fiscais/emitir` — montar payload da API com dados da venda
- [ ] Webhook/callback para atualizar status da NF
- [ ] Deduzir do pacote de notas da loja (`pacotes_nota.utilizadas++`)
- [ ] Bloquear emissão se loja sem pacote ativo
- [ ] `GET /notas-fiscais?venda_id=` — listar notas de uma venda

### Frontend
- [ ] Botão "Emitir NF" na tela de venda finalizada
- [ ] Indicador de status: aguardando / autorizada / rejeitada
- [ ] Link para XML / DANFE
- [ ] Alerta quando saldo de notas estiver baixo

---

## FASE 8 — Financeiro e Crediário

### Backend
- [ ] `GET /lancamentos` — fluxo de caixa com filtro por período/categoria/status
- [ ] `POST /lancamentos` — lançar despesa manual
- [ ] `PUT /lancamentos/:id` — editar/marcar como realizado
- [ ] `GET /crediario` — parcelas com filtro: pendente / vencido / pago
- [ ] `PUT /crediario/:id/pagar` — baixar parcela + gerar lançamento de entrada
- [ ] Relatório: saldo do caixa por período

### Frontend
- [ ] Dashboard financeiro: entradas / saídas / saldo
- [ ] Tabela de lançamentos com filtros
- [ ] Formulário de despesa manual
- [ ] Tela de crediário: parcelas agrupadas por cliente
- [ ] Ação de baixa de parcela

---

## FASE 9 — Painel do Dono (Relatórios)

### Backend
- [ ] `GET /relatorios/vendas` — total, ticket médio, por período
- [ ] `GET /relatorios/produtos` — mais vendidos, menos vendidos
- [ ] `GET /relatorios/faturamento` — por dia/semana/mês
- [ ] `GET /relatorios/clientes` — mais compradores

### Frontend
- [ ] Dashboard principal: cards com KPIs do dia/mês
- [ ] Gráfico de faturamento por período
- [ ] Ranking de produtos mais vendidos
- [ ] Exportar relatório (CSV básico)

---

## FASE 10 — Cashback (Fase 2 do produto)

### Backend
- [ ] `GET/POST/PUT /regras-cashback`
- [ ] Garantir que apenas uma regra seja `padrao = true`
- [ ] Cálculo de cashback embutido no `POST /vendas`
- [ ] Resgate de cashback: deduzir `saldo_cashback` do cliente na venda

### Frontend
- [ ] Tela de configuração de regras de cashback
- [ ] Exibir saldo cashback no perfil do cliente
- [ ] Opção de resgatar cashback no fechamento do PDV
- [ ] Histórico de cashback no perfil

---

## FASE 11 — Promoções (Fase 2 do produto)

### Backend
- [ ] `GET/POST/PUT /promocoes`
- [ ] Vincular produtos: `POST /promocoes/:id/produtos`
- [ ] Motor de promoções — calcular desconto no `POST /vendas`:
  - `desconto_fixo`
  - `desconto_percentual`
  - `compre_ganhe`
  - `segunda_peca`
  - `categoria`
- [ ] Validar datas de vigência

### Frontend
- [ ] Listagem de promoções ativas/inativas
- [ ] Formulário por tipo de promoção (campos dinâmicos por tipo)
- [ ] Seleção de produtos vinculados
- [ ] Exibição de promoção aplicada no PDV

---

## FASE 12 — Painel da Plataforma (admin_plataforma)

### Backend
- [ ] `GET/POST/PUT /admin/lojas`
- [ ] Provisionamento automático de banco ao criar loja
- [ ] `GET/POST/PUT /admin/planos`
- [ ] `GET/PUT /admin/assinaturas`
- [ ] `POST /admin/pacotes-nota` — registrar compra de pacote
- [ ] `GET /admin/usuarios` — todos os usuários de todas as lojas

### Frontend
- [ ] Painel admin separado (`/admin`)
- [ ] Lista de lojas com status de assinatura
- [ ] Cadastro de loja + criação de usuário dono
- [ ] Gestão de planos
- [ ] Gestão de pacotes de nota por loja

---

## Design Tokens — Referência Rápida

```css
/* Paleta ARKEflow */
--midnight:      #071828;   /* fundo principal */
--deep-ocean:    #0D2B45;   /* fundo secundário */
--ocean-depth:   #1A4F72;   /* azul primário */
--teal-current:  #1B8B9A;   /* secundário */
--electric-cyan: #00C8DC;   /* destaque / CTA */
--sea-foam:      #E8F4F8;   /* fundo claro */
--steel:         #5B8AA8;   /* texto secundário */
--mint-green:    #26FF93;   /* acento especial */

/* Gradiente principal */
--ocean-gradient: linear-gradient(135deg, #071828, #0D2B45, #1B8B9A);

/* Tipografia */
--font-main: 'Inter', system-ui, sans-serif;
/* ARKE: font-weight 800, uppercase | flow: font-weight 400, lowercase, color #00C8DC */
```

---

## Estrutura de Pastas — Monorepo

> Gerenciado com **pnpm workspaces** + **Turborepo**. Cada app é independente mas compartilha tipos via `packages/shared`.

```
arkeflow.com.br/                        ← raiz do monorepo
│
├── apps/
│   │
│   ├── api/                            ← Backend Node.js + Fastify
│   │   ├── src/
│   │   │   ├── app.ts                  ← instância Fastify, registra plugins e rotas
│   │   │   ├── server.ts               ← entry point (listen)
│   │   │   │
│   │   │   ├── config/
│   │   │   │   ├── env.ts              ← validação de variáveis de ambiente (zod)
│   │   │   │   ├── database.ts         ← pool de conexão PostgreSQL
│   │   │   │   └── jwt.ts              ← configuração do token
│   │   │   │
│   │   │   ├── core/                   ← infraestrutura compartilhada entre módulos
│   │   │   │   ├── tenant/
│   │   │   │   │   └── resolver.ts     ← resolve qual banco usar por requisição (via banco_id)
│   │   │   │   ├── middlewares/
│   │   │   │   │   ├── auth.ts         ← valida JWT, injeta req.user
│   │   │   │   │   └── authorize.ts    ← verifica nivel do usuário
│   │   │   │   └── errors/
│   │   │   │       ├── AppError.ts     ← classe base de erros da aplicação
│   │   │   │       └── handler.ts      ← error handler global do Fastify
│   │   │   │
│   │   │   ├── modules/                ← um diretório por domínio de negócio
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.routes.ts
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   └── auth.schema.ts  ← schemas Zod para validação de body/params
│   │   │   │   ├── produtos/
│   │   │   │   │   ├── produtos.routes.ts
│   │   │   │   │   ├── produtos.controller.ts
│   │   │   │   │   ├── produtos.service.ts
│   │   │   │   │   ├── produtos.repository.ts  ← queries SQL isoladas aqui
│   │   │   │   │   └── produtos.schema.ts
│   │   │   │   ├── versoes/            ← atributos + versoes de produto
│   │   │   │   ├── estoque/
│   │   │   │   ├── clientes/
│   │   │   │   ├── formas-pagamento/
│   │   │   │   ├── vendas/             ← módulo mais complexo (PDV core)
│   │   │   │   │   ├── vendas.routes.ts
│   │   │   │   │   ├── vendas.controller.ts
│   │   │   │   │   ├── vendas.service.ts       ← orquestra estoque, desconto, cashback, nf
│   │   │   │   │   ├── vendas.repository.ts
│   │   │   │   │   ├── vendas.schema.ts
│   │   │   │   │   └── engine/
│   │   │   │   │       ├── desconto.ts         ← motor de cálculo de descontos
│   │   │   │   │       ├── cashback.ts         ← cálculo e registro de cashback
│   │   │   │   │       └── promocoes.ts        ← motor de promoções
│   │   │   │   ├── crediario/
│   │   │   │   ├── financeiro/
│   │   │   │   ├── notas-fiscais/
│   │   │   │   ├── relatorios/
│   │   │   │   ├── cashback/           ← regras de cashback (Fase 2)
│   │   │   │   └── promocoes/          ← CRUD de promoções (Fase 2)
│   │   │   │
│   │   │   └── platform/               ← rotas exclusivas do banco da plataforma
│   │   │       ├── lojas/
│   │   │       │   ├── lojas.routes.ts
│   │   │       │   ├── lojas.service.ts
│   │   │       │   └── provisioner.ts  ← cria e migra banco da nova loja
│   │   │       ├── planos/
│   │   │       ├── assinaturas/
│   │   │       ├── pacotes-nota/
│   │   │       └── usuarios/
│   │   │
│   │   ├── migrations/
│   │   │   ├── platform/               ← migrations do banco central (numeradas)
│   │   │   │   ├── 001_create_lojas.sql
│   │   │   │   ├── 002_create_planos.sql
│   │   │   │   ├── 003_create_assinaturas.sql
│   │   │   │   ├── 004_create_pacotes_nota.sql
│   │   │   │   └── 005_create_usuarios.sql
│   │   │   └── tenant/                 ← migrations aplicadas em CADA banco de loja
│   │   │       ├── 001_create_produtos.sql
│   │   │       ├── 002_create_versoes.sql
│   │   │       ├── 003_create_clientes.sql
│   │   │       ├── 004_create_formas_pagamento.sql
│   │   │       ├── 005_create_vendas.sql
│   │   │       ├── 006_create_financeiro.sql
│   │   │       └── 007_seed_formas_pagamento.sql  ← seed das formas padrão
│   │   │
│   │   ├── seeds/
│   │   │   └── platform/
│   │   │       └── planos.sql          ← seed dos planos iniciais
│   │   │
│   │   ├── tests/
│   │   │   ├── unit/                   ← testa engine de desconto, cashback, etc.
│   │   │   └── integration/            ← testa rotas com banco real
│   │   │
│   │   ├── .env.example
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── web/                            ← Frontend Next.js 14+ (App Router)
│       ├── app/
│       │   ├── layout.tsx              ← root layout (fonte Inter, metadata)
│       │   ├── (auth)/                 ← rotas públicas (sem sidebar)
│       │   │   └── login/
│       │   │       └── page.tsx
│       │   ├── (pdv)/                  ← PWA do vendedor — mobile first
│       │   │   ├── layout.tsx          ← layout com nav bottom bar
│       │   │   ├── page.tsx            ← sacola / home do PDV
│       │   │   ├── busca/
│       │   │   └── venda/[id]/
│       │   ├── (painel)/               ← painel do dono_loja — web
│       │   │   ├── layout.tsx          ← layout com sidebar
│       │   │   ├── dashboard/
│       │   │   ├── produtos/
│       │   │   │   ├── page.tsx        ← listagem
│       │   │   │   ├── novo/
│       │   │   │   └── [id]/
│       │   │   ├── estoque/
│       │   │   ├── clientes/
│       │   │   ├── vendas/
│       │   │   ├── financeiro/
│       │   │   │   ├── caixa/
│       │   │   │   └── crediario/
│       │   │   ├── relatorios/
│       │   │   └── configuracoes/
│       │   │       ├── formas-pagamento/
│       │   │       ├── cashback/       ← Fase 2
│       │   │       └── promocoes/      ← Fase 2
│       │   └── (admin)/                ← painel admin_plataforma
│       │       ├── layout.tsx
│       │       ├── lojas/
│       │       ├── planos/
│       │       └── usuarios/
│       │
│       ├── components/
│       │   ├── ui/                     ← design system ARKEflow
│       │   │   ├── Button.tsx
│       │   │   ├── Input.tsx
│       │   │   ├── Card.tsx
│       │   │   ├── Badge.tsx
│       │   │   ├── Modal.tsx
│       │   │   ├── Table.tsx
│       │   │   └── index.ts            ← barrel export
│       │   ├── pdv/                    ← componentes exclusivos do PDV
│       │   │   ├── Sacola.tsx
│       │   │   ├── ProdutoCard.tsx
│       │   │   ├── QRScanner.tsx
│       │   │   └── SeletorVersao.tsx
│       │   └── painel/                 ← componentes do painel do dono
│       │       ├── Sidebar.tsx
│       │       ├── KPICard.tsx
│       │       └── GraficoVendas.tsx
│       │
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   ├── useOfflineSync.ts       ← lógica de sync offline/online
│       │   └── useToast.ts
│       │
│       ├── lib/
│       │   ├── api/                    ← clientes HTTP por módulo
│       │   │   ├── client.ts           ← axios/fetch base com interceptor de token
│       │   │   ├── produtos.ts
│       │   │   ├── vendas.ts
│       │   │   └── clientes.ts
│       │   ├── auth/
│       │   │   └── session.ts          ← helpers de leitura/escrita do token
│       │   └── offline/
│       │       ├── db.ts               ← instância do IndexedDB (idb)
│       │       ├── vendas.ts           ← salvar/ler vendas offline
│       │       └── sync.ts             ← lógica de sincronização + resolução de conflitos
│       │
│       ├── store/                      ← estado global (Zustand)
│       │   ├── auth.store.ts
│       │   └── sacola.store.ts         ← carrinho do PDV
│       │
│       ├── public/
│       │   ├── manifest.json           ← PWA manifest
│       │   └── sw.js                   ← service worker (gerado pelo next-pwa)
│       │
│       ├── styles/
│       │   └── globals.css             ← variáveis CSS da paleta ARKEflow
│       │
│       ├── next.config.ts
│       ├── tailwind.config.ts          ← tokens de cor mapeados da brand
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   └── shared/                         ← tipos TypeScript compartilhados entre api e web
│       ├── src/
│       │   ├── types/
│       │   │   ├── usuario.ts          ← NivelUsuario enum, Usuario interface
│       │   │   ├── produto.ts
│       │   │   ├── venda.ts
│       │   │   └── index.ts
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
│
├── docs/
│   ├── checklist_implementacao.md      ← este arquivo
│   ├── esquema_banco.html
│   └── projeto_sistema_loja.md
│
├── docker-compose.yml                  ← PostgreSQL local para desenvolvimento
├── .env.example                        ← variáveis globais do workspace
├── turbo.json                          ← pipeline de build/dev/test do Turborepo
├── pnpm-workspace.yaml                 ← declara apps/* e packages/*
└── package.json                        ← root do workspace
```

### Por que essa estrutura

| Decisão | Motivo |
|---|---|
| Monorepo pnpm + Turborepo | `api` e `web` compartilham tipos sem duplicação. Build e dev rodam em paralelo. |
| `packages/shared` | Um único lugar para interfaces de `Venda`, `Usuario`, `Produto` — sem divergência entre front e back. |
| Módulo por domínio (não por camada) | Cada módulo é auto-contido. Mudar `vendas/` não mexe em `clientes/`. |
| `repository.ts` por módulo | Queries SQL ficam isoladas, fácil de trocar ou testar. |
| `engine/` dentro de `vendas/` | Desconto, cashback e promoções são lógicas puras — testáveis sem HTTP. |
| `migrations/platform` vs `migrations/tenant` | Migrations do banco central nunca se misturam com as da loja. `provisioner.ts` aplica as `tenant/` ao criar cada loja. |
| Route groups Next.js `(pdv)` / `(painel)` / `(admin)` | Layouts completamente diferentes por nível de usuário, sem poluir a URL. |
| `lib/offline/` separado | Toda lógica de IndexedDB e sync fica isolada — não vaza para componentes. |
| `store/sacola.store.ts` (Zustand) | Estado do carrinho do PDV precisa persistir entre navegações sem re-fetch. |

---

## Deploy — VPS Único (Linux 8GB / 2 núcleos / 250GB SSD)

> Front e back rodam no mesmo servidor. Nginx atua como reverse proxy separando as requisições.
> Separação em servidores distintos é possível no futuro — a estrutura de monorepo já permite isso sem alteração de código, apenas mudança de infraestrutura (Nginx + env vars).

### Fluxo de requisição

```
Internet → Nginx (porta 443 / SSL)
              ├── /api/*   → Fastify (porta 3001, processo PM2)
              └── /*       → Next.js (porta 3000, processo PM2)
```

### Checklist de configuração do servidor

- [ ] Instalar Node.js LTS via `nvm`
- [ ] Instalar PostgreSQL e criar usuário dedicado para a aplicação
- [ ] Instalar Nginx
- [ ] Configurar SSL com Certbot (Let's Encrypt) para `arkeflow.com.br`
- [ ] Instalar PM2 globalmente (`npm i -g pm2`)
- [ ] Criar `ecosystem.config.js` na raiz com os dois processos:
  ```js
  module.exports = {
    apps: [
      { name: 'api', cwd: './apps/api', script: 'dist/server.js' },
      { name: 'web', cwd: './apps/web', script: 'node_modules/.bin/next', args: 'start' }
    ]
  }
  ```
- [ ] Configurar Nginx como reverse proxy:
  ```nginx
  # /api/* vai para o Fastify
  location /api/ {
    proxy_pass http://localhost:3001;
  }
  # todo o resto vai para o Next.js
  location / {
    proxy_pass http://localhost:3000;
  }
  ```
- [ ] Habilitar PM2 no startup do sistema (`pm2 startup`)
- [ ] Criar script de deploy: `git pull → pnpm install → pnpm build → pm2 reload all`
- [ ] Configurar backup automático do PostgreSQL (pg_dump + cron diário)
- [ ] Configurar `.env` de produção no servidor (nunca versionar)

### Separação de portas

| Serviço | Porta interna | Exposto externamente |
|---|---|---|
| Next.js | 3000 | Não — só via Nginx |
| Fastify API | 3001 | Não — só via Nginx |
| PostgreSQL | 5432 | Não — só local |
| Nginx | 80 / 443 | Sim |
