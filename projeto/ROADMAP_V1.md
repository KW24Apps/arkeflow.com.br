
# ROADMAP V1 — META OURO: 08/07/2026 · META FINAL: 08/08/2026

> **Meta ouro (08/07):** objetivo ideal e apertado — lançamento um mês antes do prazo.
> **Meta final (08/08):** prazo limite de lançamento da V1.

## Cronologia de desenvolvimento (registro do fundador)

- **Hoje:** 14/06/2026.
- **Início:** sexta-feira, 05/06/2026, ~21h. Desenvolvimento do zero, com IA como arquiteto.
- **Maratona inicial:** trabalho praticamente contínuo da sexta 21h até sábado 06/06 ~21h —
  cerca de **24 horas reais** de trabalho (com um intervalo à noite para uma janta e pausas).
  Nesse período nasceu o núcleo: multi-tenant, PDV, caixa, produtos com variações, clientes,
  estoque, promoções, cashback, motor de desconto, fechamento de caixa, formas de pagamento.
- **Descanso:** sábado à noite.
- **Retomada:** domingo, 07/06/2026, à tarde (~3–4h de trabalho). Redesign formas de pagamento,
  motor de desconto refeito, flag aceita-desconto por produto, padrão de atributos, tela de venda
  registrada, código de barras universal, modal de dados do cliente, atribuição cliente/vendedor,
  crediário iniciado.
- **Sessão 08/06/2026:** fix hidratação React, crediário Peça A (mig 037–041), documentação.
- **Sessão 09/06/2026:** crediário Peça B (checkout), `formas_pagamento.config` JSONB (mig 042),
  supervisão config (mig 044 + platform 015), redesign Configurações/Sistema.
- **Sessão 10/06/2026:** auth gate supervisão no caixa (mig 045–046), sangria com limite (mig 047),
  atalhos F-key + customizados (mig 048), cashback full (mig 049–050).
- **Sessão 11/06/2026:** promoções status redesign completo (Ativas/Finalizadas/Encerrar/Duplicar,
  mig 051–054), OceanBackground novo gradiente + bubbles rise/burst, primeira_compra única.

> Marco simbólico: em ~24h de trabalho real (mais sessões subsequentes), saiu do zero um sistema de
> gestão multi-tenant com PDV operacional, caixa completo, crediário, supervisão e cashback.
> O que falta para a V1 é integração externa (NF-e, maquininha) e acabamento.

---

## Cronograma

| # | Item | Prazo estimado | Status |
|---|------|----------------|--------|
| 1 | Padronização de cards (config/catálogo) | 12–13/06 | — |
| 2 | Estoque — revisar layout + funções | 14–16/06 | — |
| 3 | Financeiro — revisar layout + funções | 17–20/06 | — |
| 4 | Relatórios — revisar layout + funções | 21–22/06 | — |
| 5 | Sacolas + Prova em Casa (web) | 23–27/06 | fundação mobile ✓ |
| 6 | NF-e / Nota fiscal | 28/06–04/07 | — |
| 7 | Pagamento integrado (maquininha) | 05–09/07 | — |
| 8 | App mobile V1 | 10–18/07 | ADIANTADO — ver abaixo |
| 9 | App desktop (Electron, offline) | 19–26/07 | — |
| 10 | Painel ADM | 27/07–02/08 | — |
| 11 | Site institucional (paralelo, aos poucos) | — | — |
| — | Buffer + ajustes finais | 03–08/08 | — |

---

## Backlog V1 (entra durante o cronograma)

- Permissões de colaborador (menu/submenu + casos isolados)
- Sidebar: item ativo destacado + recolher/expandir
- Date picker reformado (todo o sistema)
- Resumo bloquear sem turno aberto
- Baixa de estoque na venda (confirmar se já funciona)

---

## V2+ (depois do lançamento)

- Multi-loja/filial (sessão de arquitetura dedicada)
- Crediário rede (crédito compartilhado entre filiais)
- WhatsApp integrado + chat interno (filiais)
- Redesenho completo de layout/home
- Relatórios avançados / dashboard gerencial
- Onboarding/tour + mensagens de boas-vindas
- Supervisor na criação de colaborador

---

## A verificar / pendências grandes anotadas

- [ ] **Baixa de estoque na venda** — confirmar se finalizar uma venda desconta o estoque das
      variações vendidas; se não houver, construir. Bloqueia operação real.

---

## Entregas das sessões de 12–14/06/2026

Concluído e deployado:
- [x] **FIX: GET /caixa/vendas — bug de fan-out (pagamentos duplicados com promoção)**
  - JOIN simultâneo de `itens_venda` + `pagamentos_venda` produzia N×M rows antes do GROUP BY
  - Corrigido com subquery correlacionada para pagamentos (mesmo padrão já usado no `/status`)
  - Commit: `6434803`
- [x] **ARKEVest — tela relatorio.tsx** ("Minhas vendas de hoje")
  - FlatList 3 colunas; KPI total + count; OceanGlass Modal de detalhe (cliente, hora, total, itens)
  - Substituiu `Alert.alert` por Modal; `lib/api/vendas.ts` com `vendasApi.minhasHoje()`
  - OTA: grupo `8c9095ea`; commit: `00fba8b`
- [x] **FIX: resumo/page.tsx — viewMode nunca alternava para vendedores sem turno aberto**
  - Removido useEffect gateado em `!carregando && !carregandoHoje && authNome` (race condition com auth store)
  - Adicionado `useEffect(() => { if (!ehOperador && temVendas) setViewMode('vendas') }, [ehOperador, temVendas])` APÓS as declarações derivadas (evita TDZ)
  - Commit: `42ed294`
- [x] **Platform migs 018–020**
  - 018: sessão per-plataforma — colunas `sessao_web/ip/em` + `sessao_mobile/ip/em` em `usuarios` (substitui sessao_atual/ip/em unificada)
  - 019: `ultimo_acesso_web` + `ultimo_acesso_mobile` em `usuarios`
  - 020: `plataforma TEXT` + `motivo TEXT` em `logs_acesso`
- [x] **Tenant migs 055–057**
  - 055: `inatividade_minutos INTEGER NOT NULL DEFAULT 360` em `configuracoes_loja`
  - 056: 8 flags de campos obrigatórios no cadastro em `configuracoes_loja` (`cadastro_exige_*`, `crediario_exige_*`, `prova_exige_*`)
  - 057: `turno_id UUID REFERENCES turnos_caixa(id)` + índice em `vendas` — vincula cada venda ao turno ativo

## Entregas da sessão de 12/06/2026

Concluído e deployado:
- [x] **ARKEVest mobile — fundação completa**
  - EAS Build APK `c39157fd` com expo-updates embutido (preview branch, runtime 1.0.0)
  - Login com JWT → SecureStore; label "E-mail" (sem "ou usuário")
  - 401 interceptor corrigido (não dispara em /auth/login)
  - 409 SESSAO_ATIVA: Alert com IP + horário + opção "Entrar mesmo assim" (forçar)
  - Platform-aware session: mobile não conflita com sessão web/desktop (backend + JWT)
  - Migration platform 017: `sessao_plataforma TEXT` em usuarios
  - Home launcher: Vendas expandível (Animated.spring) + sub-cards Sacolas/Provas/Relatório; Clientes abaixo
  - OTA update check on launch (`Updates.checkForUpdateAsync` em `_layout.tsx`)
  - Play Store: conta criada, taxa paga ($25)
  - OTA update publicado: grupo `34d03efd` (home layout) + `671eb07b` (OTA check)

## Entregas da sessão de 11/06/2026

Concluído e deployado:
- [x] **Promoções — status redesign completo (mig 051–054)**
  - mig 051: fix `aplicacao`/`aplica_todos` em promoções `primeira_compra` existentes
  - mig 052: `itens_venda.promocao_nome` TEXT — desnormalização do nome da promoção
  - mig 053: fix data `categorias_alvo` (`{}` → `[]`)
  - mig 054: `promocoes.encerrada BOOLEAN NOT NULL DEFAULT false`
  - API: `GET /` retorna `{ promocoes, tem_primeira_compra_ativa }`; `POST /` valida unicidade de primeira_compra; `PUT /:id/encerrar`; `POST /:id/duplicar`
  - Frontend: tab Ativas + tab Finalizadas via URL (topbar SecondaryNav); status cards (Em execução / Agendadas / Encerradas); badge "DD/MM · Xd"; botões Encerrar + Duplicar; cross-page Duplicar via `?dup=<id>`; primeira_compra ocultada quando ativa; tipo bloqueado na edição
- [x] **OceanBackground redesign** — novo gradiente (160deg, #0d6080→#040f1a); glow radial; dark bottom fade; TYPE A (rise-full, 12–22s) + TYPE B (burst, 10–18s base × burstY/H); drop animation no burst; sem ring; sem raios
- [x] **FIX: date picker abre no click** — `onClick` com `showPicker()` em ambos os inputs de data em promoções
- [x] **FIX: cheatsheet menos intrusivo com itens no carrinho** — `opacity: 0.5` no container quando `itens.length > 0`; `transition: opacity 0.3s ease`
