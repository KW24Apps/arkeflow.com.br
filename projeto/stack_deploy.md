# ARKEflow — Stack, Deploy e Regras do Projeto

> Ficha técnica específica do ARKEflow. Tudo que é particular deste projeto (e que sairia da
> introdução genérica) mora aqui. Ao trocar de projeto, troca-se este arquivo.

---

## Stack

- Monorepo Turborepo + pnpm em `C:\VSCode\arkeflow.com.br`
- Backend: Fastify v5 + TypeScript em `apps/api/` — porta 3001
- Frontend web: Next.js 14 App Router em `apps/web/` — porta 3000
- App mobile: Expo SDK 54 + React Native 0.81.5 em `apps/mobile/` — NÃO deployado no VPS
- Banco: PostgreSQL 16 multi-tenant (`arkeflow_platform` + um banco `loja_XXXXX` por loja)
- Estado FE: Zustand; HTTP: Axios; Auth: JWT em cookie (web) / SecureStore (mobile)
- Process manager: PM2 (`arkeflow-api` :3001, `arkeflow-web` :3000); Nginx como reverse proxy
- Branch: master
- Server path: `/var/www/arkeflow.com.br` (NÃO `/home/kw24`)
- Node.js: v24+ (instalar de nodejs.org se não tiver — necessário para pnpm e EAS CLI localmente)

## SSH — acesso ao servidor

Atalho configurado em `~/.ssh/config` na máquina local (Windows). Usar sempre a forma curta:

    ssh arkeflow "comandos..."

O atalho `arkeflow` resolve host (192.168.3.70), porta (4030), usuário (kw24) e a chave
(`~/.ssh/kw24_deploy`) automaticamente — evita o erro de chave errada que já travou o programador.

Forma completa (fallback, se o atalho não existir no ambiente):

    ssh -o StrictHostKeyChecking=no -i ~/.ssh/kw24_deploy -p 4030 kw24@192.168.3.70

Regras:
- NUNCA usar sshpass ou senha direta — sempre a chave.
- SEMPRE fazer source do NVM antes de qualquer comando node/pnpm/pm2 no servidor:
  `export NVM_DIR="/home/kw24/.nvm" && source $NVM_DIR/nvm.sh`
- **Plano B — deploy manual:** se o deploy do programador falhar por SSH, o usuário entra no servidor
  e roda manualmente: `git pull origin master` → `cd apps/web` (ou api) → `pnpm build` → `pm2 restart`.

## Blocos de deploy padrão

Nas solicitações, referenciar apenas o TIPO; o arquiteto inclui o bloco completo automaticamente.

### web only
    git add . && git commit -m "{MSG}" && git push origin master
    ssh arkeflow "export NVM_DIR='/home/kw24/.nvm' && source \$NVM_DIR/nvm.sh && cd /var/www/arkeflow.com.br && git pull origin master && cd apps/web && pnpm build && pm2 restart arkeflow-web && pm2 logs --lines 20 --nostream"

### api only
    git add . && git commit -m "{MSG}" && git push origin master
    ssh arkeflow "export NVM_DIR='/home/kw24/.nvm' && source \$NVM_DIR/nvm.sh && cd /var/www/arkeflow.com.br && git pull origin master && cd apps/api && pnpm build && pm2 restart arkeflow-api && pm2 logs --lines 20 --nostream"

### api+web
    git add . && git commit -m "{MSG}" && git push origin master
    ssh arkeflow "export NVM_DIR='/home/kw24/.nvm' && source \$NVM_DIR/nvm.sh && cd /var/www/arkeflow.com.br && git pull origin master && cd apps/api && pnpm build && cd ../web && pnpm build && pm2 restart all && pm2 logs --lines 20 --nostream"

### api+migration:tenant+web
    git add . && git commit -m "{MSG}" && git push origin master
    ssh arkeflow "export NVM_DIR='/home/kw24/.nvm' && source \$NVM_DIR/nvm.sh && cd /var/www/arkeflow.com.br && git pull origin master && cd apps/api && pnpm migrate:tenant && pnpm build && cd ../web && pnpm build && pm2 restart all && pm2 logs --lines 20 --nostream"

### api+migration:platform+web
    git add . && git commit -m "{MSG}" && git push origin master
    ssh arkeflow "export NVM_DIR='/home/kw24/.nvm' && source \$NVM_DIR/nvm.sh && cd /var/www/arkeflow.com.br && git pull origin master && cd apps/api && pnpm migrate:platform && pnpm build && cd ../web && pnpm build && pm2 restart all && pm2 logs --lines 20 --nostream"

### docs only
    git add . && git commit -m "{MSG}" && git push origin master

### mobile OTA update (JS only — sem rebuild nativo)
    cd apps/mobile
    eas update --branch preview --message "{MSG}"

### mobile novo APK (mudanças nativas: permissões, plugins, SDK)
    cd apps/mobile
    eas build --platform android --profile preview --non-interactive
    # Aguardar conclusão → link de download no expo.dev
    # Dashboard: expo.dev/accounts/gabriel.acker/projects/arkevest

### mobile dev local (túnel ngrok)
    cd apps/mobile
    pnpm expo start --tunnel
    # Escanear QR no app Expo Go ou APK de desenvolvimento

## Contexto para chat novo do programador (VS Code)

Todo chat novo no programador recebe uma solicitação de contexto ANTES de qualquer tarefa, incluindo:
- Stack e estrutura do projeto (acima)
- Path local: `C:\VSCode\arkeflow.com.br`
- Acesso SSH: `ssh arkeflow "..."` (curta) ou a forma completa como fallback
- NVM obrigatório: `export NVM_DIR="/home/kw24/.nvm" && source $NVM_DIR/nvm.sh`
- Branch: master | Server path: `/var/www/arkeflow.com.br`
- Soft-delete: nunca DELETE, sempre UPDATE SET arquivado = true
- Migrations: sempre ler o diretório, nunca assumir número

## Design system — Ocean Glass (resumo; detalhe em contexto_visual.md)

- Accent electric-cyan `#0ef`; mint (sucesso/troco) `rgba(100,220,160,...)`; danger `rgba(240,100,100,...)`
- Fundos escuros translúcidos (Ocean Glass) no painel; mockups com fundo azulado/claro, nunca escuro
- Padrão de layout: telas full width (sem max-w); edição/criação = header compacto + duas colunas
  (grid-cols-2) + footer fixo; listagem = glass rows + busca client-side + FAB; cards de config
  compactos até 3 por linha; Sidebar e TopBar fixas (só o conteúdo scrolla); tabs sempre visíveis.

## Regras de negócio importantes

- Soft-delete silencioso: NUNCA DELETE — sempre UPDATE SET arquivado = true.
- Colaboradores usam `ativo = false` como soft-delete (não têm coluna `arquivado`).
- Multi-tenant: cada loja tem banco isolado (`loja_XXXXX`); usuários vivem no banco da plataforma.
- Seed de teste (loja_teste): 40 clientes, 5 colaboradores (c1–c5, senha 123456), 50 produtos,
  145 variações, 10 fornecedores.

## Integrações / serviços

- NF-e: provedor Focus NFe (escolhido após a Nuvem Fiscal anunciar encerramento).
- Auto-preenchimento: CNPJ via minhareceita.org; CEP via ViaCEP.
