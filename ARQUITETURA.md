# ARKEflow — Snapshot Arquitetural

> Gerado em 2026-06-06. Referência para desenvolvimento, bug fixes e deploys.

---

## 1. Tech Stack

| Camada | Tecnologia | Versão | Localização |
|--------|-----------|--------|------------|
| Backend API | Fastify + TypeScript | v5 | `apps/api/` |
| Frontend | Next.js App Router + TypeScript | v14.2 | `apps/web/` |
| Banco de dados | PostgreSQL (multi-tenant) | 16 | Local via Docker / VPS nativo |
| Estado (FE) | Zustand | v4.5 | `apps/web/store/` |
| HTTP Client | Axios | v1.7 | `apps/web/lib/api/client.ts` |
| Autenticação | JWT (@fastify/jwt + jose) | — | Cookies, expiração 7d |
| Monorepo | Turborepo + pnpm workspaces | turbo v2 | `turbo.json` |
| Process Manager | PM2 | — | `ecosystem.config.js` |
| Reverse Proxy | Nginx | — | VPS `/var/www/arkeflow.com.br` |
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
│   │   │   ├── modules/            # 13 módulos de domínio
│   │   │   │   ├── auth/
│   │   │   │   ├── produtos/       # inclui campos fiscais (ncm, cfop, csosn, cst...)
│   │   │   │   ├── catalogos/
│   │   │   │   ├── clientes/       # inclui cashback.routes.ts
│   │   │   │   ├── estoque/
│   │   │   │   ├── financeiro/     # inclui formas-pagamento.routes.ts
│   │   │   │   ├── colaboradores/  # inclui documentos + modelos-permissao
│   │   │   │   ├── configuracoes/  # inclui dados-loja.routes.ts (campos fiscais da loja)
│   │   │   │   ├── promocoes/
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
│   │   │   ├── platform/           # 14 arquivos SQL (até 014_lojas_fiscal)
│   │   │   └── tenant/             # 30 arquivos SQL (até 030_produtos_fiscal)
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
│       │   │   ├── promocoes/      # + nova/
│       │   │   ├── fornecedores/   # + novo/ + [id]/
│       │   │   ├── perfil/
│       │   │   └── relatorios/     # produtos, financeiro, clientes
│       │   └── (pdv)/pdv/          # PDV mobile-first
│       │       ├── busca/
│       │       ├── produto/[id]/
│       │       ├── cliente/
│       │       ├── checkout/
│       │       ├── venda/[id]/
│       │       └── historico/
│       ├── components/
│       │   ├── ui/                 # Button, Input, ConfirmModal...
│       │   ├── layout/             # Sidebar, TopBar, PainelNav, SecondaryNav...
│       │   ├── pdv/                # BottomNav, modais de checkout/busca...
│       │   └── painel/             # CatalogoCRUD, ComposicaoForm, ContatosForm, SeletorPermissoes...
│       ├── lib/
│       │   ├── api/                # client.ts (axios) + wrappers por módulo
│       │   └── auth/session.ts
│       ├── store/                  # Zustand: auth, loja, pdv (persist localStorage 'pdv-store'), caixa, sacolas
│       ├── middleware.ts           # Protege /painel /pdv /admin via JWT cookie
│       └── next.config.mjs         # output: 'standalone'
│
├── packages/
│   └── shared/                     # Tipos TypeScript compartilhados
│       └── src/types/usuario.ts
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

**Padrão de módulo no backend:** cada módulo segue `.routes → .controller → .service → .repository` com validação Zod no `.schema`. Módulos simples (sem lógica de negócio complexa) omitem service/controller e encapsulam tudo em `.routes`.

---

## 4. Rotas da API (prefixos registrados em `app.ts`)

| Prefixo | Módulo | Banco |
|---------|--------|-------|
| `/auth` | Login / logout | platform |
| `/produtos` | CRUD de produtos (+ campos fiscais) | tenant |
| `/catalogos` | Catálogos (tamanhos, cores, tipos, composições, medidas) | tenant |
| `/clientes` | Clientes | tenant |
| `/cashback-regras` | Regras de cashback | tenant |
| `/estoque` | Estoque e ajustes | tenant |
| `/financeiro` | Contas a receber / fluxo de caixa | tenant |
| `/formas-pagamento` | Formas de pagamento | tenant |
| `/colaboradores` | Colaboradores + documentos | platform |
| `/modelos-permissao` | Modelos de permissão | platform |
| `/configuracoes-loja` | Configurações gerais da loja | tenant |
| `/dados-loja` | Dados cadastrais + fiscais da loja (regime, certificado) | platform |
| `/promocoes` | Promoções | tenant |
| `/vendas` | Vendas / crediário | tenant |
| `/caixa` | Turnos de caixa | tenant |
| `/sacolas` | Sacolas (carrinho PDV) | tenant |
| `/fornecedores` | Fornecedores | tenant |
| `/health` | Health check | — |

---

## 5. Mapeamento Local ↔ Servidor

```
LOCAL                                        SERVIDOR (192.168.3.70:4030)
─────────────────────────────────────────    ──────────────────────────────────────────
G:\Meu Drive\VSCode\arkeflow.com.br      ↔  /var/www/arkeflow.com.br
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

# ── SERVIDOR (ssh -i ~/.ssh/kw24_deploy -p 4030 kw24@192.168.3.70) ────────────
# 3. Preparar NVM e puxar código
export NVM_DIR="/home/kw24/.nvm" && source $NVM_DIR/nvm.sh
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
cd apps/api
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
Host:    192.168.3.70
Porta:   4030
Usuário: kw24
Chave:   ~/.ssh/kw24_deploy
Caminho: /var/www/arkeflow.com.br
```

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

4. **CORS configurado como `origin: true`** (`apps/api/src/app.ts:29`) — aceita qualquer origem. Deve ser restrito ao domínio de produção antes do lançamento público.

5. **Sem CI/CD automatizado** — não há `.github/` pipeline. Deploy 100% manual via SSH. Considerar GitHub Actions futuramente para automatizar build + pull no servidor via push na master.

6. **Banco de teste `loja_teste`** existe no servidor com dados de desenvolvimento — não usar em produção real.

7. **Campos fiscais da loja** (`regime_tributario`, `certificado_digital_path`, `certificado_digital_senha`) estão em `lojas` no banco platform. O campo `regime_tributario` é lido pela página de produto para renderizar condicionalmente o card Fiscal.

---

## 10. Fases do Produto

| Fase | Escopo | Status |
|------|--------|--------|
| 1 — MVP | Produtos, estoque, clientes, PDV, crediário, fluxo de caixa, NF-e | Em construção |
| 2 — Fidelização | Cashback, promoções | Aguardando fase 1 |
| 3 — Escala | Parceiros, cobrança automática, white-label | Aguardando fase 2 |

> Regra: nunca avançar para a próxima fase sem validar a anterior em produção.
