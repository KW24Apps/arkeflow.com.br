# Transição de Chat — 11/06/2026

## Estado ao encerrar

- Promoções redesign completo: Ativas/Finalizadas (tabs URL), Encerrar/Duplicar, cross-page `?dup=<id>`, primeira_compra única (API + frontend), date picker on click, tipo bloqueado na edição.
- OceanBackground: novo gradiente escuro (160deg #0d6080→#040f1a), TYPE A rise-full (12–22s) + TYPE B burst (10–18s base × distância), drops no burst, sem ring.
- Cheatsheet: fade para opacity 0.5 quando carrinho tem itens.
- Migrations tenant 051–054 rodadas no servidor.

## Fila imediata (próxima sessão, em ordem)

1. **Padronização de cards** — config/catálogo; alinhamento visual (prazo: 12–13/06)
2. **Estoque** — revisar layout + funções (14–16/06)
3. **Financeiro** — revisar layout + funções (17–20/06)
4. **Relatórios** — revisar layout + funções (21–22/06)
5. **Sacolas + Prova em Casa** — revisar módulos existentes, integrar com PDV (23–27/06)

## Backlog V1 (entra durante o cronograma)

- Permissões de colaborador (menu/submenu + casos isolados)
- Sidebar: item ativo destacado + recolher/expandir
- Date picker reformado (todo o sistema)
- Resumo bloquear sem turno aberto
- Baixa de estoque na venda (confirmar se já funciona)

## Decisões importantes desta sessão

- **Promoções — encerrada vs ativo**: `encerrada = true` é permanente (mig 054); `ativo = false` pode ser reativado. Finalizadas = `encerrada = true`. Ativas = `ativo = true AND encerrada = false`.
- **GET /promocoes** agora retorna `{ promocoes, tem_primeira_compra_ativa }` em vez de array bare — dashboard e finalizadas page já atualizados para desestrutuar.
- **Cross-page Duplicar**: `POST /duplicar` na página Finalizadas → `router.push('/painel/promocoes?dup=<id>')` → ativas lê param no mount, abre form, limpa URL. `esDuplicacao = true` garante cleanup via `PUT /encerrar` se cancelar.
- **OceanBackground**: keyframes TYPE A em globals.css (`ocean-rise-full`); keyframes TYPE B injetados dinamicamente via `<style data-ocean="1">` (limpos no `animationend` e no unmount). `window.matchMedia('prefers-reduced-motion')` reduz count de 9→3.

## Futuro (não agora)

- Modo desktop/launcher (casca opcional, telas compartilhadas, chave `modo_navegacao`, launcher em blocos, dock flutuante, abas no topo — pós nota/maquininha)
- Multi-loja/filial (sessão dedicada)
- Fiscal/NF-e (Focus NFe, aguarda credenciais)
- Impressão de fechamento + sangria
- Relatórios avançados, dashboard gerencial
- Onboarding/tour
