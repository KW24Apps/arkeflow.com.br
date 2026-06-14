# ARKEflow — Contexto Visual (Design System)

> Atualizado em 2026-06-14. Referência para todos os componentes e padrões visuais do painel.

---

## 1. Design System — Ocean Glass

Todas as telas do painel seguem o padrão **Ocean Glass**: fundos escuros translúcidos com bordas sutis e destaque em cyan elétrico.

### Paleta de cores

| Token | Valor | Uso |
|-------|-------|-----|
| Accent / Electric Cyan | `#0ef` (`rgb(0,239,255)`) | Botão primário, bordas de foco, valores principais |
| Midnight | `rgba(8,10,20,1)` | Fundo base |
| Deep Ocean | `rgba(8,18,30,0.48)` | Cards e modais |
| Ocean Depth | `rgba(255,255,255,0.09)` | Bordas padrão |
| Sea Foam | `rgba(255,255,255,0.85)` | Texto principal |
| Steel | `rgba(255,255,255,0.35)` | Labels e texto secundário |
| Mint Green | `rgba(100,220,160,0.9)` | Sucesso, cashback, troco, confirmações |
| Danger | `rgba(240,100,100,0.75)` | Erros, ações destrutivas, falta no fechamento do caixa |
| Amber / Warning | `rgba(234,179,8,0.8)` | Avisos não bloqueantes (ex: supervisão habilitada sem método de auth) |

### Cards (Ocean Glass)

```css
background: rgba(8,18,30,0.48);
backdrop-filter: blur(8px);
border: 0.5px solid rgba(255,255,255,0.09);
border-radius: 10px;
padding: 16px;
```

### Inputs e Selects

```css
background: rgba(8,18,30,0.5);
border: 0.5px solid rgba(255,255,255,0.12);
border-radius: 8px;
color: rgba(255,255,255,0.8);
min-height: 38–48px;   /* 38px para campos compactos, 44–48px para campos normais */
/* foco: */
border-color: rgba(0,239,255,0.4);
```

### Labels de campo

```css
font-size: 9px;
color: rgba(255,255,255,0.35);
text-transform: uppercase;
letter-spacing: 0.1em;
```

### Botões

| Tipo | Estilo |
|------|--------|
| Primário (salvar/confirmar) | `background: rgba(0,239,255,0.2); border: 0.5px solid rgba(0,239,255,0.4); color: #0ef; font-weight: 500` |
| Primário sólido (ex: CheckoutModal finalizar) | `background: #0ef (electric-cyan); color: #0a0a1a (midnight); font-weight: bold` |
| Perigo | `background: rgba(240,100,100,0.08); border: 0.5px solid rgba(240,100,100,0.25); color: rgba(240,130,130,0.75)` |
| Secundário / Cancelar | `border: 0.5px solid rgba(255,255,255,0.12); color: rgba(255,255,255,0.4)` |

### Hover e foco (padrão obrigatório)

**Todo botão deve ter estado hover visível E estado de foco via teclado visível (`:focus-visible`).** Nunca remover o `outline` sem fornecer um `box-shadow` de foco equivalente. Telas não devem ser entregues com botões sem hover/foco.

| Variante | Base | Hover | Focus-visible |
|----------|------|-------|---------------|
| Primário sólido cyan | `bg: #0ef; color: #0a0a1a` | `bg: rgba(0,239,255,0.85)` | `box-shadow: 0 0 0 2px rgba(0,239,255,0.35)` |
| Primário translúcido | `bg: rgba(0,239,255,0.2); border: rgba(0,239,255,0.4); color: #0ef` | `bg: rgba(0,239,255,0.32); border: rgba(0,239,255,0.6)` | `box-shadow: 0 0 0 2px rgba(0,239,255,0.3)` |
| Perigo (translúcido) | `bg: rgba(240,100,100,0.08); border: rgba(240,100,100,0.25); color: rgba(240,130,130,0.75)` | `bg: rgba(240,100,100,0.16); border: rgba(240,100,100,0.45); color: rgba(240,140,140,0.95)` | `box-shadow: 0 0 0 2px rgba(240,100,100,0.3)` |
| Perigo sólido (destrutivo) | `bg: rgba(240,100,100,0.9); color: #1a0808` | `bg: rgba(240,100,100,1)` | `box-shadow: 0 0 0 2px rgba(240,100,100,0.35)` |
| Secundário / Cancelar / Voltar | `bg: rgba(255,255,255,0.06); border: rgba(255,255,255,0.12); color: rgba(255,255,255,0.7)` | `bg: rgba(255,255,255,0.12); border: rgba(255,255,255,0.30); color: rgba(255,255,255,0.95)` | `box-shadow: 0 0 0 2px rgba(255,255,255,0.25)` |

Todas as transições: `background 120ms, border-color 120ms, box-shadow 120ms`.

### Toggles

```css
/* container */
width: 40px; height: 22px; border-radius: 9999px; border: none;
background: (ativo) rgba(0,212,212,0.7) | (inativo) rgba(255,255,255,0.1);

/* thumb */
width: 16px; height: 16px; border-radius: 50%; background: white;
top: 3px; left: (ativo) 21px | (inativo) 3px;
```

---

## 2. Layout padrão das telas

### Regra geral

Todas as telas: **full width**, sem `max-w` constraint.

### Telas de listagem

- Linhas de vidro (`glass rows`) + busca em tempo real client-side + FAB fixo no canto inferior direito

### Telas de edição/criação

```jsx
<main className="flex-1 overflow-hidden flex flex-col">
  <div className="shrink-0">/* cabeçalho compacto */</div>
  <div className="flex-1 overflow-y-auto p-3">
    <div className="grid grid-cols-2 gap-3">/* campos */</div>
  </div>
  <div className="shrink-0">/* rodapé fixo com botões */</div>
</main>
```

### Telas de configurações (cards em grade)

```jsx
<main className="flex-1 overflow-y-auto p-4 md:p-5 pb-10">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
    {/* cada card é uma seção de configuração independente */}
  </div>
</main>
```

**Página Sistema** (`configuracoes/sistema`) — padrão "square nav + full-width panel":

Layout em duas partes verticais. A página começa sem nenhuma seção aberta (só os cards quadrados visíveis).

1. **Painel full-width** (aparece APENAS quando uma seção está selecionada):
   - `background: rgba(8,18,30,0.55); backdropFilter: blur(12px); border: 0.5px solid rgba(255,255,255,0.09); borderRadius: 12px`
   - Header do painel: ícone + label uppercase da seção (ex: "LOGO DA LOJA") à esquerda; indicador "Salvo" mint-green à direita quando salvo
   - Conteúdo da seção renderizado abaixo do header

2. **Grid de cards quadrados** (sempre visível, abaixo do painel):
   - `gridTemplateColumns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px`
   - Cada card: `padding: 20px 12px; minHeight: 110px; borderRadius: 10px`
   - Estado normal: `background: rgba(8,18,30,0.48); border: 0.5px solid rgba(255,255,255,0.09); ícone/texto rgba(255,255,255,0.35/0.55)`
   - Estado selecionado (cyan): `background: rgba(0,239,255,0.08); border: 0.5px solid rgba(0,239,255,0.5); ícone/texto #0ef`
   - Clicar no card selecionado fecha o painel (toggle: `setSecao(secao === key ? null : key)`)

3. **Seções disponíveis** (tipo `Secao = 'logo' | 'estoque' | 'desconto' | 'supervisao' | 'sangria' | 'atalhos' | 'cashback' | null`):
   - **Logo** (`ImageIcon`) — preview 52px, botão trocar/remover
   - **Estoque** (`Package`) — toggle de controle global com aviso amber quando desativado
   - **Desconto** (`Tag`) — layout 2 colunas: ESQUERDA = limites (% e R$); DIREITA = regras (promoção aceita desconto, restringe formas, chips de formas)
   - **Supervisão** (`ShieldCheck`) — ver seção abaixo
   - **Sangria** (`ArrowDownCircle`) — toggle habilitar limite, input de valor limite (CurrencyInput), input fundo de troco, segmented control Avisar/Obrigar
   - **Atalhos** (`Keyboard`) — grid de ações com captura de tecla alt+letra/número; overlay fullscreen de captura; botão limpar por ação
   - **Cashback** (`Gift`) — toggle-mãe habilitar, 3 toggles de regras (promoção, desconto, crediário), segmented control Livre/Percentual, input de limite %, inputs de carência (dias) e validade (meses)

**Página Formas de Pagamento** (`configuracoes/formas-pagamento`):
- Painel de edição sem `maxWidth` — ocupa full width do container (sem `max-w` constraint)

**Seção Supervisão** (painel expandido, layout flex-col gap-5):
- **a) Toggle-mãe** (sempre ativo): "Supervisão habilitada" — liga/desliga todo o módulo
- **b) Sub-controles** (dimmed `opacity: 0.38; pointerEvents: none` quando supervisão off):
  - ESQUERDA: toggle "Usar senha mestra" + input de senha (tipo password, salvo via bcrypt no servidor, nunca retornado no GET — apenas `senha_mestra_definida: boolean` no GET)
  - DIREITA: chips de supervisores (colaboradores com `is_supervisor = true`) + botão "Gerenciar supervisores" → abre modal; toggles de ações protegidas (fechar com falta, fechar com sobra, cancelar item no caixa)
- **c) Aviso amber** quando supervisão habilitada mas nenhum método de autenticação está configurado (sem supervisores E sem senha mestra)

**Modal "Gerenciar supervisores"** (abre da seção Supervisão):
- Lista todos os colaboradores ativos (exceto dono) com toggle de supervisor por linha
- Salva via `PUT /colaboradores/:id/supervisor`
- Padrão Ocean Glass: `background: rgba(8,18,30,0.95); max-w-md; max-h-[80vh] overflow-y-auto`

**Colaborador** (`colaboradores/[id]`) — bloco Acesso:
- Toggle "Acesso ativo" (já existia)
- Toggle "É supervisor" (novo, abaixo) — label "Pode autorizar ações sensíveis (caixa)"; cor `rgba(0,212,212,0.7)` quando ativo

### PDV / Caixa (split panel)

```
┌─────────────────────┬──────────────┐
│  Lista de itens     │ Sidebar 240px│
│  (flex-1, scroll)   │ (4 módulos)  │
│                     │              │
│  ─── input scan ─── │              │
└─────────────────────┴──────────────┘
```

---

## 3. Componentes Reutilizáveis (`components/ui/`)

### `CurrencyInput`

**Localização:** `apps/web/components/ui/CurrencyInput.tsx`

Entrada de valor monetário com digitação **right-to-left** (centavos). Cada dígito digitado desloca os anteriores uma casa para a esquerda; Backspace remove o último centavo. Não aceita digitação livre — apenas eventos de teclado.

```tsx
<CurrencyInput
  value={cents}           // número inteiro de centavos
  onChange={setCents}     // (cents: number) => void
  onBlur={handleSave}     // opcional — salva ao perder foco
  onEnter={handleNext}    // opcional — Enter avança o foco
  autoFocus
  placeholder="R$ 0,00"
  className="..."
  style={...}
/>
```

Usado em: saldo inicial de abertura, valor de sangria/suprimento, saldo de fechamento do caixa, teto de desconto em R$ nas configurações do sistema.

### `GlassSelect`

**Localização:** `apps/web/components/ui/GlassSelect.tsx`

Select estilizado no padrão Ocean Glass com `label`, `error` e `disabled`. Chevron gira ao abrir; fecha ao clicar fora.

```tsx
<GlassSelect label="Tipo" value={...} onChange={...}>
  <option value="a">Opção A</option>
</GlassSelect>
```

### `Input`

**Localização:** `apps/web/components/ui/Input.tsx`

Input com label, estado de erro e foco cyan. Estilo: fundo midnight, borda ocean-depth, foco electric-cyan.

### `Button`

**Localização:** `apps/web/components/ui/Button.tsx`

Variantes `primary` e `ghost` com estado de loading (spinner + "Aguarde..."). Full-width, rounded-xl.

### `ConfirmModal`

**Localização:** `apps/web/components/ui/ConfirmModal.tsx`

Modal de confirmação destrutiva (360px max-w). Botão de confirmação aceita variante `danger` (vermelho) ou `cyan`. Fecha no backdrop.

---

## 4. Componentes de Layout (`components/layout/`)

### `TopBar`

Barra superior com sub-navegação (`SecondaryNav`) e dropdown do usuário.

- Altura: 48px (`h-12`)
- Fundo: `midnight/50` + borda inferior `0.5px rgba(255,255,255,0.07)`
- Avatar: `rgba(0,212,212,0.15)` com inicial do usuário
- Dropdown: fundo **completamente opaco** `rgb(8,18,30)` para não vazar conteúdo por trás

```css
/* dropdown — opaco mesmo que os cards */
background: rgb(8,18,30);
border: 0.5px solid rgba(255,255,255,0.12);
border-radius: 10px;
```

### `Sidebar`

Sidebar responsiva: fixa na esquerda (`w-44`) em desktop, overlay deslizante em mobile.

- Logo da loja: slot de 56px com dashed border, exibe imagem ou inicia upload
- Ícones: `lucide-react`, mapeamento dinâmico por `href`
- Estado ativo: `bg-cyan-500/10` + texto electric-cyan
- Dividers: linhas horizontais com labels uppercase
- Footer: "ARKEflow Gestão"

### `PainelSidebar`

Wrapper de `Sidebar` que filtra itens de navegação por permissão do usuário (`temPermissao()`). Consome `SECTIONS` de `painel-nav-data`.

### `OceanBackground`

Fundo animado com dois tipos de bolhas e gradiente profundo. Sem raios, sem ring.

**Gradiente:** `linear-gradient(160deg, #0d6080 0%, #0a4d6e 20%, #093d58 45%, #072840 70%, #040f1a 100%)`

**Overlays:**
- Glow radial no canto superior esquerdo: `radial-gradient(ellipse 60% 50% at 35% 20%, rgba(80,190,240,0.15) 0%, transparent 70%)`
- Dark fade no rodapé: `linear-gradient(0deg, rgba(2,8,20,0.65) 0%, transparent 100%)` — height 28%

**Bolhas — TYPE A (rise-full):**
- Rise de 88–100% da altura da tela; duração 12–22s; animação `ocean-rise-full` em globals.css
- Trajetória senoidal (translateX ±7/6px em 30%/60%), fade-out nos últimos 12%
- 9 bolhas em paralelo (3 em `prefers-reduced-motion`)

**Bolhas — TYPE B (burst):**
- Sobe até burstY = 40–90% da tela; duração = `rnd(10,18) × (burstY/H)`
- Keyframe injetado dinamicamente via `<style data-ocean="1">` por bolha (limpado no `animationend`)
- Ao chegar no burst point: gera 8–12 drops (`.ocean-drop`) em direções aleatórias
- 9 bolhas em paralelo (3 em `prefers-reduced-motion`)

**CSS base das bolhas (`.ocean-bb` em globals.css):**
```css
position: absolute; bottom: -80px; border-radius: 50%;
background: radial-gradient(circle at 32% 26%, rgba(255,255,255,0.95) 0%, ...);
border: 1px solid rgba(185,238,255,0.28);
```

**Animação `ocean-rise-full` (globals.css):**
```css
0%   { transform:translateY(0) translateX(0) scale(0.6); opacity:0; }
6%   { opacity:var(--op); }
30%  { transform:translateY(calc(-0.35 * var(--rise))) translateX(7px) scale(0.85); }
60%  { transform:translateY(calc(-0.70 * var(--rise))) translateX(-6px) scale(0.95); }
88%  { opacity:var(--op); }
100% { transform:translateY(calc(-1 * var(--rise))) translateX(0) scale(1); opacity:0; }
```

### `SecondaryNav`

Tabs horizontais com sublinhado electric-cyan no ativo.

- Ativo: `text-electric-cyan border-b-2`
- Inativo: `text-white/40`
- Hover: `text-white/70`
- Min-height: 40px

### `KPICard`

Card de KPI com borda esquerda colorida (4px). Cores: cyan, green, yellow, red. Label uppercase steel, valor sea-foam 2xl bold.

---

## 5. Componentes PDV (`components/pdv/`)

### `CheckoutModal`

**Localização:** `apps/web/components/pdv/CheckoutModal.tsx`

Modal de finalização de venda (max-w-md). Estrutura interna em três seções:

**Header — Atribuição**
- Sub-label `9px uppercase` "Atribuição"
- Chips pill `border-radius: 20px` para cliente (ícone User) e vendedor (ícone Briefcase)
- Estado vazio: pill dashed cyan "Adicionar cliente / Adicionar vendedor"
- Estado preenchido: pill sólido com nome + botão × para remover (vendedor removível apenas se não veio de sacola)
- Clique no nome do cliente abre `ClienteDadosModal`

**Header — Total da venda**
- Sub-label `9px uppercase` "Total da venda"
- Sem desconto elegível: valor único em `text-electric-cyan font-black text-3xl`
- Com desconto elegível: dois cards `grid grid-cols-2 gap-2`:
  - Card "Sem desconto": borda/texto cyan quando selecionado
  - Card "Com desconto": borda/texto mint-green quando selecionado; exibe `−R$ X` abaixo do valor
  - Selecionar um card apaga os pagamentos registrados e refiltra formas permitidas

**Corpo — Forma de pagamento**
- Sub-label `9px uppercase` "Forma de pagamento"
- Select `min-h-[48px]` com formas ativas (filtradas por `aceita_desconto` quando `desconto_restringe_formas = true`)
- Input de valor com auto-fill (botão "≈ Preencher restante")
- Crediário: select de parcelas
- Dinheiro: exibe troco em tempo real em mint-green
- Pagamentos parciais já registrados: lista com ✓ verde + linha "Restante: R$ X"
- Enter confirma e avança para o próximo método ou finaliza

**Regras gerais:**
- Não-dinheiro não pode exceder o saldo restante
- Reset completo ao chamar `onSuccess` (evita freeze pós-venda)
- Motor de desconto: `baseElegivel` exclui itens com `aceita_desconto = false` e, se `!promoAceita`, itens com `desconto_item > 0`; teto = `min(baseElegivel × pct%, R$ teto)`

### `ClienteDadosModal`

**Localização:** `apps/web/components/pdv/ClienteDadosModal.tsx`

Modal de edição inline de dados do cliente dentro do PDV. Ativo durante uma venda — não navega, preserva o carrinho. Props: `open`, `clienteId`, `onClose`, `onSaved`.

- Overlay: `position: fixed; inset: 0; zIndex: 200` — acima do TopBar (zIndex 100)
- Conteúdo: `max-w-500px; max-height: 90vh; overflow-y: auto` — scroll interno
- Campos: Nome *, CPF, Telefone (1 por vez), Email (1 por vez), CEP (com botão Buscar → ViaCEP), Logradouro, Número, Complemento, Bairro, Cidade, UF
- Formatação inline: CPF (`000.000.000-00`), Telefone (`(00) 00000-0000`), CEP (`00000-000`)
- ViaCEP: dispara ao sair do campo CEP (`onBlur`) ou ao clicar Buscar
- Salvar: envia somente escalares (`telefone = phones[0]`, `email = emails[0]`); arrays são dropados pelo repositório
- Fechar: Esc ou botão × (sem salvar)

### `CustomerSearchModal`

Modal grande (max-w-2xl) de busca de cliente. Exibe múltiplos telefones/e-mails, saldo de cashback, total de compras. Fecha no backdrop. Props: `open`, `onClose`, `onSelect`, `autoAberto`.

### `SalespersonSearchModal`

Modal de busca de vendedor com filtro por tipo (todos / ativos). Mesmo padrão visual do `CustomerSearchModal`.

### `AdvancedSearchModal`

Modal de busca avançada de produtos no PDV.

### `SacolasModal`

Modal de gerenciamento de sacolas (carrinhos compartilhados).

---

## 6. Padrões de Modal

### Estrutura base

```tsx
<div className="fixed inset-0 bg-midnight/90 z-50 flex items-center justify-center p-4"
     onClick={onClose}>
  <div className="bg-deep-ocean border border-ocean-depth rounded-2xl w-full max-w-md"
       onClick={e => e.stopPropagation()}>
    {/* conteúdo */}
  </div>
</div>
```

Todos os modais fecham ao clicar no backdrop (`onClick={onClose}` no overlay + `stopPropagation` no conteúdo).

### Modal de seleção de variação (PDV)

Grid `auto-fill minmax(100px, 1fr)`. Cards com estado `focado` (borda cyan) e `esgotado` (opacidade 35%, cursor not-allowed). Navegação por teclado: ← → para navegar, Enter para adicionar, Esc para fechar.

### Modal de boas-vindas (abertura de caixa)

Auto-dismiss após 10 segundos. Clique no backdrop fecha imediatamente. Mensagem em duas partes: saudação aleatória (PARTE1) + frase motivacional aleatória (PARTE2). Exibe hora de abertura e saldo inicial.

---

## 7. Atributos de variação — exibição

Usar **sempre** as funções de `apps/web/lib/utils/atributos.ts` (ver CONTEXTO_ATRIBUTOS.md para a especificação completa).

Padrão da linha do carrinho (aplicado em `caixa/page.tsx` e `resumo/page.tsx`):

```tsx
const inline   = atributosInline(item.atributos)    // string[] — só valores de Tamanho e Cor
const completo = atributosCompletos(item.atributos)  // { principais, medidas }
const temMais  = completo.medidas.length > 0

// Chips inline (valores sem labels)
{inline.length === 0
  ? <span style={CHIP_DIM}>Versão única</span>
  : inline.map((v, i) => <span key={i} style={CHIP}>{v}</span>)
}

// Chip "+" com tooltip ao hover quando há medidas
{temMais && <TooltipMais completo={completo} />}

// Badge "desconto" (mint-green) quando item é elegível para desconto de caixa
{itemElegivel && <span style={CHIP_DESCONTO}>desconto</span>}
```

Estilo base do chip:
```css
fontSize: 10px; background: rgba(255,255,255,0.06); border: 0.5px solid rgba(255,255,255,0.1);
borderRadius: 6px; padding: 2px 7px; color: rgba(255,255,255,0.65);
```

Badge "desconto": `background: rgba(100,220,160,0.12); border: rgba(100,220,160,0.3); color: rgba(100,220,160,0.9);`

---

## 8. Padrão de chips clicáveis (toggle list → chips)

Usado na seção "Formas que aceitam desconto" da página `configuracoes/sistema`. Substitui a lista de toggles por chips horizontais flex-wrap:

```tsx
<div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
  {formas.map(f => {
    const aceita = f.aceita_desconto !== false
    return (
      <button
        key={f.id}
        type="button"
        onClick={() => handleToggle(f)}
        style={{
          minHeight: '38px',
          padding: '8px 15px',
          borderRadius: '9px',
          fontSize: '13px',
          cursor: 'pointer',
          border: aceita ? '0.5px solid rgba(0,239,255,0.4)' : '0.5px solid rgba(255,255,255,0.1)',
          background: aceita ? 'rgba(0,239,255,0.1)' : 'rgba(255,255,255,0.03)',
          color: aceita ? '#0ef' : 'rgba(255,255,255,0.35)',
        }}
      >
        {f.nome}{aceita ? ' ✓' : ''}
      </button>
    )
  })}
</div>
```

Padrão aplicável a qualquer lista de flags binárias onde cada item é independente. Helper line abaixo do título de seção: `fontSize: 11px; color: rgba(255,255,255,0.35); marginTop: -6px`.

---

## 9. Sidebar do caixa — 4 módulos fixos

A sidebar do caixa (`caixa/page.tsx`) tem largura fixa 240px e 4 módulos empilhados verticalmente:

| Módulo | Conteúdo |
|--------|----------|
| 1 — Itens | Lista do carrinho com atributos inline + qty + preço; input de scan no rodapé |
| 2 — Atribuição da venda | Slots de cliente (→ abre `CustomerSearchModal` ou `ClienteDadosModal` se já selecionado) e vendedor (→ `SalespersonSearchModal`) como pill-buttons com ícone + nome + × |
| 3 — Gestão do caixa | Links: Sacolas pendentes, Provas em Casa, Sangria, Suprimento, Fechar caixa (bloqueado se há itens) |
| 4 — Finalizar venda | Botão cyan "Fechar venda →" ou botão desabilitado "Sacola vazia" |

O cliente selecionado, se já tiver sido escolhido, ao ser clicado novamente abre `ClienteDadosModal` (edição in-place) em vez de `CustomerSearchModal`.

---

## 10. Feedbacks visuais de salvamento

Padrão para indicar sucesso após salvar via `onBlur` ou toggle:

```tsx
const [saved, setSaved] = useState(false)

async function handleSave() {
  await api.put(...)
  setSaved(true)
  setTimeout(() => setSaved(false), 2000)
}

// JSX
{saved && (
  <span style={{ fontSize: '10px', color: 'rgba(100,220,160,0.8)' }}>Salvo</span>
)}
```

Usado no card de Estoque e no card de Desconto da página de configurações do sistema.

---

## 11. Modal de Auth Gate (Supervisão no caixa)

**Localização:** `apps/web/components/pdv/` (AuthGateModal ou semelhante)

Modal de autenticação que aparece ao executar ação protegida (cancelar item, fechar com divergência).

- Overlay: `position: fixed; inset: 0; background: rgba(0,0,0,0.8); zIndex: 200`
- Conteúdo: Ocean Glass card `max-w-sm`; não fecha no backdrop (não-cancelável)
- Estrutura:
  - Sub-label da ação (ex: "Cancelar item")
  - Seletor de método: segmented tabs "Supervisor" / "Senha mestra" (exibidos conforme disponibilidade)
  - Select de supervisor (quando método = supervisor)
  - Input de senha (password, placeholder "Senha")
  - Input de justificativa (quando ação = fechar com divergência; obrigatório)
  - Botão "Autorizar" (cyan sólido) + botão "Cancelar" (secundário, ausente em modo obrigar)
- Modo obrigar (sangria): botão cancelar omitido; Esc bloqueado; backdrop bloqueado

---

## 12. Cheatsheet de atalhos F-key (watermark no caixa)

**Localização:** `apps/web/app/(painel)/painel/caixa/page.tsx` (inline na página do caixa)

Watermark cinza translúcida no canto inferior direito da tela do caixa listando os atalhos F2–F10 e os atalhos Alt+tecla customizados configurados.

```css
position: absolute;
right: 16px; bottom: 62px;
zIndex: -1; pointer-events: none;
font-size: 12px;
color: rgba(255,255,255,0.20); /* quando carrinho vazio */
/* quando itens.length > 0: */
opacity: 0.5; transition: opacity 0.3s ease; /* container — efetivo ~0.10 */
```

Lista de atalhos: cada linha `Fx → Ação` ou `Alt+X → Ação`.

**Comportamento:** container recebe `opacity: itens.length > 0 ? 0.5 : 1` com `transition: 'opacity 0.3s ease'`. Com `color` base `rgba(255,255,255,0.20)`, a opacidade efetiva cai de 0.20 para ~0.10 quando o carrinho tem produtos.

---

## 13. Overlay de captura de tecla (Atalhos customizados)

**Localização:** `apps/web/app/(painel)/painel/configuracoes/sistema/page.tsx` (painel de Atalhos)

Overlay fullscreen que intercepta `keydown` ao editar um atalho customizado.

- `position: fixed; inset: 0; zIndex: 300; background: rgba(0,0,0,0.85)`
- Mensagem central: "Pressione Alt + tecla para definir o atalho" (texto branco, `text-lg`)
- Sub-mensagem: "Esc para cancelar"
- Escuta `keydown`: captura letra A–Z ou dígito 0–9 com `event.altKey`; conflito bloqueado silenciosamente (tecla já usada por outra ação = ignora)

---

## 14. Toggle de Cashback no CheckoutModal

**Localização:** dentro do `CheckoutModal.tsx`, na coluna esquerda antes do resumo

Seção de cashback no CheckoutModal quando o módulo está habilitado e o cliente tem saldo disponível:

```tsx
{cashbackElegivel && (
  <div style={{ /* Ocean Glass card menor, cyan quando ativo */ }}>
    <span>Cashback disponível: R$ X,XX</span>
    <button onClick={() => setUsarCashback(!usarCashback)}>
      {usarCashback ? 'Remover' : 'Usar cashback'}
    </button>
    {usarCashback && <span style={{ color: 'rgba(100,220,160,0.8)' }}>− R$ cashbackAplicado</span>}
  </div>
)}
```

- Quando `usarCashback = true`: totalFinal = totalEfetivo − cashbackAplicado; todos os cálculos de pagamento usam `totalFinal`
- Inelegível automático se: sem cliente, saldo zero, promoção ativa (e `!aceita_promocao`), desconto ativo (e `!aceita_desconto`), crediário (e `!aceita_crediario`)
- `handleComDesconto` desativa cashback automaticamente se `!cashbackAceitaDesconto`
- `handleFormaChange` desativa cashback ao mudar para crediário se `!cashbackAceitaCrediario`

---

## 15. Promoções — Cards e layout

**Localização:** `apps/web/app/(painel)/painel/promocoes/page.tsx` (Ativas) e `finalizadas/page.tsx`

### Tabs URL-based (topbar)

Ativas: `/painel/promocoes` · Finalizadas: `/painel/promocoes/finalizadas` — renderizadas via `SecondaryNav` a partir de `painel-nav-data.ts` sub-items.

### Cards de promoção ativa (`PromoCard`)

Grid `repeat(auto-fill, minmax(180px, 220px))`. Cada card:

```css
background: rgba(8,18,30,0.48);
backdrop-filter: blur(8px);
border: 0.5px solid rgba(255,255,255,0.06); /* ou 0.12 selecionado */
border-radius: 10px;
padding: 14px;
```

**Status badge** (canto superior direito):
- `ativa` / "Em execução": `rgba(0,239,255,0.12)` + borda cyan `rgba(0,239,255,0.3)` + texto `#0ef`
- `agendada`: `rgba(234,179,8,0.1)` + borda amber + texto amber
- `encerrada`: `rgba(255,255,255,0.05)` + borda fraca + texto rgba(255,255,255,0.3)

**Badge de data** (quando `inicio` ou `fim` definidos):
```
DD/MM · Xd
```
- Data: `new Date(iso).getUTCDate()` + `getUTCMonth()` (UTC para evitar off-by-one)
- Dias restantes: `Math.ceil((new Date(fim).getTime() - Date.now()) / 86400000)`

**Ícone de tipo** por `tipo`:
- `desconto_percentual` / `desconto_fixo` → `Tag`
- `compre_ganhe` → `Gift`
- `segunda_peca` → `ShoppingBag`
- `primeira_compra` → `Star`

**Botões de ação:**
- Editar: ícone `Pencil` (abre form inline)
- Encerrar: ícone `Square` (call `PUT /encerrar`, confirm modal)
- Duplicar (apenas encerradas): `POST /duplicar` → `router.push('/painel/promocoes?dup=<id>')`

### Form inline de nova/editar promoção

- Tipo: pill tabs filtrados (oculta `primeira_compra` quando `temPrimeiraCompra && tipo !== 'primeira_compra'`)
- Datas: inputs `type="date"` com `onClick` → `showPicker()` para abrir calendário no click inteiro
- Tipo bloqueado na edição: `opacity: 0.5; pointerEvents: none` com note "O tipo não pode ser alterado após a criação."
- `esDuplicacao = true`: label "Duplicar promoção"; cancel chama `PUT /encerrar` no rascunho pré-salvo

### Cards de promoção encerrada (`EncerradaCard`)

Mesmo grid. Card com `opacity: 0.65`. Sem botão Editar/Encerrar — apenas botão **Duplicar**.
