# ARKEflow — Snapshot Arquitetural

> Atualizado em 2026-06-12. Referência para desenvolvimento, bug fixes e deploys.

---

## 1. Tech Stack

| Camada | Tecnologia | Versão | Localização |
|--------|-----------|--------|------------|
| Backend API | Fastify + TypeScript | v5.0 | `apps/api/` |
| Frontend web | Next.js App Router + TypeScript | v14.2 | `apps/web/` |
| App mobile | Expo SDK + React Native | SDK 54 / RN 0.81.5 | `apps/mobile/` |
| Banco de dados | PostgreSQL (multi-tenant) | 16 | Local via Docker / VPS nativo |
| Estado web | Zustand | v4.5 | `apps/web/store/` |
| Estado mobile | Zustand | v5.0 | `apps/mobile/lib/store/` |
| HTTP Client | Axios | v1.7 | `apps/web/lib/api/` + `apps/mobile/lib/api/` |
| Autenticação | JWT (@fastify/jwt + jose) | — | Cookies (web), SecureStore (mobile), expiração 7d |
| Monorepo | Turborepo + pnpm workspaces | turbo v2 | `turbo.json` |
| Process Manager | PM2 | — | `ecosystem.config.js` |
| Reverse Proxy | Nginx | — | VPS `/var/www/arkeflow.com.br` |
| Build mobile | EAS Build | — | cloud APK; `eas build --profile preview` |
| OTA updates | EAS Update | — | JS-only; `eas update --branch preview` |
| Tipos compartilhados | @arkeflow/shared | — | `packages/shared/` |

---

## 2. Estrutura do Monorepo

```
arkeflow.com.br/
├── apps/
│   ├── api/                        # Backend Fastify
│   │   ├── src/
│   │   │   ├── server.ts           # Entry point (escuta 0.0.0.0:PORT)
│   │   │   ├── app.ts              # Builder: registra plugins e rotas
│   │   │   ├── config/
│   │   │   │   ├── env.ts          # Parser de variáveis de ambiente
│   │   │   │   └── database.ts     # Pool de conexão PostgreSQL
│   │   │   ├── core/
│   │   │   │   ├── errors/         # AppError + handler global
│   │   │   │   ├── tenant/         # Resolver multi-tenant
│   │   │   │   ├── middlewares/    # auth.ts + authorize.ts
│   │   │   │   └── guards/         # vinculo.ts
│   │   │   ├── modules/            # 13 módulos de domínio (cada um com .routes → .controller → .service → .repository)
│   │   │   │   ├── auth/
│   │   │   │   ├── produtos/       # inclui campos fiscais, aceita_desconto, codigo_barras (produto e versão)
│   │   │   │   ├── catalogos/
│   │   │   │   ├── clientes/       # inclui cashback.routes.ts; campos de endereço (cep…estado) em clientes
│   │   │   │   ├── estoque/
│   │   │   │   ├── financeiro/     # inclui formas-pagamento.routes.ts
│   │   │   │   ├── colaboradores/  # inclui documentos + modelos-permissao
│   │   │   │   ├── configuracoes/  # inclui dados-loja.routes.ts (campos fiscais + sistema)
│   │   │   │   ├── promocoes/      # status redesign: Ativas/Finalizadas/Encerrar/Duplicar; primeira_compra única
│   │   │   │   ├── vendas/
│   │   │   │   ├── caixa/
│   │   │   │   ├── sacolas/
│   │   │   │   └── fornecedores/
│   │   │   ├── platform/
│   │   │   │   └── lojas/provisioner.ts  # Provisionamento multi-tenant
│   │   │   └── scripts/
│   │   │       ├── migrate.ts      # Runner de migrations (platform/tenant)
│   │   │       ├── seed.ts         # Seeder
│   │   │       ├── create-admin.ts
│   │   │       └── cleanup-logs.ts
│   │   ├── migrations/
│   │   │   ├── platform/           # 15 arquivos SQL (001–015)
│   │   │   └── tenant/             # 54 arquivos SQL (001–054)
│   │   └── seeds/
│   │       └── platform/planos.sql
│   │
│   └── web/                        # Frontend Next.js
│       ├── app/
│       │   ├── (auth)/login/       # Rota pública
│       │   ├── (admin)/admin/      # Painel admin plataforma
│       │   ├── (painel)/painel/    # Painel do dono da loja
│       │   │   ├── dashboard/
│       │   │   ├── produtos/       # + novo/ + [id]/ (card Fiscal por regime)
│       │   │   ├── cadastros/      # tamanhos, cores, tipos, composições...
│       │   │   ├── clientes/       # + novo/ + [id]/ + cashback/
│       │   │   ├── estoque/        # + alertas/ + ajustes/
│       │   │   ├── financeiro/     # + contas-receber/
│       │   │   ├── configuracoes/  # geral, dados (campos fiscais), sistema, formas-pagamento
│       │   │   ├── colaboradores/  # + novo/ + [id]/ + permissoes/
│       │   │   ├── caixa/          # + resumo/ (histórico/stats do turno atual)
│       │   │   ├── prova-em-casa/  # gestão de itens em prova
│       │   │   ├── promocoes/      # + finalizadas/ (Ativas/Finalizadas tabs via URL)
│       │   │   ├── fornecedores/   # + novo/ + [id]/
│       │   │   ├── perfil/
│       │   │   ├── relatorios/     # produtos, financeiro, clientes
│       │   │   ├── suporte/        # seção Ajuda
│       │   │   ├── tutoriais/      # seção Ajuda
│       │   │   └── novidades/      # seção Ajuda
│       │   └── (pdv)/pdv/          # PDV mobile-first
│       │       ├── busca/
│       │       ├── produto/[id]/
│       │       ├── cliente/
│       │       ├── checkout/
│       │       ├── venda/[id]/
│       │       └── historico/
│       ├── components/
│       │   ├── ui/                 # Button, Input, CurrencyInput, GlassSelect, ConfirmModal
│       │   ├── layout/             # Sidebar, TopBar, PainelNav, SecondaryNav, KPICard, OceanBackground (rise+burst bubbles, no ring)
│       │   ├── pdv/                # BottomNav, CheckoutModal, CustomerSearchModal, SalespersonSearchModal, ClienteDadosModal...
│       │   └── painel/             # CatalogoCRUD, ComposicaoForm, ContatosForm, SeletorPermissoes...
│       ├── lib/
│       │   ├── api/                # client.ts (axios) + wrappers por módulo
│       │   ├── utils/atributos.ts  # atributosInline / atributosCompletos
│       │   ├── calcularDesconto.ts # motor de promoções (client-side)
│       │   ├── barcodeIndex.ts     # índice de código de barras local (PDV)
│       │   └── auth/session.ts
│       ├── store/                  # Zustand: auth, loja, pdv (persist localStorage 'pdv-store'), caixa, sacolas
│       ├── middleware.ts           # Protege /painel /pdv /admin via JWT cookie
│       └── next.config.mjs         # output: 'standalone'
│
│
│   └── mobile/                     # App mobile React Native (Expo SDK 54)
│       ├── app/
│       │   ├── _layout.tsx         # Root layout + OTA update check on launch
│       │   ├── (auth)/login.tsx    # Tela de login (JWT → SecureStore)
│       │   ├── (app)/_layout.tsx   # Auth guard (redireciona se não logado)
│       │   ├── (app)/index.tsx     # Home launcher (Vendas expandível + Clientes)
│       │   └── (app)/vendas/
│       │       └── sacolas/
│       │           ├── index.tsx   # Lista de sacolas
│       │           └── nova.tsx    # Nova sacola (placeholder)
│       ├── components/ui/Button.tsx
│       ├── constants/theme.ts      # Dark blue palette (bgGradientTop #0d1f3c, accent #00c8ff)
│       ├── lib/
│       │   ├── api/
│       │   │   ├── client.ts       # Axios + 401 interceptor (ignora /auth/login)
│       │   │   ├── auth.ts         # loginRequest (envia plataforma: 'mobile')
│       │   │   └── sacolas.ts      # CRUD sacolas
│       │   └── store/
│       │       └── auth.store.ts   # Zustand: token, usuario, sessaoAtiva (409 handler)
│       ├── app.json                # expo slug arkevest, runtimeVersion, updates.url
│       ├── eas.json                # profiles: preview (APK), production
│       └── metro.config.js         # watchFolders monorepo
│
├── packages/
│   └── shared/                     # Tipos TypeScript compartilhados
│       └── src/types/usuario.ts    # JwtPayload com campo plataforma?: 'web'|'mobile'|'desktop'
│
├── ecosystem.config.js             # PM2: arkeflow-api :3001 + arkeflow-web :3000
├── docker-compose.yml              # PostgreSQL 16 Alpine para dev local
├── turbo.json
├── pnpm-workspace.yaml
└── .env.example
```

---

## 3. Arquitetura Multi-Tenant

```
arkeflow_platform (banco único)
  └── lojas, planos, assinaturas, usuarios, permissoes, colaboradores_perfil...

loja_XXXXX (banco isolado por loja)
  └── produtos, clientes, vendas, estoque, financeiro, caixa, sacolas, fornecedores...
```

- O tenant é resolvido em toda requisição via `apps/api/src/core/tenant/resolver.ts`
- Provisionamento automático de banco ao cadastrar nova loja: `platform/lojas/provisioner.ts`
- `usuario_id` em `vendas` não tem FK real — o usuário mora no banco da plataforma
- Queries em `turnos_caixa` são sempre filtradas por `usuario_id` do JWT — cada colaborador vê apenas o seu próprio turno ativo
- `auth.service.ts` inclui `u.nome` no SELECT do login para popular o nome do usuário no JWT payload

**Session platform-aware:** o campo `plataforma` no body do login (`web` | `mobile` | `desktop`) determina se há conflito de sessão ativa. Regras: sessão mobile conflita apenas com outra mobile; sessão web/desktop conflita entre si mas NÃO com mobile. Implementado em `auth.service.ts::conflitaPlataforma()`. API retorna `409 SESSAO_ATIVA { code, ip, em }` quando conflito; mobile exibe Alert com opção de forçar.

**Padrão de módulo no backend:** cada módulo segue `.routes → .controller → .service → .repository` com validação Zod no `.schema`. Módulos simples (sem lógica de negócio complexa) omitem service/controller e encapsulam tudo em `.routes`.

---

## 11. Workflow Mobile (EAS)

```
Dev local:
  cd apps/mobile && pnpm expo start --tunnel   # QR code via ngrok

OTA update (90% dos casos — JS only, sem rebuild nativo):
  eas update --branch preview --message "descrição"
  → entregue automaticamente ao APK instalado na próxima abertura

Novo APK (mudanças nativas: permissões, plugins, SDK upgrade):
  eas build --platform android --profile preview --non-interactive
  → gera novo APK para download/instalação manual ou Play Store

Publicação Play Store:
  eas submit --platform android (ainda não configurado)
```

**Regra:** qualquer mudança de JS puro (telas, lógica, estilos) → `eas update`. Só vai para novo APK quando há mudança nativa.

---

## 4. Rotas da API (prefixos registrados em `app.ts`)

| Prefixo | Módulo | Banco |
|---------|--------|-------|
| `/auth` | Login / logout | platform |
| `/produtos` | CRUD de produtos (+ campos fiscais, aceita_desconto, codigo_barras); `GET /produtos/barcode/:codigo` (busca em dois níveis: variação → produto) | tenant |
| `/catalogos` | Catálogos (tamanhos, cores, tipos, composições, medidas) | tenant |
| `/clientes` | Clientes | tenant |
| `/cashback-regras` | Regras de cashback; `GET /cashback-regras/saldo/:clienteId` retorna saldo FIFO disponível (filtrado por `disponivel_a_partir_de` e `expira_em`) | tenant |
| `/estoque` | Estoque e ajustes | tenant |
| `/financeiro` | Contas a receber / fluxo de caixa | tenant |
| `/formas-pagamento` | Formas de pagamento (+ aceita_desconto, ativo) | tenant |
| `/colaboradores` | Colaboradores + documentos; `PUT /colaboradores/:id/supervisor` — liga/desliga flag `is_supervisor` | platform |
| `/modelos-permissao` | Modelos de permissão | platform |
| `/configuracoes-loja` | Configurações gerais da loja | tenant |
| `/dados-loja` | Dados cadastrais + fiscais + sistema (logo, estoque, desconto, supervisão); `GET /dados-loja/sistema` retorna `senha_mestra_definida: boolean` (nunca retorna o hash); PUT usa bcrypt para hash da senha mestra | platform + tenant |
| `/promocoes` | Promoções. `GET /` retorna `{ promocoes, tem_primeira_compra_ativa }`. `GET /ativas` (PDV). `GET /conflitos`. `PUT /:id/encerrar`. `POST /:id/duplicar`. `POST /` valida unicidade de primeira_compra | tenant |
| `/vendas` | Vendas / crediário | tenant |
| `/autorizacoes` | Auth gate de supervisão: `GET /autorizacoes/supervisores` (lista supervisores + `senha_mestra_disponivel`); `POST /autorizacoes/validar` (valida por senha_mestra ou supervisor, grava `autorizacoes_log`, retorna `autorizacao_id`) | tenant + platform |
| `/caixa` | Turnos de caixa; `GET /caixa/status` retorna `dinheiro_em_caixa` calculado no campo `turno.dinheiro_em_caixa` | tenant |
| `/sacolas` | Sacolas (carrinho PDV) | tenant |
| `/fornecedores` | Fornecedores | tenant |
| `/health` | Health check | — |

---

## 5. Mapeamento Local ↔ Servidor

```
LOCAL                                        SERVIDOR (192.168.3.70:4030)
─────────────────────────────────────────    ──────────────────────────────────────────
C:\VSCode\arkeflow.com.br      ↔  /var/www/arkeflow.com.br
  apps/api/dist/server.js                →  PM2 "arkeflow-api"   porta 3001
  apps/web/.next/standalone/             →  PM2 "arkeflow-web"   porta 3000
  ecosystem.config.js                    →  pm2 start ecosystem.config.js --env production
```

**Roteamento Nginx no servidor:**

```
Requisição entrante     Nginx encaminha para
──────────────────      ─────────────────────────────────────────
/api/*              →   http://127.0.0.1:3001  (remove prefixo /api)
/*                  →   http://127.0.0.1:3000  (Next.js standalone)
```

---

## 6. Variáveis de Ambiente

### Arquivos

| Arquivo | Versionado? | Observação |
|---------|------------|-----------|
| `.env.example` | Sim | Template — nunca valores reais |
| `apps/api/.env` | Não | Deve existir manualmente no servidor |
| `apps/web/.env.local` | Não | Deve existir manualmente no servidor |
| `ecosystem.config.js` | Sim | Seguro versionar |
| `apps/web/next.config.mjs` | Sim | `output: 'standalone'` crítico para VPS |

### Valores por ambiente

| Variável | Dev | Servidor |
|----------|-----|---------|
| `DATABASE_URL` | `postgresql://arkeflow:arkeflow_dev@localhost:5432/arkeflow_platform` | Mesmo host (localhost no VPS) |
| `JWT_SECRET` | dev secret | Secret forte (32+ chars), diferente do dev |
| `JWT_EXPIRES_IN` | `7d` | `7d` |
| `PORT` | `3001` | `3001` |
| `NODE_ENV` | `development` | `production` |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | `https://arkeflow.com.br/api` |

> **Atenção:** `NEXT_PUBLIC_API_URL` é compilado no bundle pelo Next.js. Qualquer alteração exige rebuild completo do frontend no servidor — não apenas restart.

---

## 7. Workflow Git / Deploy

### Regra principal

**Nunca editar arquivos diretamente no servidor.** Fluxo obrigatório:

```
editar local → git commit → git push → git pull no servidor → build → restart PM2
```

### Ciclo completo de deploy

```bash
# ── MÁQUINA LOCAL ─────────────────────────────────────────────────────────────
# 1. Desenvolver e testar
pnpm dev                          # turbo sobe api :3001 + web :3000 em paralelo

# 2. Commitar e enviar
git add <arquivos>
git commit -m "feat: descrição"
git push origin master

# ── SERVIDOR ──────────────────────────────────────────────────────────────────
# Acesso via alias SSH (forma curta):
ssh arkeflow "commands"

# Ou forma explícita (fallback):
ssh -i ~/.ssh/kw24_deploy -p 4030 -o StrictHostKeyChecking=no kw24@192.168.3.70 "commands"

# 3. Preparar NVM e puxar código
export NVM_DIR="/home/kw24/.nvm" && source $NVM_DIR/nvm.sh
cd /var/www/arkeflow.com.br
git pull origin master

# 4a. Só API mudou
cd apps/api && pnpm build         # tsc → dist/
pm2 restart arkeflow-api

# 4b. Frontend mudou (ou variável NEXT_PUBLIC_* mudou)
cd apps/web && pnpm build         # next build → .next/standalone/
pm2 restart arkeflow-web

# 4c. Rebuild completo
cd apps/api && pnpm build && cd ../web && pnpm build
pm2 restart all

# 5. Se houver novas migrations
cd /var/www/arkeflow.com.br/apps/api
pnpm migrate:platform             # migrations/platform/ contra arkeflow_platform
pnpm migrate:tenant               # migrations/tenant/ contra cada banco loja_*

# 6. Verificar
pm2 logs --lines 20 --nostream
```

### Quando rebuild cada app

| Tipo de mudança | Ação necessária |
|----------------|----------------|
| Lógica de API apenas | `api build` → restart arkeflow-api |
| UI / páginas frontend | `web build` → restart arkeflow-web |
| Nova migration | migrate → build → restart |
| Variável `NEXT_PUBLIC_*` | atualizar `.env.local` no servidor → rebuild web |
| `packages/shared` mudou | rebuild ambos os apps → restart ambos |
| `ecosystem.config.js` mudou | `pm2 reload ecosystem.config.js --env production` |

### Acesso SSH

```
# Alias configurado em ~/.ssh/config (máquina Windows local):
Host arkeflow
    HostName     192.168.3.70
    Port         4030
    User         kw24
    IdentityFile ~/.ssh/kw24_deploy
    StrictHostKeyChecking no

# Uso:
ssh arkeflow "export NVM_DIR='/home/kw24/.nvm' && source \$NVM_DIR/nvm.sh && cd /var/www/arkeflow.com.br && ..."

# Forma explícita (fallback / CI):
ssh -i ~/.ssh/kw24_deploy -p 4030 -o StrictHostKeyChecking=no kw24@192.168.3.70 "..."
```

**Caminho no servidor:** `/var/www/arkeflow.com.br`

> **Regra:** sempre fazer `export NVM_DIR='/home/kw24/.nvm' && source $NVM_DIR/nvm.sh` antes de qualquer comando node/pnpm/pm2 no servidor.

---

## 8. Credenciais de Teste

| Usuário | Senha | Perfil | Banco |
|---------|-------|--------|-------|
| `admin@arkeflow.com.br` | `Admin@2025` | admin_plataforma | arkeflow_platform |
| `dono@teste.com.br` | `123456` | dono_loja | loja_teste |

---

## 9. Riscos e Pontos de Atenção

1. **`NEXT_PUBLIC_API_URL` compilado no bundle** — sempre rebuild frontend ao alterar.

2. **`packages/shared` é dependência de ambos os apps** — Turborepo lida via `"dependsOn": ["^build"]` ao rodar da raiz; rebuild manual precisa seguir a ordem: shared → api + web.

3. **Migrations de tenant não são automáticas para lojas existentes** — ao criar nova migration, rodar manualmente contra cada banco `loja_*` ativo no servidor.

4. **CORS configurado como `origin: true`** (`apps/api/src/app.ts`) — aceita qualquer origem. Deve ser restrito ao domínio de produção antes do lançamento público.

5. **Sem CI/CD automatizado** — não há `.github/` pipeline. Deploy 100% manual via SSH. Considerar GitHub Actions futuramente para automatizar build + pull no servidor via push na master.

6. **Banco de teste `loja_teste`** existe no servidor com dados de desenvolvimento — não usar em produção real.

7. **Campos fiscais da loja** (`regime_tributario`, `certificado_digital_path`, `certificado_digital_senha`) estão em `lojas` no banco platform. O campo `regime_tributario` é lido pela página de produto para renderizar condicionalmente o card Fiscal.

8. **Colunas depreciadas em `formas_pagamento`** — `desconto_percentual` e `desconto_maximo` ainda existem no banco mas não são usadas pelo código. O modelo de desconto migrou para `configuracoes_loja` (global: `desconto_max_percentual`, `desconto_max_valor`, `promocao_aceita_desconto`, `desconto_restringe_formas`) + flag `aceita_desconto` por forma. Quando `desconto_restringe_formas = true`, formas com `aceita_desconto = false` são ocultadas do CheckoutModal ao aplicar desconto.

9. **`formas_pagamento.config` JSONB** — config canônica do crediário vive aqui desde a mig 042/043. As colunas `crediario_*` em `configuracoes_loja` são backup e não devem ser lidas pelo código novo. O `config` de outras formas (ex: cartão) pode armazenar `max_parcelas` no futuro.

10. **`senha_mestra_hash` nunca retornada pelo GET** — `GET /dados-loja/sistema` retorna apenas `senha_mestra_definida: boolean`. O hash é comparado server-side via bcryptjs. Nunca expor o hash para o frontend.

11. **Saldo de cashback é calculado, não armazenado** — `GET /cashback-regras/saldo/:clienteId` executa `SUM(valor) FILTER (ganhos elegíveis) − SUM(valor) FILTER (resgates)` em `historico_cashback`. O `saldo_cashback` na tabela `clientes` é um campo legado que não é atualizado pelo código novo. Usar sempre o endpoint de saldo.

12. **`atalhos_caixa` JSONB em `configuracoes_loja`** (mig 048) — objeto livre `{ "F2": "sangria", "F3": "suprimento", ... }` que mapeia teclas de atalho a ações do caixa. Validado na API: chaves devem ser letras A–Z ou dígitos 0–9 (atalhos Alt+tecla). Os atalhos padrão F2–F10 são hardcoded no frontend e nunca são removidos pelo JSONB.

---

## 10. Fases do Produto

| Fase | Escopo | Status |
|------|--------|--------|
| 1 — MVP | Produtos, estoque, clientes, PDV, crediário, fluxo de caixa, NF-e | Em construção |
| 2 — Fidelização | Cashback, promoções | Parcialmente implementado |
| 3 — Escala | Parceiros, cobrança automática, white-label | Aguardando fase 1 |

> Regra: nunca avançar para a próxima fase sem validar a anterior em produção.
