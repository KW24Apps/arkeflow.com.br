# ARKEflow — Registro de Ideias e Discussões

> Arquivo para não perder nenhuma ideia discutida durante o desenvolvimento.
> Cada item tem contexto e origem para facilitar retomar no futuro.
> Para o estado atual do sistema, consultar SISTEMA.md.

---

## WhatsApp Integration

**Ideia:** Cada loja conecta seu próprio número via QR code. Sistema envia mensagens automáticas.

**Casos de uso discutidos:**
- Cobranças de crediário (parcelas vencidas/próximas do vencimento)
- Confirmação de venda e recibo
- Disparo de promoções para base de clientes
- Futuro: chatbot para o cliente consultar saldo de cashback, histórico
- Futuro: cada painel (por loja) ter suas próprias funções WhatsApp

**Tecnologia sugerida:** API não-oficial (wwjs, Baileys) — cada loja conecta o próprio device.

**Observação:** Não desenvolver ainda. Requer estudo de viabilidade e termos de uso.

---

## Filial (Multi-Unidade)

**Ideia:** Uma loja com mais de uma unidade física. Mesmo catálogo de produtos, estoque separado por filial.

**Impactos discutidos:**
- Colaborador pode acessar uma ou mais filiais
- PDV mostra estoque disponível em cada filial
- Transferência de estoque entre filiais
- No PDV: buscar produto em outra filial se não tiver na atual
- Relatórios por filial

**Impacto arquitetural:**
- Hoje: 1 banco por loja. Com filial: banco compartilhado ou tabela `filiais` + `estoque_por_filial`
- Requer planejamento antes de implementar — impacta core do sistema

---

## Consignação ("Levar para Experimentar")

**Ideia:** Peça sai do estoque temporariamente. Cliente leva para casa. Prazo definido para devolver ou confirmar compra.

**Fluxo sugerido:**
- Registrar saída em consignação (deduz estoque temporariamente)
- Prazo de retorno configurável
- Painel mostrando peças em consignação com status (aguardando, devolvida, comprada)
- Se confirmada: vira venda normal
- Se devolvida: retorna ao estoque

**Observação:** Muito comum em lojas de roupas de alto valor.

---

## Filtro de Produtos pelas Medidas do Cliente (PDV)

**Ideia:** No PDV, ao vincular um cliente com medidas cadastradas, o vendedor pode ativar um filtro que mostra só produtos/variações que se encaixam naquele cliente.

**Implementação sugerida:**
- Botão "Ver produtos para este cliente" no PDV
- Busca variações cujo `atributos_json` contém medidas compatíveis com `clientes.medidas_json`
- Compatibilidade por faixa (ex: busto 96cm → mostra variações com busto entre 94-98cm)

**Base já construída:** `clientes.medidas_json` e `versoes.atributos_json` já existem.

---

## Medidas por Tipo de Produto

**Ideia:** Cada tipo de produto (camiseta, calça, etc.) tem um template de medidas padrão.
Quando o lojista criar uma variação de camiseta, o sistema já sugere os campos de medida corretos.

**Discussão:**
- Camiseta: Tórax/Busto, Ombro a Ombro, Comprimento Total, Comprimento Manga
- Calça: Cintura/Cós, Quadril, Gancho, Coxa, Comprimento
- Cueca/Calcinha: apenas tamanho
- Saia/Vestido: Busto, Cintura, Quadril, Comprimento Total
- Meia: apenas tamanho

**Observação:** Requer estudo de quais peças precisam de medidas vs só tamanho. Deixado para segunda fase.

---

## Fotos do Produto

**Ideia:** Múltiplas fotos por produto. Sistema adapta automaticamente para o tamanho correto.

**Requisitos discutidos:**
- Sem limite de fotos por produto (no mínimo 1 por variação seria ideal)
- Auto-resize para tamanho padrão definido
- Compressão automática (possivelmente com IA)
- Centralização da imagem no frame

**Tecnologia sugerida:** Sharp.js no backend + armazenamento local ou S3.

**Observação:** Deixado para depois do MVP funcional.

---

## Código Promocional / Cupom

**Ideia:** Campo `codigo` já existe em promoções (ex: VERAO20).

**Casos de uso futuros:**
- Vendedor digita o código no PDV → promoção aplicada automaticamente
- Hashtag: cliente menciona um código nas redes sociais e ganha desconto
- Influenciador tem seu código e lojista rastreia conversões

**Base construída:** campo `codigo UNIQUE` na tabela `promocoes`. Endpoint de busca por código a implementar.

---

## Portal do Cliente

**Ideia:** Cliente acessa um portal próprio para ver histórico de compras, saldo de cashback, perfil.

**Funcionalidades sugeridas:**
- Login com CPF ou email
- Ver compras realizadas
- Ver saldo e histórico de cashback
- Atualizar dados pessoais
- Ver promoções ativas

**Observação:** URL separada ou subdomínio (ex: `cliente.arkeflow.com.br`).

---

## Apps Nativos (Windows / macOS / Android / iOS)

**Ideia:** Hoje o sistema é PWA. No futuro, apps nas lojas oficiais.

**Discussão:**
- PWA já funciona como app no Android/iOS (adicionar à tela inicial)
- Para lojas oficiais: Capacitor.js ou Tauri sobre o código existente
- Placeholders já existem no menu do usuário ("em breve")
- Prioridade baixa — PWA atende bem o caso de uso atual

---

## Relatórios Avançados

**Relatórios discutidos para implementar:**

**Vendas:**
- Por período (dia/semana/mês)
- Por vendedor (quem vendeu mais)
- Por cliente (clientes mais ativos, ticket médio)
- Por forma de pagamento (% pix, dinheiro, crédito)
- Horário de pico

**Produtos:**
- Mais vendidos / menos vendidos
- Giro de estoque (tempo médio para vender)
- Produtos sem movimento

**Financeiro:**
- Entradas × saídas × saldo por período
- Projeção de recebíveis (parcelas de crediário futuras)
- Inadimplência

**Clientes:**
- Novos × recorrentes
- Clientes sem compra há X dias (para ação de reativação)
- Ranking por volume

**Colaboradores:**
- Histórico completo de acessos (entrada/saída, IP)
- Vendas por colaborador

---

## Histórico de Logs no Relatório

**Ideia:** Além do "Online agora" no dashboard, ter um relatório completo de acessos:
- Quem acessou, quando, de qual IP
- Quantidade de acessos por colaborador no período
- Alertas de acesso fora do horário configurado

---

## Modo Offline do PDV

**Ideia:** PDV funciona sem internet. Vendas salvas localmente e sincronizadas ao reconectar.

**Requisitos:**
- IndexedDB no browser para salvar vendas offline
- Service worker para cache dos assets
- Sincronização automática ao reconectar
- Conflito de estoque: se produto esgotou enquanto offline, alertar ao sincronizar

**Observação:** Complexidade alta. Deixado para fase avançada.

---

## Cobrança Automática de Assinatura

**Ideia:** Cada loja paga mensalidade automaticamente. Gateway de pagamento integrado.
Planos com funcionalidades diferentes (básico, completo).

**Observação:** Fase 3 do projeto original.

---

## Portal de Parceiros (Revenda)

**Ideia:** Parceiros que vendem o ARKEflow para lojistas. Cada parceiro vê seus clientes cadastrados.

**Nível de usuário:** `parceiro` já existe no sistema mas ainda sem funcionalidade.

---

## Ideias Menores / Refinamentos

| Ideia | Contexto |
|---|---|
| Seletor de cor com paleta visual no catálogo | Difícil visualizar com lista longa de cores |
| Sidebar retrátil com ícones (mini mode) | Economiza espaço em tablet |
| QR code por variação (gerar automaticamente) | Facilita etiquetagem dos produtos |
| Impressão de etiqueta de produto | Integração com impressora térmica |
| Notificação de estoque mínimo via push/WhatsApp | Alerta proativo para o dono |
| Relatório de cashback expirado | Mostrar quanto foi perdido por vencimento |
| Cliente VIP com benefícios automáticos | Nível de fidelidade automático por gasto acumulado |
| Desconto por aniversário do cliente | Promoção automática no mês de aniversário |
